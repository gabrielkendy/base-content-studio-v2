import { createServiceClient } from '@/lib/supabase/server'
import { normalizeStatus } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: aprovacao, error } = await supabase
      .from('aprovacoes_links')
      .select('*, conteudo:conteudos(*), empresa:clientes(*)')
      .eq('token', token)
      .single()

    if (error || !aprovacao) {
      return NextResponse.json({ error: 'Link inválido ou não encontrado' }, { status: 404 })
    }

    // Check expiry
    if (aprovacao.expires_at && new Date(aprovacao.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 410 })
    }

    return NextResponse.json({ data: aprovacao })
  } catch (err: any) {
    console.error('Public aprovacao GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, status, comentario, cliente_nome } = body

    if (!token || !status) {
      return NextResponse.json({ error: 'Token e status são obrigatórios' }, { status: 400 })
    }

    if (!['aprovado', 'ajuste'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch the approval link to validate
    const { data: aprovacao, error: fetchError } = await supabase
      .from('aprovacoes_links')
      .select('*, conteudo:conteudos(*)')
      .eq('token', token)
      .single()

    if (fetchError || !aprovacao) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
    }

    if (aprovacao.status !== 'pendente') {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 409 })
    }

    if (aprovacao.expires_at && new Date(aprovacao.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
    }

    // Update aprovacoes_links
    const { error: updateError } = await supabase
      .from('aprovacoes_links')
      .update({
        status,
        comentario_cliente: comentario || null,
        cliente_nome: cliente_nome || null,
        aprovado_em: status === 'aprovado' ? new Date().toISOString() : null,
      })
      .eq('token', token)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update content status
    const conteudo = aprovacao.conteudo as any
    if (conteudo) {
      const previousStatus = conteudo.status
      // 'aprovado' pelo cliente = aguardando_agendamento (pronto para agendar)
      // 'ajuste' = precisa de ajustes
      const newContentStatus = status === 'aprovado' ? 'aguardando_agendamento' : 'ajuste'
      
      await supabase
        .from('conteudos')
        .update({
          status: newContentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conteudo.id)

      // Registrar na tabela de histórico de aprovações
      try {
        await supabase
          .from('approvals')
          .insert({
            org_id: conteudo.org_id,
            conteudo_id: conteudo.id,
            type: 'external',
            status: status === 'aprovado' ? 'approved' : 'adjustment',
            reviewer_name: cliente_nome || 'Cliente',
            comment: comentario || null,
            previous_status: previousStatus,
            new_status: newContentStatus,
            link_token: token,
            reviewed_at: new Date().toISOString(),
          })
        
        // Criar notificação para a equipe
        // Se tiver assigned_to, notifica ele; senão, notifica todos os admins/gestores
        if (conteudo.assigned_to) {
          await supabase
            .from('notifications')
            .insert({
              org_id: conteudo.org_id,
              user_id: conteudo.assigned_to,
              type: status === 'aprovado' ? 'content_approved' : 'content_adjustment',
              title: status === 'aprovado' 
                ? `✅ "${conteudo.titulo}" aprovado!`
                : `🔄 "${conteudo.titulo}" precisa de ajustes`,
              body: status === 'aprovado'
                ? `O cliente aprovou o conteúdo. Pronto para agendar!`
                : `Feedback: ${comentario || 'Ver detalhes'}`,
              read: false,
              reference_id: conteudo.id,
              reference_type: 'conteudo',
            })
        } else {
          // Notificar admins e gestores da org
          const { data: members } = await supabase
            .from('members')
            .select('user_id')
            .eq('org_id', conteudo.org_id)
            .in('role', ['admin', 'gestor'])
            .eq('status', 'active')
          
          if (members && members.length > 0) {
            const notifications = members.map((m: any) => ({
              org_id: conteudo.org_id,
              user_id: m.user_id,
              type: status === 'aprovado' ? 'content_approved' : 'content_adjustment',
              title: status === 'aprovado' 
                ? `✅ "${conteudo.titulo}" aprovado!`
                : `🔄 "${conteudo.titulo}" precisa de ajustes`,
              body: status === 'aprovado'
                ? `O cliente aprovou o conteúdo. Pronto para agendar!`
                : `Feedback: ${comentario || 'Ver detalhes'}`,
              read: false,
              reference_id: conteudo.id,
              reference_type: 'conteudo',
            }))
            await supabase.from('notifications').insert(notifications)
          }
        }
      } catch (approvalErr) {
        console.error('Error inserting approval record:', approvalErr)
        // Continue mesmo se falhar - não é crítico
      }

      // Dispatch webhook (server-side, using internal fetch)
      if (conteudo.org_id) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'
          
          await fetch(`${baseUrl}/api/webhooks/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: conteudo.org_id,
              event_type: status === 'aprovado' ? 'content.approved' : 'content.adjustment_requested',
              data: {
                conteudo_id: conteudo.id,
                titulo: conteudo.titulo,
                new_status: status === 'aprovado' ? 'aprovado' : 'ajuste',
                comentario: comentario || null,
                cliente_nome: cliente_nome || null,
              },
            }),
          })
        } catch (webhookErr) {
          // Fire and forget
          console.error('Webhook dispatch error:', webhookErr)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Public aprovacao POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
