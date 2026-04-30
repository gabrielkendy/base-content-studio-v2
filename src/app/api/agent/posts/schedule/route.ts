/**
 * POST /api/agent/posts/schedule
 *
 * Agenda post pra futuro (cron `/api/posts/process-scheduled` publica na hora).
 *
 * Body:
 *   {
 *     cliente: "slug",
 *     platforms: ["instagram", ...],
 *     caption: "...",
 *     hashtags?: [...],
 *     media_urls?: [...],
 *     cover_url?: "...",
 *     scheduled_at: "2026-05-10T18:00:00Z"  // ISO ou "YYYY-MM-DDTHH:mm" + timezone
 *     timezone?: "America/Sao_Paulo"
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { parseScheduledAt, formatBR } from '@/lib/timezone'
import * as UP from '@/lib/upload-post-v2'

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    cliente,
    cliente_id,
    cliente_slug,
    cliente_nome,
    platforms,
    caption = '',
    hashtags = [],
    media_urls = [],
    cover_url,
    conteudo_id,
    scheduled_at,
    timezone = 'America/Sao_Paulo',
  } = body as Record<string, any>

  const target = await resolveCliente(auth.orgId, {
    id: cliente_id || cliente?.id,
    slug: cliente_slug || cliente?.slug || (typeof cliente === 'string' ? cliente : undefined),
    nome: cliente_nome || cliente?.nome,
  })
  if (!target) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: '`platforms` é obrigatório' }, { status: 400 })
  }
  if (!scheduled_at) {
    return NextResponse.json({ error: '`scheduled_at` é obrigatório' }, { status: 400 })
  }

  // Parse data
  let scheduledDate: Date
  if (typeof scheduled_at === 'string' && scheduled_at.includes('T') && !scheduled_at.endsWith('Z') && !scheduled_at.includes('+')) {
    const [datePart, timePart] = scheduled_at.split('T')
    try {
      scheduledDate = parseScheduledAt(datePart, timePart.substring(0, 5), timezone)
    } catch {
      return NextResponse.json({ error: '`scheduled_at` inválido' }, { status: 400 })
    }
  } else {
    scheduledDate = new Date(scheduled_at)
  }
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: '`scheduled_at` inválido' }, { status: 400 })
  }
  // Margem de 5 minutos pra evitar disputa com cron
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  if (scheduledDate < fiveMinFromNow) {
    return NextResponse.json({ error: '`scheduled_at` deve ser pelo menos 5 minutos no futuro' }, { status: 400 })
  }

  const platformStrings: string[] = platforms.map((p: any) => typeof p === 'string' ? p : p.platform)
  const isStoriesOnly = platforms.every((p: any) => (typeof p === 'object' ? p.format : '') === 'stories')
  if (!caption.trim() && !isStoriesOnly) {
    return NextResponse.json({ error: '`caption` é obrigatório' }, { status: 400 })
  }

  // Verifica conexão das plataformas
  let contas: any[] = []
  try {
    contas = await UP.verificarConexoes(target.slug)
  } catch (err: any) {
    return NextResponse.json({ error: `Upload-Post: ${err.message}` }, { status: 502 })
  }
  const connected = contas.filter((c: any) => c.conectada).map((c: any) => c.plataforma)
  const missing = platformStrings.filter(p => !connected.includes(p))
  if (missing.length > 0) {
    return NextResponse.json({
      error: `Plataformas não conectadas: ${missing.join(', ')}`,
      connected,
    }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: post, error } = await admin
    .from('scheduled_posts')
    .insert({
      org_id: auth.orgId,
      cliente_id: target.id,
      conteudo_id: conteudo_id || null,
      platforms: JSON.stringify(platformStrings),
      caption,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      media_urls: Array.isArray(media_urls) ? media_urls : [],
      cover_url: cover_url || null,
      scheduled_at: scheduledDate.toISOString(),
      status: 'scheduled',
      created_by: auth.userId || null,
    })
    .select('id, scheduled_at, status')
    .single()

  if (error || !post) {
    return NextResponse.json({ error: error?.message || 'Erro ao agendar' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    post_id: post.id,
    scheduled_at: post.scheduled_at,
    cliente: target,
    message: `Post agendado para ${formatBR(scheduledDate)}`,
  })
}
