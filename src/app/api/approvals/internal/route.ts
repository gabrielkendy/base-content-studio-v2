import { createServiceClient } from '@/lib/supabase/server'
import { dispararNotificacao, getAppUrl } from '@/lib/approval-notifications'
import { NextRequest, NextResponse } from 'next/server'

// POST: Enviar para aprovação interna
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      conteudo_id,
      org_id,
      action, // 'submit' | 'approve' | 'reject'
      reviewer_id,
      reviewer_name,
      comment,
    } = body

    if (!conteudo_id || !org_id || !action) {
      return NextResponse.json(
        { error: 'conteudo_id, org_id e action são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Buscar conteúdo atual
    const { data: conteudo, error: fetchError } = await supabase
      .from('conteudos')
      .select('*')
      .eq('id', conteudo_id)
      .single()

    if (fetchError || !conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const previousStatus = conteudo.status
    let newStatus = previousStatus
    let approvalStatus: string = 'pending'

    switch (action) {
      case 'submit':
        // Designer envia para aprovação interna
        // Status do conteúdo não muda, mas criamos um registro de aprovação pendente
        approvalStatus = 'pending'
        break

      case 'approve':
        // Gestor aprova internamente
        if (!reviewer_id) {
          return NextResponse.json(
            { error: 'reviewer_id é obrigatório para aprovar' },
            { status: 400 }
          )
        }
        approvalStatus = 'approved'
        newStatus = 'aprovacao' // Avança para aprovação do cliente
        break

      case 'reject':
        // Gestor pede ajuste interno
        if (!reviewer_id || !comment) {
          return NextResponse.json(
            { error: 'reviewer_id e comment são obrigatórios para rejeitar' },
            { status: 400 }
          )
        }
        approvalStatus = 'adjustment'
        newStatus = 'producao' // Volta para produção
        break

      default:
        return NextResponse.json({ error: 'action inválida' }, { status: 400 })
    }

    // Criar registro de aprovação
    const { error: approvalError } = await supabase
      .from('approvals')
      .insert({
        org_id,
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

    // Atualizar conteúdo se necessário
    if (action !== 'submit' && newStatus !== previousStatus) {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      // Se aprovado internamente, marcar
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

    // 🔔 WhatsApp notifications via n8n
    try {
      const { data: empresa } = await supabase
        .from('clientes')
        .select('id, nome, slug')
        .eq('id', conteudo.empresa_id)
        .single()

      if (empresa) {
        const APP_URL = getAppUrl()
        const workflowLink = `${APP_URL}/workflow?content=${conteudo_id}`
        const empresaInfo = { id: empresa.id, nome: empresa.nome, slug: empresa.slug }

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
              empresa: empresaInfo,
              aprovadores: aprovadores.map((a: any) => ({ nome: a.nome, whatsapp: a.whatsapp, email: a.email, tipo: a.tipo, pode_editar_legenda: a.pode_editar_legenda })),
              nivel: 1,
              timestamp: new Date().toISOString(),
            })
          }
        } else if (action === 'approve') {
          // Generate client approval token
          const token = Array.from({ length: 32 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
          ).join('')

          await supabase.from('aprovacoes_links').insert({
            conteudo_id,
            empresa_id: conteudo.empresa_id,
            token,
            status: 'pendente',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })

          const clientLink = `${APP_URL}/aprovacao?token=${token}`

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
              empresa: empresaInfo,
              aprovadores: aprovadores.map((a: any) => ({ nome: a.nome, whatsapp: a.whatsapp, email: a.email, tipo: a.tipo, pode_editar_legenda: a.pode_editar_legenda })),
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
              empresa: empresaInfo,
              aprovadores: aprovadores.map((a: any) => ({ nome: a.nome, whatsapp: a.whatsapp, email: a.email, tipo: a.tipo, pode_editar_legenda: a.pode_editar_legenda })),
              nivel: 1,
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (whatsappErr) {
      console.error('WhatsApp notification error (non-critical):', whatsappErr)
    }

    // Dispatch webhook
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      
      const eventType = action === 'submit' 
        ? 'content.internal_review_requested'
        : action === 'approve'
          ? 'content.internal_approved'
          : 'content.internal_adjustment_requested'

      await fetch(`${baseUrl}/api/webhooks/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id,
          event_type: eventType,
          data: {
            conteudo_id,
            titulo: conteudo.titulo,
            action,
            previous_status: previousStatus,
            new_status: newStatus,
            reviewer_id,
            reviewer_name,
            comment,
          },
        }),
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
  } catch (err: any) {
    console.error('Internal approval error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
