import { createServiceClient } from '@/lib/supabase/server'
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
