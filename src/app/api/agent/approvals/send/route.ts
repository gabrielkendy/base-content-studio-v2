/**
 * POST /api/agent/approvals/send
 *
 * Gera link público + envia WhatsApp via Z-API ou n8n para os aprovadores
 * cliente cadastrados desse cliente.
 *
 * Body: { conteudo_id }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApprovalToken } from '@/lib/tokens'
import { dispararNotificacao, getAppUrl, templatesWhatsApp, type CanalNotificacao } from '@/lib/approval-notifications'
import { zapiSendText } from '@/lib/zapi'

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { conteudo_id } = body as { conteudo_id?: string }
  if (!conteudo_id) {
    return NextResponse.json({ error: '`conteudo_id` é obrigatório' }, { status: 400 })
  }

  const admin = createServiceClient()
  const [conteudoRes, orgRes] = await Promise.all([
    admin.from('conteudos').select('id, titulo, legenda, status, empresa_id, org_id').eq('id', conteudo_id).maybeSingle(),
    admin.from('organizations').select('id, zapi_instance_id, zapi_token, zapi_status').eq('id', auth.orgId).maybeSingle(),
  ])

  const conteudo = conteudoRes.data
  if (!conteudo) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
  if (conteudo.org_id !== auth.orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: empresa } = await admin
    .from('clientes')
    .select('id, nome, slug')
    .eq('id', conteudo.empresa_id)
    .maybeSingle()
  if (!empresa) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  const { data: aprovadores } = await admin
    .from('aprovadores')
    .select('nome, whatsapp, email, tipo, pode_editar_legenda, telegram_id, canais_notificacao')
    .eq('empresa_id', conteudo.empresa_id)
    .eq('tipo', 'cliente')
    .eq('ativo', true)
    .eq('recebe_notificacao', true)

  if (!aprovadores || aprovadores.length === 0) {
    return NextResponse.json({
      error: 'Nenhum aprovador cliente ativo cadastrado pra este cliente',
    }, { status: 404 })
  }

  // Gera link
  const token = generateApprovalToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await admin.from('aprovacoes_links').insert({
    conteudo_id,
    empresa_id: conteudo.empresa_id,
    token,
    status: 'pendente',
    expires_at: expiresAt,
  })

  const link = `${getAppUrl()}/aprovacao?token=${token}`
  const conteudoInfo = {
    id: conteudo.id,
    titulo: conteudo.titulo || 'Sem título',
    legenda: conteudo.legenda || '',
    status: conteudo.status || '',
    link_aprovacao: link,
  }
  const empresaInfo = { id: empresa.id, nome: empresa.nome, slug: empresa.slug }

  // Tenta Z-API; cai pra n8n se não tiver/falhar
  let usedZapi = false
  let zapiSent = 0
  let zapiFailed = 0
  const org = orgRes.data
  if (org?.zapi_instance_id && org?.zapi_token && org?.zapi_status === 'connected') {
    const message = templatesWhatsApp.nivel_aprovado(conteudoInfo, empresaInfo)
    const results = await Promise.allSettled(
      aprovadores
        .filter((a: any) => a.whatsapp)
        .map((a: any) => zapiSendText(org.zapi_instance_id!, org.zapi_token!, a.whatsapp, message)),
    )
    zapiSent = results.filter(r => r.status === 'fulfilled').length
    zapiFailed = results.filter(r => r.status === 'rejected').length
    if (zapiSent > 0) usedZapi = true
  }

  if (!usedZapi) {
    await dispararNotificacao({
      tipo: 'nivel_aprovado',
      conteudo: conteudoInfo,
      empresa: empresaInfo,
      aprovadores: aprovadores.map((a: any) => ({
        nome: a.nome,
        whatsapp: a.whatsapp,
        email: a.email,
        tipo: a.tipo as 'interno' | 'cliente' | 'designer',
        pode_editar_legenda: a.pode_editar_legenda,
        telegram_id: a.telegram_id ?? null,
        canais_notificacao: (a.canais_notificacao ?? ['whatsapp']) as CanalNotificacao[],
      })),
      nivel: 0,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({
    success: true,
    link,
    token,
    expires_at: expiresAt,
    channel: usedZapi ? 'zapi' : 'n8n',
    aprovadores_count: aprovadores.length,
    zapi: usedZapi ? { sent: zapiSent, failed: zapiFailed } : null,
  })
}
