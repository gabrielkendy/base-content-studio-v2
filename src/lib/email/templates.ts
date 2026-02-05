// Email Templates - BASE Content Studio
// Templates HTML bonitos para notificações por email

export interface EmailTemplateData {
  recipientName?: string
  clienteName?: string
  conteudoTitulo?: string
  actionUrl?: string
  message?: string
  comment?: string
  date?: string
  orgName?: string
  orgLogo?: string
  brandColor?: string
}

// Base layout wrapper
function baseLayout(content: string, data: EmailTemplateData = {}) {
  const brandColor = data.brandColor || '#6366F1'
  const orgName = data.orgName || 'BASE Content Studio'
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${orgName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f4f4f5;">
              ${data.orgLogo 
                ? `<img src="${data.orgLogo}" alt="${orgName}" style="height: 40px; margin-bottom: 8px;">`
                : `<div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, ${brandColor}, #8B5CF6); border-radius: 12px; color: white; font-weight: bold; font-size: 18px;">${orgName.charAt(0)}</div>`
              }
              <p style="margin: 12px 0 0; color: #71717a; font-size: 14px;">${orgName}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #f4f4f5; background-color: #fafafa; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                Este email foi enviado automaticamente por ${orgName}.<br>
                <a href="#" style="color: #a1a1aa;">Gerenciar preferências de notificação</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// Botão CTA
function ctaButton(text: string, url: string, color: string = '#6366F1') {
  return `
    <a href="${url}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, ${color}, #8B5CF6); color: white; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 10px; margin: 16px 0;">
      ${text}
    </a>
  `
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATES DE EMAIL
// ═══════════════════════════════════════════════════════════════════

// 1. Nova solicitação do cliente
export function templateNovaSolicitacao(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      📩 Nova Solicitação
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      O cliente <strong>${data.clienteName}</strong> enviou uma nova solicitação de conteúdo:
    </p>
    <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
      ${data.message ? `<p style="margin: 12px 0 0; color: #71717a; font-size: 14px;">${data.message}</p>` : ''}
    </div>
    <div style="text-align: center;">
      ${ctaButton('Ver Solicitação', data.actionUrl || '#')}
    </div>
  `
  return baseLayout(content, data)
}

// 2. Conteúdo enviado para aprovação
export function templateAprovacaoSolicitada(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      👁️ Aprovação Solicitada
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      Um novo conteúdo está aguardando sua aprovação:
    </p>
    <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
      <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">
        Cliente: ${data.clienteName}
      </p>
    </div>
    <div style="text-align: center;">
      ${ctaButton('Revisar Conteúdo', data.actionUrl || '#', '#f59e0b')}
    </div>
  `
  return baseLayout(content, data)
}

// 3. Conteúdo aprovado pelo cliente
export function templateConteudoAprovado(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      ✅ Conteúdo Aprovado!
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      Ótima notícia! O cliente aprovou o conteúdo:
    </p>
    <div style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10b981;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
      <p style="margin: 8px 0 0; color: #047857; font-size: 14px;">
        ✓ Aprovado por ${data.clienteName}
      </p>
    </div>
    <p style="color: #52525b; font-size: 14px;">
      O conteúdo está pronto para ser agendado para publicação.
    </p>
    <div style="text-align: center;">
      ${ctaButton('Agendar Publicação', data.actionUrl || '#', '#10b981')}
    </div>
  `
  return baseLayout(content, data)
}

// 4. Cliente pediu ajuste
export function templateAjusteSolicitado(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      🔄 Ajuste Solicitado
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      O cliente ${data.clienteName} solicitou ajustes no conteúdo:
    </p>
    <div style="background: linear-gradient(135deg, #ffedd5, #fed7aa); border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #f97316;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
    </div>
    ${data.comment ? `
    <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        Comentário do cliente:
      </p>
      <p style="margin: 0; color: #18181b; font-size: 14px; font-style: italic;">
        "${data.comment}"
      </p>
    </div>
    ` : ''}
    <div style="text-align: center;">
      ${ctaButton('Fazer Ajustes', data.actionUrl || '#', '#f97316')}
    </div>
  `
  return baseLayout(content, data)
}

// 5. Post agendado
export function templatePostAgendado(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      📅 Post Agendado
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      O conteúdo foi agendado para publicação:
    </p>
    <div style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6366f1;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
      <p style="margin: 8px 0 0; color: #4338ca; font-size: 14px;">
        📆 ${data.date}
      </p>
      <p style="margin: 4px 0 0; color: #6366f1; font-size: 13px;">
        Cliente: ${data.clienteName}
      </p>
    </div>
    <div style="text-align: center;">
      ${ctaButton('Ver Calendário', data.actionUrl || '#')}
    </div>
  `
  return baseLayout(content, data)
}

// 6. Post publicado
export function templatePostPublicado(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      🚀 Post Publicado!
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      ${data.recipientName ? `Olá ${data.recipientName},` : 'Olá,'}<br><br>
      O conteúdo foi publicado com sucesso:
    </p>
    <div style="background: linear-gradient(135deg, #d1fae5, #6ee7b7); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #059669;">
      <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 16px;">
        ${data.conteudoTitulo}
      </p>
      <p style="margin: 8px 0 0; color: #047857; font-size: 14px;">
        ✓ Publicado em ${data.date}
      </p>
    </div>
    <div style="text-align: center;">
      ${ctaButton('Ver Post', data.actionUrl || '#', '#059669')}
    </div>
  `
  return baseLayout(content, data)
}

// 7. Convite de membro
export function templateConviteMembro(data: EmailTemplateData) {
  const content = `
    <h1 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 700;">
      👋 Você foi convidado!
    </h1>
    <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
      Olá,<br><br>
      Você foi convidado para fazer parte de <strong>${data.orgName}</strong> no BASE Content Studio.
    </p>
    <div style="background: linear-gradient(135deg, #faf5ff, #f3e8ff); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; color: #7c3aed; font-size: 14px;">
        Clique no botão abaixo para aceitar o convite e criar sua conta.
      </p>
    </div>
    <div style="text-align: center;">
      ${ctaButton('Aceitar Convite', data.actionUrl || '#', '#7c3aed')}
    </div>
    <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
      Este convite expira em 7 dias.
    </p>
  `
  return baseLayout(content, data)
}

// Export all templates
export const emailTemplates = {
  novaSolicitacao: templateNovaSolicitacao,
  aprovacaoSolicitada: templateAprovacaoSolicitada,
  conteudoAprovado: templateConteudoAprovado,
  ajusteSolicitado: templateAjusteSolicitado,
  postAgendado: templatePostAgendado,
  postPublicado: templatePostPublicado,
  conviteMembro: templateConviteMembro,
}
