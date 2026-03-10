// Serviço de Notificações para o fluxo de aprovação
// Envia WhatsApp, Email e Telegram via n8n webhook

const N8N_WEBHOOK_URL = process.env.N8N_NOTIFICACAO_WEBHOOK || 
  'https://agenciabase.app.n8n.cloud/webhook/base-content/notificacao'

export type TipoNotificacao =
  | 'novo_conteudo'      // Conteúdo criado, ir pro nível 1
  | 'nivel_aprovado'     // Aprovado, ir pro próximo nível
  | 'ajuste_solicitado'  // Pedir ajuste
  | 'aprovado_final'     // Todos níveis aprovaram
  | 'cliente_aprovado'   // Cliente aprovou, perguntar sobre agendamento

export type CanalNotificacao = 'whatsapp' | 'email' | 'telegram'

interface Aprovador {
  nome: string
  whatsapp: string
  email: string | null
  telegram_id: string | null
  tipo: 'interno' | 'cliente' | 'designer'
  pode_editar_legenda: boolean
  canais_notificacao: CanalNotificacao[]
}

interface ConteudoInfo {
  id: string
  titulo: string
  legenda?: string
  status: string
  link_aprovacao: string
}

interface EmpresaInfo {
  id: string
  nome: string
  slug: string
}

interface NotificacaoPayload {
  tipo: TipoNotificacao
  conteudo: ConteudoInfo
  empresa: EmpresaInfo
  aprovadores: Aprovador[]
  nivel: number
  timestamp: string
}

/**
 * Dispara notificações para aprovadores via n8n webhook
 */
export async function dispararNotificacao(payload: NotificacaoPayload): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro no webhook n8n:', errorText)
      return { success: false, error: errorText }
    }

    return { success: true }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('n8n webhook timeout após 10s')
      return { success: false, error: 'Timeout ao disparar notificação' }
    }
    console.error('Erro ao disparar notificação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Gera link de aprovação para um conteúdo (página pública)
 */
export function gerarLinkAprovacao(conteudoId: string): string {
  const baseUrl = getPublicBaseUrl()
  return `${baseUrl}/aprovacao/${conteudoId}`
}

/** URL base da landing/studio (páginas públicas) */
export function getAppUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN
  if (base) return `https://studio.${base}`
  return process.env.NEXT_PUBLIC_APP_URL || 'https://studio.agenciabase.tech'
}

/** URL base da landing/studio (páginas públicas) — alias explícito */
export function getPublicBaseUrl(): string {
  return getAppUrl()
}

/** URL base do app autenticado (equipe interna) */
export function getInternalAppUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN
  if (base) return `https://app.${base}`
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.agenciabase.tech'
}

/**
 * Templates de mensagem WhatsApp por tipo
 */
export const templatesWhatsApp: Record<TipoNotificacao, (conteudo: ConteudoInfo, empresa: EmpresaInfo) => string> = {
  novo_conteudo: (c, e) => `🆕 *Novo conteúdo para aprovação*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

${c.legenda ? '📝 ' + c.legenda.substring(0, 150) + '...' : ''}

👉 Aprovar: ${c.link_aprovacao}`,

  nivel_aprovado: (c, e) => `✅ *Conteúdo passou para seu nível*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

O conteúdo foi aprovado pelo nível anterior e precisa da sua aprovação.

👉 Aprovar: ${c.link_aprovacao}`,

  ajuste_solicitado: (c, e) => `🔄 *Ajuste solicitado*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

Foi solicitado um ajuste neste conteúdo.

👉 Ver detalhes: ${c.link_aprovacao}`,

  aprovado_final: (c, e) => `🎉 *Conteúdo aprovado!*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

O conteúdo foi aprovado por todos os níveis e está pronto para publicação!`,

  cliente_aprovado: (c, e) => `✅ *Cliente aprovou o conteúdo!*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

Deseja agendar a publicação agora?

👉 Agendar: ${c.link_aprovacao}`
}

/**
 * Assuntos de email por tipo
 */
export const assuntosEmail: Record<TipoNotificacao, (conteudo: ConteudoInfo, empresa: EmpresaInfo) => string> = {
  novo_conteudo: (c, e) => `🆕 Novo conteúdo: ${c.titulo} - ${e.nome}`,
  nivel_aprovado: (c, e) => `✅ Aprovar: ${c.titulo} - ${e.nome}`,
  ajuste_solicitado: (c, e) => `🔄 Ajuste: ${c.titulo} - ${e.nome}`,
  aprovado_final: (c, e) => `🎉 Aprovado: ${c.titulo} - ${e.nome}`,
  cliente_aprovado: (c, e) => `✅ Cliente aprovou: ${c.titulo} - ${e.nome}`
}

/**
 * Templates de mensagem Telegram por tipo (formato Markdown)
 */
export const templatesTelegram: Record<TipoNotificacao, (conteudo: ConteudoInfo, empresa: EmpresaInfo) => string> = {
  novo_conteudo: (c, e) => `🆕 *Novo conteúdo para aprovação*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

${c.legenda ? '📝 ' + c.legenda.substring(0, 150) + '...' : ''}

[👉 Aprovar](${c.link_aprovacao})`,

  nivel_aprovado: (c, e) => `✅ *Conteúdo passou para seu nível*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

O conteúdo foi aprovado pelo nível anterior e precisa da sua aprovação.

[👉 Aprovar](${c.link_aprovacao})`,

  ajuste_solicitado: (c, e) => `🔄 *Ajuste solicitado*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

Foi solicitado um ajuste neste conteúdo.

[👉 Ver detalhes](${c.link_aprovacao})`,

  aprovado_final: (c, e) => `🎉 *Conteúdo aprovado!*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

O conteúdo foi aprovado por todos os níveis e está pronto para publicação!`,

  cliente_aprovado: (c, e) => `✅ *Cliente aprovou o conteúdo!*

📌 *${c.titulo || 'Sem título'}*
🏢 Cliente: ${e.nome}

Deseja agendar a publicação agora?

[👉 Agendar](${c.link_aprovacao})`
}

/**
 * Gera HTML do email
 */
export function gerarEmailHtml(
  tipo: TipoNotificacao, 
  conteudo: ConteudoInfo, 
  empresa: EmpresaInfo
): string {
  const titulos: Record<TipoNotificacao, string> = {
    novo_conteudo: '📋 Novo Conteúdo',
    nivel_aprovado: '✅ Aprovar Conteúdo',
    ajuste_solicitado: '🔄 Ajuste Necessário',
    aprovado_final: '🎉 Conteúdo Aprovado!',
    cliente_aprovado: '✅ Cliente Aprovou!'
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #6366F1, #818CF8); color: white; padding: 32px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 32px; }
    .info { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #6366F1; }
    .info h3 { margin: 0 0 8px; color: #1e293b; }
    .info p { margin: 0; color: #64748b; line-height: 1.6; }
    .button { display: inline-block; background: #6366F1; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
    .button:hover { background: #4f46e5; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${titulos[tipo]}</h1>
        <p>${empresa.nome}</p>
      </div>
      <div class="content">
        <div class="info">
          <h3>${conteudo.titulo || 'Sem título'}</h3>
          <p>${conteudo.legenda ? conteudo.legenda.substring(0, 250) + '...' : 'Clique abaixo para ver o conteúdo completo.'}</p>
        </div>
        <a href="${conteudo.link_aprovacao}" class="button">Ver e Aprovar →</a>
      </div>
      <div class="footer">
        <p>Base Content Studio - Agência Base</p>
        <p style="font-size: 11px; margin-top: 8px;">Este email foi enviado automaticamente. Por favor, não responda.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
