import { createServiceClient } from '@/lib/supabase/server'
import { normalizeStatus } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { notifyApprovalResponse } from '@/lib/notifications'

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

    // 📊 TRACKING: Registrar acesso ao link
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Detectar dispositivo
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    const isTablet = /iPad|Tablet/i.test(userAgent)
    const device = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop')
    
    // Detectar navegador
    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    
    // Registrar visualização
    const viewData = {
      viewed_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: userAgent.substring(0, 500),
      device,
      browser,
    }
    
    // Atualizar contagem de visualizações e último acesso
    const views = (aprovacao as any).views || []
    views.push(viewData)
    
    await supabase
      .from('aprovacoes_links')
      .update({
        last_viewed_at: new Date().toISOString(),
        view_count: (aprovacao as any).view_count ? (aprovacao as any).view_count + 1 : 1,
        views: views.slice(-50), // Manter apenas últimas 50 visualizações
      })
      .eq('token', token)

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
      
      // Salvar feedback diretamente no conteúdo para ficar visível
      await supabase
        .from('conteudos')
        .update({
          status: newContentStatus,
          comentario_cliente: status === 'ajuste' ? (comentario || null) : null,
          cliente_nome_feedback: cliente_nome || null,
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
                ? `✅ "${conteudo.titulo}" aprovado pelo cliente!`
                : `⚠️ AJUSTE SOLICITADO: "${conteudo.titulo}"`,
              body: status === 'aprovado'
                ? `O cliente aprovou o conteúdo. Pronto para agendar!`
                : `${cliente_nome || 'Cliente'} pediu ajustes:\n\n${comentario || 'Clique para ver detalhes no conteúdo'}`,
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
                ? `✅ "${conteudo.titulo}" aprovado pelo cliente!`
                : `⚠️ AJUSTE SOLICITADO: "${conteudo.titulo}"`,
              body: status === 'aprovado'
                ? `O cliente aprovou o conteúdo. Pronto para agendar!`
                : `${cliente_nome || 'Cliente'} pediu ajustes:\n\n${comentario || 'Clique para ver detalhes no conteúdo'}`,
              read: false,
              reference_id: conteudo.id,
              reference_type: 'conteudo',
            }))
            await supabase.from('notifications').insert(notifications)
            
            // Send email notifications
            try {
              // Get member emails
              const memberIds = members.map((m: any) => m.user_id)
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, email, name')
                .in('id', memberIds)
              
              // Get org name
              const { data: org } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', conteudo.org_id)
                .single()
              
              // Get client name
              const { data: client } = await supabase
                .from('clientes')
                .select('nome')
                .eq('id', conteudo.cliente_id)
                .single()

              if (profiles && profiles.length > 0) {
                await notifyApprovalResponse(
                  profiles.map((p: any) => ({ id: p.id, email: p.email, name: p.name })),
                  { 
                    id: conteudo.id, 
                    title: conteudo.titulo,
                    clientName: client?.nome || 'Cliente',
                  },
                  { id: 'client', email: '', name: cliente_nome || 'Cliente' },
                  status === 'aprovado',
                  comentario,
                  org ? { id: conteudo.org_id, name: org.name } : undefined
                )
              }
            } catch (emailErr) {
              console.error('Email notification error:', emailErr)
              // Continue - email is not critical
            }
          }
        }
      } catch (approvalErr) {
        console.error('Error inserting approval record:', approvalErr)
        // Continue mesmo se falhar - não é crítico
      }

      // 🆕 CRIAR TASK AUTOMÁTICA quando cliente pede ajuste
      if (status === 'ajuste') {
        try {
          // Buscar nome do cliente
          const { data: client } = await supabase
            .from('clientes')
            .select('nome')
            .eq('id', conteudo.cliente_id || conteudo.empresa_id)
            .single()

          // Buscar um admin/gestor pra atribuir a task (ou usar assigned_to do conteúdo)
          let assignTo = conteudo.assigned_to
          if (!assignTo) {
            const { data: admins } = await supabase
              .from('members')
              .select('user_id')
              .eq('org_id', conteudo.org_id)
              .in('role', ['admin', 'gestor'])
              .eq('status', 'active')
              .limit(1)
            
            if (admins && admins.length > 0) {
              assignTo = admins[0].user_id
            }
          }

          // Criar a task
          await supabase
            .from('tasks')
            .insert({
              org_id: conteudo.org_id,
              titulo: `🔄 Ajustes: ${conteudo.titulo || 'Conteúdo'}`,
              descricao: `**Cliente:** ${client?.nome || 'Cliente'}\n**Solicitação:**\n${comentario || 'Ver detalhes no conteúdo'}\n\n---\n_Task criada automaticamente a partir de solicitação de ajuste do cliente._`,
              prioridade: 'alta',
              status: 'pendente',
              assigned_to: assignTo,
              created_by: assignTo, // Sistema cria em nome do responsável
              due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Prazo: 2 dias
              cliente_id: conteudo.cliente_id || conteudo.empresa_id,
              conteudo_id: conteudo.id,
              tags: ['ajuste-cliente', 'automático'],
              checklist: [
                { id: '1', text: 'Revisar solicitação do cliente', done: false },
                { id: '2', text: 'Fazer os ajustes', done: false },
                { id: '3', text: 'Enviar novamente para aprovação', done: false },
              ],
            })

          console.log('✅ Task de ajuste criada automaticamente')
        } catch (taskErr) {
          console.error('Error creating adjustment task:', taskErr)
          // Continue - não é crítico
        }
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
