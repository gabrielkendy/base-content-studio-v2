import { createServiceClient } from '@/lib/supabase/server'
import { dispararNotificacao, getInternalAppUrl, getPublicBaseUrl } from '@/lib/approval-notifications'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatch'
import { generateApprovalToken } from '@/lib/tokens'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api-auth'

// POST: Enviar para aprovação interna
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await request.json()
    const {
      conteudo_id,
      action, // 'submit' | 'approve' | 'reject'
      reviewer_id,
      reviewer_name,
      comment,
    } = body

    if (!conteudo_id || !action) {
      return NextResponse.json(
        { error: 'conteudo_id e action são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Fetch conteudo and verify it belongs to user's org
    const { data: conteudo, error: fetchError } = await supabase
      .from('conteudos')
      .select('*')
      .eq('id', conteudo_id)
      .single()

    if (fetchError || !conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', conteudo.empresa_id)
      .eq('org_id', orgId)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const previousStatus = conteudo.status
    let newStatus = previousStatus
    let approvalStatus: string = 'pending'

    switch (action) {
      case 'submit':
        approvalStatus = 'pending'
        break

      case 'approve':
        if (!reviewer_id) {
          return NextResponse.json(
            { error: 'reviewer_id é obrigatório para aprovar' },
            { status: 400 }
          )
        }
        approvalStatus = 'approved'
        newStatus = 'aprovacao'
        break

      case 'reject':
        if (!reviewer_id || !comment) {
          return NextResponse.json(
            { error: 'reviewer_id e comment são obrigatórios para rejeitar' },
            { status: 400 }
          )
        }
        approvalStatus = 'adjustment'
        newStatus = 'producao'
        break

      default:
        return NextResponse.json({ error: 'action inválida' }, { status: 400 })
    }

    const { error: approvalError } = await supabase
      .from('approvals')
      .insert({
        org_id: orgId,
        conteudo_id,
        type: 'internal',
        status: approvalStatus,
        reviewer_id: reviewer_id || null,
        reviewer_name: reviewer_name || null,
        comment: comment || null,
        previous_status: previousStatus,
        new_status: action === 'submit' ? null : newStatus,
        reviewed_at: action !== 'submit' ? new Date().toISOString() : null,
      })

    if (approvalError) {
      console.error('Approval insert error:', approvalError)
      return NextResponse.json({ error: approvalError.message }, { status: 500 })
    }

    if (action !== 'submit' && newStatus !== previousStatus) {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (action === 'approve') {
        updateData.internal_approved = true
        updateData.internal_approved_by = reviewer_id
        updateData.internal_approved_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('conteudos')
        .update(updateData)
        .eq('id', conteudo_id)

      if (updateError) {
        console.error('Content update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    // WhatsApp notifications via n8n
    try {
      const { data: empresaInfo } = await supabase
        .from('clientes')
        .select('id, nome, slug')
        .eq('id', conteudo.empresa_id)
        .single()

      if (empresaInfo) {
        const workflowLink = `${getInternalAppUrl()}/workflow?content=${conteudo_id}`
        const empresaData = { id: empresaInfo.id, nome: empresaInfo.nome, slug: empresaInfo.slug }

        if (action === 'submit') {
          const { data: aprovadores } = await supabase
            .from('aprovadores')
            .select('nome, whatsapp, email, tipo, pode_editar_legenda')
            .eq('empresa_id', conteudo.empresa_id)
            .eq('tipo', 'interno')
            .eq('ativo', true)
            .eq('recebe_notificacao', true)

          if (aprovadores && aprovadores.length > 0) {
            await dispararNotificacao({
              tipo: 'novo_conteudo',
              conteudo: {
                id: conteudo_id,
                titulo: conteudo.titulo || 'Sem título',
                legenda: conteudo.legenda?.substring(0, 200) || '',
                status: 'producao',
                link_aprovacao: workflowLink,
              },
              empresa: empresaData,
              aprovadores: aprovadores.map((a: { nome: string; whatsapp: string; email: string | null; tipo: string; pode_editar_legenda: boolean }) => ({
                nome: a.nome, whatsapp: a.whatsapp, email: a.email,
                tipo: a.tipo as 'interno' | 'cliente' | 'designer',
                pode_editar_legenda: a.pode_editar_legenda,
              })),
              nivel: 1,
              timestamp: new Date().toISOString(),
            })
          }
        } else if (action === 'approve') {
          const token = generateApprovalToken()

          await supabase.from('aprovacoes_links').insert({
            conteudo_id,
            empresa_id: conteudo.empresa_id,
            token,
            status: 'pendente',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })

          const clientLink = `${getPublicBaseUrl()}/aprovacao?token=${token}`

          const { data: aprovadores } = await supabase
            .from('aprovadores')
            .select('nome, whatsapp, email, tipo, pode_editar_legenda')
            .eq('empresa_id', conteudo.empresa_id)
            .eq('tipo', 'cliente')
            .eq('ativo', true)
            .eq('recebe_notificacao', true)

          if (aprovadores && aprovadores.length > 0) {
            await dispararNotificacao({
              tipo: 'nivel_aprovado',
              conteudo: {
                id: conteudo_id,
                titulo: conteudo.titulo || 'Sem título',
                legenda: conteudo.legenda?.substring(0, 200) || '',
                status: 'aprovacao',
                link_aprovacao: clientLink,
              },
              empresa: empresaData,
              aprovadores: aprovadores.map((a: { nome: string; whatsapp: string; email: string | null; tipo: string; pode_editar_legenda: boolean }) => ({
                nome: a.nome, whatsapp: a.whatsapp, email: a.email,
                tipo: a.tipo as 'interno' | 'cliente' | 'designer',
                pode_editar_legenda: a.pode_editar_legenda,
              })),
              nivel: 1,
              timestamp: new Date().toISOString(),
            })
          }
        } else if (action === 'reject') {
          const { data: aprovadores } = await supabase
            .from('aprovadores')
            .select('nome, whatsapp, email, tipo, pode_editar_legenda')
            .eq('empresa_id', conteudo.empresa_id)
            .eq('tipo', 'designer')
            .eq('ativo', true)
            .eq('recebe_notificacao', true)

          if (aprovadores && aprovadores.length > 0) {
            await dispararNotificacao({
              tipo: 'ajuste_solicitado',
              conteudo: {
                id: conteudo_id,
                titulo: conteudo.titulo || 'Sem título',
                legenda: comment || '',
                status: 'producao',
                link_aprovacao: workflowLink,
              },
              empresa: empresaData,
              aprovadores: aprovadores.map((a: { nome: string; whatsapp: string; email: string | null; tipo: string; pode_editar_legenda: boolean }) => ({
                nome: a.nome, whatsapp: a.whatsapp, email: a.email,
                tipo: a.tipo as 'interno' | 'cliente' | 'designer',
                pode_editar_legenda: a.pode_editar_legenda,
              })),
              nivel: 1,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (whatsappErr) {
      console.error('WhatsApp notification error (non-critical):', whatsappErr)
    }

    // Dispatch webhook directly (no HTTP round-trip)
    try {
      const eventType = action === 'submit'
        ? 'content.internal_review_requested'
        : action === 'approve'
          ? 'content.internal_approved'
          : 'content.internal_adjustment_requested'

      await dispatchWebhookEvent(orgId, eventType, {
        conteudo_id,
        titulo: conteudo.titulo,
        action,
        previous_status: previousStatus,
        new_status: newStatus,
        reviewer_id,
        reviewer_name,
        comment,
      })
    } catch (webhookErr) {
      console.error('Webhook dispatch error:', webhookErr)
    }

    return NextResponse.json({
      success: true,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('Internal approval error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
