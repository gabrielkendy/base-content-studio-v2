/**
 * POST /api/agent/approvals/link
 *
 * Gera um link público de aprovação pra um conteúdo. Não envia notificação
 * (use /api/agent/approvals/send pra disparar WhatsApp).
 *
 * Body: { conteudo_id }
 * Resposta: { token, link, expires_at }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApprovalToken } from '@/lib/tokens'
import { getPublicBaseUrl } from '@/lib/approval-notifications'

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { conteudo_id } = body as { conteudo_id?: string }
  if (!conteudo_id) {
    return NextResponse.json({ error: '`conteudo_id` é obrigatório' }, { status: 400 })
  }

  const admin = createServiceClient()

  // Verifica conteúdo + ownership na org
  const { data: conteudo } = await admin
    .from('conteudos')
    .select('id, empresa_id, titulo, status, org_id')
    .eq('id', conteudo_id)
    .maybeSingle()

  if (!conteudo) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
  if (conteudo.org_id !== auth.orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = generateApprovalToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertErr } = await admin
    .from('aprovacoes_links')
    .insert({
      conteudo_id,
      empresa_id: conteudo.empresa_id,
      token,
      status: 'pendente',
      expires_at: expiresAt,
    })

  if (insertErr) {
    console.error('[agent/approvals/link] insert error:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const link = `${getPublicBaseUrl()}/aprovacao?token=${token}`

  // Registra entrada no histórico de approvals
  await admin
    .from('approvals')
    .insert({
      org_id: auth.orgId,
      conteudo_id,
      type: 'external',
      status: 'pending',
      previous_status: conteudo.status,
      link_token: token,
    })

  return NextResponse.json({
    success: true,
    token,
    link,
    expires_at: expiresAt,
    conteudo: { id: conteudo.id, titulo: conteudo.titulo },
  })
}
