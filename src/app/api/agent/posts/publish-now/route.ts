/**
 * POST /api/agent/posts/publish-now
 *
 * Publica IMEDIATAMENTE nas redes via Upload-Post.
 *
 * Body:
 *   {
 *     cliente: "slug-do-cliente"   // ou cliente_id / cliente_slug / cliente_nome
 *     platforms: ["instagram", "tiktok"]   // ou [{platform, format}]
 *     caption: "...",
 *     hashtags?: ["#x", "#y"],
 *     media_urls?: ["https://..."],
 *     cover_url?: "https://..."   // poster pra vídeo
 *     conteudo_id?: "..."          // se vinculado a um card existente
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import * as UP from '@/lib/upload-post-v2'

const UPLOAD_POST_API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY!

const PLATFORM_MAP: Record<string, string> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
  facebook: 'facebook',
  linkedin: 'linkedin',
  twitter: 'twitter',
  x: 'twitter',
  threads: 'threads',
  pinterest: 'pinterest',
}

function isVideoUrl(url: string): boolean {
  const exts = ['.mp4', '.mov', '.webm', '.avi', '.mkv']
  try {
    const path = new URL(url).pathname.toLowerCase()
    return exts.some(e => path.endsWith(e))
  } catch {
    return exts.some(e => url.toLowerCase().split('?')[0].endsWith(e))
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!UPLOAD_POST_API_KEY) {
    return NextResponse.json({ error: 'UPLOAD_POST_API_KEY não configurado' }, { status: 500 })
  }

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
  } = body as Record<string, any>

  const target = await resolveCliente(auth.orgId, {
    id: cliente_id || cliente?.id,
    slug: cliente_slug || cliente?.slug || (typeof cliente === 'string' ? cliente : undefined),
    nome: cliente_nome || cliente?.nome,
  })
  if (!target) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: '`platforms` é obrigatório (array de strings ou {platform, format})' }, { status: 400 })
  }

  const platformStrings: string[] = platforms.map((p: any) => typeof p === 'string' ? p : p.platform)
  const isStoriesOnly = platforms.every((p: any) => (typeof p === 'object' ? p.format : '') === 'stories')

  if (!caption.trim() && !isStoriesOnly) {
    return NextResponse.json({ error: '`caption` é obrigatório (exceto stories)' }, { status: 400 })
  }

  const username = target.slug
  // Verifica que as redes estão conectadas
  let contas: any[] = []
  try {
    contas = await UP.verificarConexoes(username)
  } catch (err: any) {
    return NextResponse.json({ error: `Erro ao consultar Upload-Post: ${err.message}` }, { status: 502 })
  }
  const connectedPlatforms = contas.filter((c: any) => c.conectada).map((c: any) => c.plataforma)
  const missing = platformStrings.filter(p => !connectedPlatforms.includes(p))
  if (missing.length > 0) {
    return NextResponse.json({
      error: `Plataformas não conectadas: ${missing.join(', ')}`,
      connected: connectedPlatforms,
      requested: platformStrings,
    }, { status: 400 })
  }

  const admin = createServiceClient()
  const now = new Date().toISOString()

  const { data: scheduledPost, error: insertError } = await admin
    .from('scheduled_posts')
    .insert({
      org_id: auth.orgId,
      cliente_id: target.id,
      conteudo_id: conteudo_id || null,
      platforms: JSON.stringify(platformStrings),
      caption,
      media_urls: Array.isArray(media_urls) ? media_urls : [],
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      cover_url: cover_url || null,
      scheduled_at: now,
      status: 'publishing',
      created_by: auth.userId || null,
    })
    .select('*')
    .single()

  if (insertError || !scheduledPost) {
    return NextResponse.json({ error: insertError?.message || 'Erro ao registrar post' }, { status: 500 })
  }

  const fullCaption = (Array.isArray(hashtags) && hashtags.length > 0)
    ? `${caption}\n\n${hashtags.join(' ')}`.trim()
    : caption

  const upPlatforms = platformStrings.map(p => PLATFORM_MAP[p.toLowerCase()]).filter(Boolean)

  let publishResponse: any = null
  let publishError: string | null = null
  let httpStatus = 0

  try {
    const urls: string[] = Array.isArray(media_urls) ? media_urls : []
    if (urls.length > 0 && urls.some(isVideoUrl)) {
      const videoUrl = urls.find(isVideoUrl)!
      const fd = new FormData()
      fd.append('video', videoUrl)
      fd.append('title', fullCaption)
      fd.append('user', username)
      upPlatforms.forEach(p => fd.append('platform[]', p))
      if (cover_url) {
        fd.append('cover_url', cover_url)
        fd.append('thumbnail_url', cover_url)
      }
      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` },
        body: fd,
      })
      httpStatus = res.status
      publishResponse = await res.json().catch(() => ({}))
      if (!res.ok) publishError = publishResponse?.message || `HTTP ${res.status}`
    } else if (urls.length > 0) {
      const fd = new FormData()
      for (const u of urls) fd.append('photos[]', u)
      fd.append('user', username)
      fd.append('title', fullCaption)
      fd.append('description', fullCaption)
      upPlatforms.forEach(p => fd.append('platform[]', p))
      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_photos`, {
        method: 'POST',
        headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}` },
        body: fd,
      })
      httpStatus = res.status
      publishResponse = await res.json().catch(() => ({}))
      if (!res.ok) publishError = publishResponse?.message || `HTTP ${res.status}`
    } else {
      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_text`, {
        method: 'POST',
        headers: { Authorization: `Apikey ${UPLOAD_POST_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: username, title: fullCaption, platform: upPlatforms }),
      })
      httpStatus = res.status
      publishResponse = await res.json().catch(() => ({}))
      if (!res.ok) publishError = publishResponse?.message || `HTTP ${res.status}`
    }
  } catch (err: any) {
    publishError = err.message
  }

  const finalStatus = publishError ? 'failed' : 'published'
  await admin
    .from('scheduled_posts')
    .update({
      status: finalStatus,
      published_at: publishError ? null : now,
      upload_post_id: publishResponse?.id || null,
      upload_post_response: publishResponse || { error: publishError },
    })
    .eq('id', scheduledPost.id)

  if (publishError) {
    return NextResponse.json({
      success: false,
      error: publishError,
      http_status: httpStatus,
      post_id: scheduledPost.id,
      response: publishResponse,
    }, { status: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502 })
  }

  return NextResponse.json({
    success: true,
    post_id: scheduledPost.id,
    upload_post: publishResponse,
    cliente: target,
  })
}
