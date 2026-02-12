// Email Service
// Centraliza envio de emails com Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'ContentStudio <noreply@contentstudio.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.contentstudio.com'

type EmailType = 
  | 'new_content'
  | 'approval_request'
  | 'approval_response'
  | 'content_published'
  | 'deadline_reminder'
  | 'weekly_digest'
  | 'chat_message'
  | 'team_invite'
  | 'welcome'
  | 'trial_ending'
  | 'trial_expired'
  | 'payment_failed'
  | 'subscription_canceled'

interface SendEmailParams {
  to: string
  type: EmailType
  data: Record<string, any>
}

// Templates
const templates: Record<EmailType, { subject: (d: any) => string; html: (d: any) => string }> = {
  welcome: {
    subject: () => '🎉 Bem-vindo ao ContentStudio!',
    html: (d) => baseTemplate(`
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Bem-vindo ao ContentStudio!</h1>
      </div>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Olá${d.name ? ` ${d.name}` : ''}!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Sua conta foi criada com sucesso. Você tem <strong>14 dias grátis</strong> para explorar 
        todas as funcionalidades da plataforma.
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">Próximos passos:</h3>
        <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 2;">
          <li>Adicione seu primeiro cliente</li>
          <li>Convide sua equipe</li>
          <li>Crie seu primeiro conteúdo</li>
          <li>Envie para aprovação</li>
        </ul>
      </div>
      ${ctaButton('Acessar Dashboard', `${APP_URL}/dashboard`)}
    `, d),
  },

  team_invite: {
    subject: (d) => `🎉 Você foi convidado para ${d.orgName || 'ContentStudio'}`,
    html: (d) => baseTemplate(`
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Você foi convidado!</h1>
      </div>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        <strong>${d.inviterName || 'Alguém'}</strong> convidou você para fazer parte da equipe 
        <strong>${d.orgName || 'ContentStudio'}</strong> como <strong>${d.role || 'membro'}</strong>.
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">O que você poderá fazer:</h3>
        <ul style="color: #64748b; margin: 0; padding-left: 20px; font-size: 14px; line-height: 2;">
          <li>Criar e gerenciar conteúdos</li>
          <li>Colaborar com a equipe</li>
          <li>Acompanhar aprovações</li>
        </ul>
      </div>
      ${ctaButton('Aceitar Convite', d.inviteUrl || `${APP_URL}/auth/invite`)}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
        Este convite expira em 7 dias.
      </p>
    `, d),
  },

  approval_request: {
    subject: (d) => `✅ Aprovação solicitada: ${d.title || 'Conteúdo'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">✅ Aprovação Solicitada</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Olá${d.recipientName ? ` ${d.recipientName}` : ''}!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Um conteúdo está aguardando sua aprovação:
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
        ${d.scheduledDate ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">📅 Agendado: ${d.scheduledDate}</p>` : ''}
      </div>
      ${ctaButton('Ver e Aprovar', d.approvalUrl || `${APP_URL}/aprovacao`, '#22c55e')}
    `, d),
  },

  approval_response: {
    subject: (d) => `${d.approved ? '✅ Aprovado' : '📝 Ajuste solicitado'}: ${d.title || 'Conteúdo'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">
        ${d.approved ? '✅ Conteúdo Aprovado!' : '📝 Ajuste Solicitado'}
      </h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        ${d.approved 
          ? `O cliente <strong>${d.approverName || 'Cliente'}</strong> aprovou o conteúdo:` 
          : `O cliente <strong>${d.approverName || 'Cliente'}</strong> solicitou ajustes:`}
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
      </div>
      ${d.comment ? `
        <div style="background: ${d.approved ? '#f0fdf4' : '#fffbeb'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${d.approved ? '#22c55e' : '#f59e0b'};">
          <p style="color: #475569; margin: 0; font-size: 14px; font-style: italic;">"${d.comment}"</p>
          <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 12px;">— ${d.approverName || 'Cliente'}</p>
        </div>
      ` : ''}
      ${ctaButton('Ver no Workflow', d.viewUrl || `${APP_URL}/workflow`)}
    `, d),
  },

  new_content: {
    subject: (d) => `📝 Novo conteúdo criado: ${d.title || 'Sem título'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">📝 Novo Conteúdo</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Um novo conteúdo foi criado para <strong>${d.clientName || 'seu cliente'}</strong>:
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Tipo: ${d.type || 'Post'}</p>
        ${d.scheduledDate ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">📅 Agendado: ${d.scheduledDate}</p>` : ''}
      </div>
      ${ctaButton('Ver Conteúdo', d.viewUrl || `${APP_URL}/workflow`)}
    `, d),
  },

  content_published: {
    subject: (d) => `🚀 Publicado: ${d.title || 'Conteúdo'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">🚀 Conteúdo Publicado!</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        O conteúdo foi publicado com sucesso:
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
        ${d.channels?.length ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">📱 Canais: ${d.channels.join(', ')}</p>` : ''}
      </div>
      ${d.postUrl ? ctaButton('Ver Publicação', d.postUrl, '#8b5cf6') : ''}
    `, d),
  },

  deadline_reminder: {
    subject: (d) => `⏰ Prazo se aproximando: ${d.title || 'Conteúdo'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">⏰ Lembrete de Prazo</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        O prazo do seguinte conteúdo está se aproximando:
      </p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px;">${d.title || 'Sem título'}</h2>
        <p style="color: #64748b; margin: 0; font-size: 14px;">Cliente: ${d.clientName || '-'}</p>
        <p style="color: #ef4444; margin: 10px 0 0 0; font-size: 14px; font-weight: 600;">📅 Prazo: ${d.deadline || '-'}</p>
      </div>
      ${ctaButton('Ver Conteúdo', d.viewUrl || `${APP_URL}/workflow`, '#ef4444')}
    `, d),
  },

  chat_message: {
    subject: (d) => `💬 Nova mensagem de ${d.senderName || 'Alguém'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">💬 Nova Mensagem</h1>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 12px;">
            ${(d.senderName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 600; color: #1e293b;">${d.senderName || 'Usuário'}</div>
            <div style="font-size: 12px; color: #94a3b8;">${d.timestamp || 'Agora'}</div>
          </div>
        </div>
        <p style="color: #475569; margin: 0; font-size: 15px; line-height: 1.6;">${d.message || ''}</p>
      </div>
      ${ctaButton('Responder', d.chatUrl || `${APP_URL}/chat`, '#06b6d4')}
    `, d),
  },

  weekly_digest: {
    subject: (d) => `📊 Resumo Semanal - ${d.weekRange || 'Esta semana'}`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 10px 0; font-size: 24px;">📊 Resumo Semanal</h1>
      <p style="color: #64748b; margin: 0 0 30px 0; font-size: 14px;">${d.weekRange || 'Esta semana'}</p>
      <div style="display: flex; gap: 15px; margin-bottom: 20px;">
        ${statBox(d.totalCreated || 0, 'Criados', '#3b82f6')}
        ${statBox(d.totalApproved || 0, 'Aprovados', '#22c55e')}
        ${statBox(d.totalPublished || 0, 'Publicados', '#8b5cf6')}
        ${statBox(d.totalPending || 0, 'Pendentes', '#f59e0b')}
      </div>
      ${ctaButton('Ver Dashboard', `${APP_URL}/dashboard`)}
    `, d),
  },

  trial_ending: {
    subject: (d) => `⏰ Seu trial termina em ${d.daysLeft} dias`,
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">⏰ Seu período de teste está acabando</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Olá${d.name ? ` ${d.name}` : ''}!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Seu período de teste termina em <strong>${d.daysLeft} dias</strong>. 
        Para continuar usando todas as funcionalidades, assine um plano.
      </p>
      <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          💡 Assinantes ganham acesso ilimitado a todas as features + suporte prioritário.
        </p>
      </div>
      ${ctaButton('Ver Planos', `${APP_URL}/configuracoes/assinatura`, '#f59e0b')}
    `, d),
  },

  trial_expired: {
    subject: () => '⚠️ Seu período de teste expirou',
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">⚠️ Período de teste expirado</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Olá${d.name ? ` ${d.name}` : ''}!
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Seu período de teste expirou. Assine agora para continuar gerenciando seus conteúdos.
      </p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="color: #991b1b; margin: 0; font-size: 14px;">
          🔒 Seus dados estão seguros e serão mantidos por 30 dias.
        </p>
      </div>
      ${ctaButton('Assinar Agora', `${APP_URL}/configuracoes/assinatura`, '#ef4444')}
    `, d),
  },

  payment_failed: {
    subject: () => '❌ Problema com seu pagamento',
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">❌ Problema com pagamento</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Não conseguimos processar seu pagamento. Por favor, atualize seu método de pagamento 
        para manter sua assinatura ativa.
      </p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="color: #991b1b; margin: 0; font-size: 14px;">
          ⚠️ Sua conta será suspensa em ${d.daysUntilSuspension || 7} dias se o pagamento não for regularizado.
        </p>
      </div>
      ${ctaButton('Atualizar Pagamento', `${APP_URL}/configuracoes/assinatura`, '#ef4444')}
    `, d),
  },

  subscription_canceled: {
    subject: () => '😢 Sua assinatura foi cancelada',
    html: (d) => baseTemplate(`
      <h1 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Assinatura cancelada</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Sentiremos sua falta! Sua assinatura foi cancelada.
      </p>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Você ainda terá acesso até <strong>${d.accessUntil || 'o fim do período pago'}</strong>.
      </p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #64748b; margin: 0; font-size: 14px;">
          💡 Mudou de ideia? Você pode reativar sua assinatura a qualquer momento.
        </p>
      </div>
      ${ctaButton('Reativar Assinatura', `${APP_URL}/configuracoes/assinatura`)}
    `, d),
  },
}

// Helper functions
function baseTemplate(content: string, data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${content}
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            ContentStudio • ${data.orgName || 'Gestão de Conteúdos'}
          </p>
          <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0 0;">
            <a href="${APP_URL}/configuracoes" style="color: #94a3b8;">Gerenciar notificações</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function ctaButton(text: string, url: string, color: string = '#8b5cf6') {
  return `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="display: inline-block; background: ${color}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        ${text}
      </a>
    </div>
  `
}

function statBox(value: number, label: string, color: string) {
  return `
    <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 12px; text-align: center;">
      <div style="font-size: 24px; font-weight: 700; color: ${color};">${value}</div>
      <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">${label}</div>
    </div>
  `
}

// Main send function
export async function sendEmail({ to, type, data }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const template = templates[type]
  
  if (!template) {
    return { success: false, error: `Template não encontrado: ${type}` }
  }

  const subject = template.subject(data)
  const html = template.html(data)

  // If Resend is configured, send via API
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [to],
          subject,
          html,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        console.log(`📧 Email sent: ${type} to ${to}`)
        return { success: true }
      } else {
        console.error('Resend error:', result)
        return { success: false, error: result.message || 'Erro ao enviar' }
      }
    } catch (err: any) {
      console.error('Email send error:', err)
      return { success: false, error: err.message }
    }
  }

  // Fallback: log to console in development
  console.log(`📧 [DEV] Email would be sent:`, { to, type, subject })
  return { success: true }
}

// Batch send
export async function sendEmailBatch(emails: SendEmailParams[]): Promise<void> {
  await Promise.all(emails.map(sendEmail))
}

// Envio direto com HTML customizado (para módulos específicos como Imóveis)
interface SendRawEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendRawEmail({ to, subject, html }: SendRawEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.log(`📧 [DEV] Raw email would be sent:`, { to, subject })
    return { success: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    })

    const result = await res.json()

    if (res.ok) {
      console.log(`📧 Raw email sent to ${to}`)
      return { success: true }
    } else {
      console.error('Resend error:', result)
      return { success: false, error: result.message || 'Erro ao enviar' }
    }
  } catch (err: any) {
    console.error('Raw email send error:', err)
    return { success: false, error: err.message }
  }
}
