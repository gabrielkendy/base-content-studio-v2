import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

// Email notification types
type NotificationType = 
  | 'new_content'
  | 'approval_request'
  | 'approval_response'
  | 'content_published'
  | 'deadline_reminder'
  | 'weekly_digest'
  | 'chat_message'
  | 'team_invite'

interface EmailPayload {
  to: string
  type: NotificationType
  data: Record<string, any>
}

// Email templates
const EMAIL_TEMPLATES: Record<NotificationType, { subject: (data: any) => string; html: (data: any) => string }> = {
  new_content: {
    subject: (d) => `📝 Novo conteúdo criado: ${d.title || 'Sem título'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📝 Novo Conteúdo</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Um novo conteúdo foi criado para <strong>${d.clientName || 'seu cliente'}</strong>:
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Tipo: ${d.type || 'Post'}</p>
            ${d.scheduledDate ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">📅 Agendado: ${d.scheduledDate}</p>` : ''}
          </div>
          <a href="${d.viewUrl || '#'}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Ver Conteúdo →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  approval_request: {
    subject: (d) => `✅ Aprovação solicitada: ${d.title || 'Conteúdo'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Aprovação Solicitada</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Olá${d.recipientName ? ` ${d.recipientName}` : ''}!
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Um conteúdo está aguardando sua aprovação:
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
            ${d.description ? `<p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">${d.description.substring(0, 150)}${d.description.length > 150 ? '...' : ''}</p>` : ''}
          </div>
          <a href="${d.approvalUrl || '#'}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-right: 10px;">
            ✓ Aprovar
          </a>
          <a href="${d.approvalUrl || '#'}" style="display: inline-block; background: #f8fafc; color: #64748b; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid #e2e8f0;">
            Ver Detalhes
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  approval_response: {
    subject: (d) => `${d.approved ? '✅ Aprovado' : '📝 Ajuste solicitado'}: ${d.title || 'Conteúdo'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${d.approved ? '#22c55e, #16a34a' : '#f59e0b, #d97706'}); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${d.approved ? '✅ Conteúdo Aprovado!' : '📝 Ajuste Solicitado'}</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            ${d.approved 
              ? `O cliente <strong>${d.approverName || 'Cliente'}</strong> aprovou o conteúdo:` 
              : `O cliente <strong>${d.approverName || 'Cliente'}</strong> solicitou ajustes no conteúdo:`}
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
          </div>
          ${d.comment ? `
            <div style="background: ${d.approved ? '#f0fdf4' : '#fffbeb'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${d.approved ? '#22c55e' : '#f59e0b'};">
              <p style="color: #475569; margin: 0; font-size: 14px; font-style: italic;">"${d.comment}"</p>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">— ${d.approverName || 'Cliente'}</p>
            </div>
          ` : ''}
          <a href="${d.viewUrl || '#'}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Ver no Workflow →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  content_published: {
    subject: (d) => `🚀 Publicado: ${d.title || 'Conteúdo'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚀 Conteúdo Publicado!</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            O conteúdo foi publicado com sucesso:
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
            ${d.channels?.length ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">📱 Canais: ${d.channels.join(', ')}</p>` : ''}
          </div>
          ${d.postUrl ? `
            <a href="${d.postUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Ver Publicação →
            </a>
          ` : ''}
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  deadline_reminder: {
    subject: (d) => `⏰ Prazo se aproximando: ${d.title || 'Conteúdo'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Lembrete de Prazo</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            O prazo do seguinte conteúdo está se aproximando:
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
            <p style="color: #ef4444; margin: 10px 0 0 0; font-size: 14px; font-weight: 600;">📅 Prazo: ${d.deadline || '-'}</p>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Status: ${d.status || '-'}</p>
          </div>
          <a href="${d.viewUrl || '#'}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Ver Conteúdo →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  weekly_digest: {
    subject: (d) => `📊 Resumo Semanal - ${d.weekRange || 'Esta semana'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📊 Resumo Semanal</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px;">${d.weekRange || 'Esta semana'}</p>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">${d.totalCreated || 0}</div>
              <div style="font-size: 12px; color: #64748b;">Conteúdos Criados</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 700; color: #22c55e;">${d.totalApproved || 0}</div>
              <div style="font-size: 12px; color: #64748b;">Aprovados</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${d.totalPublished || 0}</div>
              <div style="font-size: 12px; color: #64748b;">Publicados</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${d.totalPending || 0}</div>
              <div style="font-size: 12px; color: #64748b;">Pendentes</div>
            </div>
          </div>
          <a href="${d.dashboardUrl || '#'}" style="display: block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center;">
            Ver Dashboard Completo →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  chat_message: {
    subject: (d) => `💬 Nova mensagem de ${d.senderName || 'Alguém'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💬 Nova Mensagem</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 40px; height: 40px; background: #06b6d4; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 12px;">
                ${(d.senderName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight: 600; color: #1e293b;">${d.senderName || 'Usuário'}</div>
                <div style="font-size: 12px; color: #94a3b8;">${d.timestamp || 'Agora'}</div>
              </div>
            </div>
            <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6;">${d.message || ''}</p>
          </div>
          <a href="${d.chatUrl || '#'}" style="display: inline-block; background: #06b6d4; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Responder →
          </a>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • ${d.orgName || 'Sua Agência'}
        </p>
      </div>
    `
  },
  
  team_invite: {
    subject: (d) => `🎉 Você foi convidado para ${d.orgName || 'BASE Content Studio'}`,
    html: (d) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">Você foi convidado!</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            <strong>${d.inviterName || 'Alguém'}</strong> convidou você para fazer parte da equipe 
            <strong>${d.orgName || 'BASE Content Studio'}</strong> como <strong>${d.role || 'membro'}</strong>.
          </p>
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">O que você poderá fazer:</h3>
            <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              ${d.role === 'admin' ? '<li>Gerenciar toda a organização</li><li>Convidar e gerenciar membros</li><li>Configurar integrações</li>' : ''}
              ${d.role === 'gestor' ? '<li>Gerenciar clientes e conteúdos</li><li>Aprovar conteúdos</li><li>Ver relatórios</li>' : ''}
              ${d.role === 'designer' ? '<li>Criar e editar conteúdos</li><li>Fazer upload de mídias</li><li>Colaborar com a equipe</li>' : ''}
              ${d.role === 'cliente' ? '<li>Visualizar seus conteúdos</li><li>Aprovar ou solicitar ajustes</li><li>Conversar com a equipe</li>' : ''}
            </ul>
          </div>
          <a href="${d.inviteUrl || '#'}" style="display: block; background: #22c55e; color: white; padding: 16px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center;">
            Aceitar Convite →
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 15px; text-align: center;">
            Este convite expira em 7 dias.
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          BASE Content Studio • Gerencie conteúdos em um só lugar
        </p>
      </div>
    `
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body: EmailPayload = await request.json()
    const { to, type, data } = body

    if (!to || !type) {
      return NextResponse.json({ error: 'Campos obrigatórios: to, type' }, { status: 400 })
    }

    const template = EMAIL_TEMPLATES[type]
    if (!template) {
      return NextResponse.json({ error: `Tipo de email inválido: ${type}` }, { status: 400 })
    }

    const subject = template.subject(data)
    const html = template.html(data)

    // Tentar enviar via Resend se configurado
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    
    if (RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'BASE Content Studio <noreply@agenciabase.tech>',
            to: [to],
            subject,
            html,
          }),
        })

        const resData = await res.json()

        if (res.ok) {
          return NextResponse.json({ 
            status: 'sent',
            provider: 'resend',
            messageId: resData.id 
          })
        } else {
          console.error('Resend error:', resData)
        }
      } catch (err) {
        console.error('Resend fetch error:', err)
      }
    }

    // Fallback: usar Supabase auth (magic link como workaround ou salvar notificação in-app)
    // Por enquanto, apenas retorna que o email foi "queued"
    return NextResponse.json({ 
      status: 'queued',
      message: 'Email configurado mas sem provider ativo. Configure RESEND_API_KEY.',
      preview: { to, subject }
    })

  } catch (err) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 })
  }
}
