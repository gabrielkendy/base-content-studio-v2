// Email Sending Service - BASE Content Studio
// Configurável para Resend, SendGrid, ou Nodemailer

import { emailTemplates, EmailTemplateData } from './templates'

export type EmailTemplate = keyof typeof emailTemplates

interface SendEmailParams {
  to: string | string[]
  subject: string
  template: EmailTemplate
  data: EmailTemplateData
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Queue de emails para não bloquear requests
const emailQueue: SendEmailParams[] = []
let isProcessing = false

// Função principal de envio
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, template, data } = params
  
  // Gerar HTML do template
  const templateFn = emailTemplates[template]
  if (!templateFn) {
    return { success: false, error: `Template "${template}" não encontrado` }
  }
  
  const html = templateFn(data)
  const recipients = Array.isArray(to) ? to : [to]
  
  // Verificar se Resend está configurado
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (resendApiKey) {
    return sendViaResend(recipients, subject, html, resendApiKey)
  }
  
  // Fallback: log para desenvolvimento
  console.log('📧 [EMAIL] Would send to:', recipients.join(', '))
  console.log('📧 [EMAIL] Subject:', subject)
  console.log('📧 [EMAIL] Template:', template)
  
  // Em desenvolvimento, retornar sucesso simulado
  if (process.env.NODE_ENV === 'development') {
    return { success: true, messageId: 'dev-' + Date.now() }
  }
  
  return { success: false, error: 'Nenhum serviço de email configurado' }
}

// Envio via Resend
async function sendViaResend(
  to: string[], 
  subject: string, 
  html: string,
  apiKey: string
): Promise<SendEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'BASE Content Studio <noreply@basecontentstudio.com>',
        to,
        subject,
        html,
      }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('Resend error:', result)
      return { success: false, error: result.message || 'Erro ao enviar email' }
    }
    
    return { success: true, messageId: result.id }
  } catch (err: any) {
    console.error('Resend exception:', err)
    return { success: false, error: err.message }
  }
}

// Adicionar à fila (fire-and-forget)
export function queueEmail(params: SendEmailParams): void {
  emailQueue.push(params)
  processQueue()
}

// Processar fila em background
async function processQueue(): Promise<void> {
  if (isProcessing || emailQueue.length === 0) return
  
  isProcessing = true
  
  while (emailQueue.length > 0) {
    const email = emailQueue.shift()
    if (email) {
      try {
        await sendEmail(email)
      } catch (err) {
        console.error('Email queue error:', err)
      }
      // Small delay between emails
      await new Promise(r => setTimeout(r, 100))
    }
  }
  
  isProcessing = false
}

// Helper functions para casos comuns
export const emailHelpers = {
  // Notificar equipe sobre nova solicitação
  async notifyNewRequest(
    teamEmails: string[],
    clienteName: string,
    titulo: string,
    actionUrl: string
  ) {
    return sendEmail({
      to: teamEmails,
      subject: `📩 Nova solicitação de ${clienteName}`,
      template: 'novaSolicitacao',
      data: { clienteName, conteudoTitulo: titulo, actionUrl },
    })
  },
  
  // Notificar sobre aprovação pendente
  async notifyApprovalPending(
    reviewerEmail: string,
    reviewerName: string,
    clienteName: string,
    titulo: string,
    actionUrl: string
  ) {
    return sendEmail({
      to: reviewerEmail,
      subject: `👁️ Aprovação pendente: ${titulo}`,
      template: 'aprovacaoSolicitada',
      data: { recipientName: reviewerName, clienteName, conteudoTitulo: titulo, actionUrl },
    })
  },
  
  // Notificar equipe sobre aprovação do cliente
  async notifyClientApproved(
    teamEmails: string[],
    clienteName: string,
    titulo: string,
    actionUrl: string
  ) {
    return sendEmail({
      to: teamEmails,
      subject: `✅ ${clienteName} aprovou: ${titulo}`,
      template: 'conteudoAprovado',
      data: { clienteName, conteudoTitulo: titulo, actionUrl },
    })
  },
  
  // Notificar equipe sobre pedido de ajuste
  async notifyAdjustmentRequested(
    teamEmails: string[],
    clienteName: string,
    titulo: string,
    comment: string,
    actionUrl: string
  ) {
    return sendEmail({
      to: teamEmails,
      subject: `🔄 Ajuste solicitado: ${titulo}`,
      template: 'ajusteSolicitado',
      data: { clienteName, conteudoTitulo: titulo, comment, actionUrl },
    })
  },
  
  // Enviar convite
  async sendInvite(
    email: string,
    orgName: string,
    inviteUrl: string
  ) {
    return sendEmail({
      to: email,
      subject: `👋 Você foi convidado para ${orgName}`,
      template: 'conviteMembro',
      data: { orgName, actionUrl: inviteUrl },
    })
  },
}
