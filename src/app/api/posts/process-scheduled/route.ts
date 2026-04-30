import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UPLOAD_POST_API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY!
// CRON_SECRET must be set; never bypass


// Map platform IDs to Upload-Post platform names
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
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv']
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return videoExtensions.some(ext => pathname.endsWith(ext))
  } catch {
    return videoExtensions.some(ext => url.toLowerCase().split('?')[0].endsWith(ext))
  }
}

// Erros permanentes (4xx exceto 408/429) não devem ser retentados — o post nunca vai dar certo
function isRetryableError(status?: number, message?: string): boolean {
  if (status === undefined) return true // network/timeout sem status — vale retry
  if (status >= 500) return true        // 5xx — servidor caiu
  if (status === 408 || status === 429) return true // timeout/rate-limit
  // 4xx restantes (400, 401, 403, 404, 422...) são erros do request, não adianta retentar
  if (status >= 400 && status < 500) return false
  // 2xx caiu aqui só se algo muito estranho — não retenta
  if (message?.toLowerCase().match(/timeout|econn|fetch failed|network/)) return true
  return true
}

async function publishPost(
  post: any,
  admin: any,
): Promise<{ success: boolean; error?: string; response?: any; status?: number }> {
  try {
    // Get client info
    const { data: cliente } = await admin
      .from('clientes')
      .select('id, slug, org_id')
      .eq('id', post.cliente_id)
      .single()

    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    // IMPORTANT: Use slug directly as username — this matches how profiles
    // were created in Upload-Post (e.g., "nechio", "grupo-manchester", "flexbyo")
    const username = cliente.slug

    // Parse platforms
    let platforms: string[] = []
    try {
      const parsed = JSON.parse(post.platforms)
      platforms = Array.isArray(parsed) 
        ? parsed.map((p: any) => typeof p === 'string' ? p : p.platform)
        : [parsed]
    } catch {
      platforms = [post.platforms]
    }

    const uploadPostPlatforms = platforms
      .map(p => PLATFORM_MAP[p.toLowerCase()])
      .filter(Boolean)

    if (uploadPostPlatforms.length === 0) {
      return { success: false, error: 'Nenhuma plataforma válida' }
    }

    // Normalize media_urls — handle both array and string formats
    let media_urls: string[] = []
    if (Array.isArray(post.media_urls)) {
      media_urls = post.media_urls
    } else if (typeof post.media_urls === 'string' && post.media_urls) {
      media_urls = [post.media_urls]
    }

    const hashtags: string[] = post.hashtags || []
    const fullCaption = hashtags.length > 0 
      ? `${post.caption}\n\n${hashtags.join(' ')}` 
      : post.caption

    let publishResponse: any = null

    console.log(`[process-scheduled] Publishing post ${post.id} for ${username} to ${uploadPostPlatforms.join(',')} with ${media_urls.length} media`)

    if (media_urls.length > 0 && media_urls.some(isVideoUrl)) {
      // Video upload — passa URL diretamente, Upload-Post busca o vídeo
      const videoUrl = media_urls.find(isVideoUrl)!
      const formData = new FormData()

      formData.append('video', videoUrl)   // URL string — Upload-Post busca diretamente
      formData.append('title', fullCaption)
      formData.append('user', username)
      uploadPostPlatforms.forEach(p => formData.append('platform[]', p))

      // Capa por plataforma (campos distintos conforme doc oficial Upload-Post)
      const coverUrl: string | undefined = post.cover_url
      if (coverUrl) {
        formData.append('cover_url', coverUrl)        // Instagram Reels
        formData.append('thumbnail_url', coverUrl)    // YouTube
      }

      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Apikey ${UPLOAD_POST_API_KEY}` },
        body: formData,
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}`, response: publishResponse, status: res.status }
    } else if (media_urls.length > 0) {
      // Photo upload — send URLs directly (Upload-Post fetches them server-side)
      // This avoids timeout issues from downloading large images in serverless
      const formData = new FormData()
      
      for (const imageUrl of media_urls) {
        formData.append('photos[]', imageUrl)
      }
      
      formData.append('user', username)
      formData.append('title', fullCaption)
      formData.append('description', fullCaption)
      uploadPostPlatforms.forEach(p => formData.append('platform[]', p))

      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_photos`, {
        method: 'POST',
        headers: { 'Authorization': `Apikey ${UPLOAD_POST_API_KEY}` },
        body: formData,
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}`, response: publishResponse, status: res.status }
    } else {
      // Text-only post
      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_text`, {
        method: 'POST',
        headers: { 
          'Authorization': `Apikey ${UPLOAD_POST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: username,
          title: fullCaption,
          platform: uploadPostPlatforms,
        }),
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}`, response: publishResponse, status: res.status }
    }

    console.log(`[process-scheduled] Post ${post.id} result:`, JSON.stringify(publishResponse).substring(0, 500))
    return { success: true, response: publishResponse }
  } catch (err: any) {
    console.error(`[process-scheduled] Post ${post.id} error:`, err.message)
    return { success: false, error: err.message }
  }
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = [1000, 5000, 15000]

async function publishWithRetry(post: any, admin: any, attempt = 0): Promise<{ success: boolean; error?: string; response?: any; status?: number }> {
  try {
    const result = await publishPost(post, admin)

    // Só retenta em erros transitórios (5xx, timeouts, rate limit)
    if (!result.success && attempt < MAX_RETRIES && isRetryableError(result.status, result.error)) {
      console.log(`[process-scheduled] Retry ${attempt + 1}/${MAX_RETRIES} for post ${post.id} in ${RETRY_DELAY_MS[attempt]}ms (status=${result.status ?? 'n/a'})`)
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS[attempt]))
      return publishWithRetry(post, admin, attempt + 1)
    }
    if (!result.success && !isRetryableError(result.status, result.error)) {
      console.log(`[process-scheduled] Permanent failure for post ${post.id} (status=${result.status}) — not retrying`)
    }

    return result
  } catch (err: any) {
    // Exception inesperada = network/runtime issue → retry vale a pena
    if (attempt < MAX_RETRIES) {
      console.log(`[process-scheduled] Exception Retry ${attempt + 1}/${MAX_RETRIES} for post ${post.id} in ${RETRY_DELAY_MS[attempt]}ms`)
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS[attempt]))
      return publishWithRetry(post, admin, attempt + 1)
    }
    return { success: false, error: err.message }
  }
}

export async function GET(request: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET
  if (!CRON_SECRET) {
    console.error('[process-scheduled] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured: CRON_SECRET not set' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  // Accept both "Bearer <secret>" (Vercel Cron / n8n) and query param ?secret=<secret>
  const querySecret = request.nextUrl.searchParams.get('secret')
  const isAuthorized = authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const now = new Date()
  const nowISO = now.toISOString()

  // Get all scheduled posts that are due
  const { data: duePosts, error: fetchError } = await admin
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowISO)
    .order('scheduled_at', { ascending: true })
    .limit(10) // Process max 10 at a time

  if (fetchError) {
    console.error('[process-scheduled] Error fetching due posts:', fetchError)
    return NextResponse.json({ error: 'Error fetching posts' }, { status: 500 })
  }



  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ 
      message: 'No posts to process', 
      processed: 0,
      checked_at_utc: nowISO,
    })
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const post of duePosts) {
    // Mark as publishing
    await admin
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    // Publish
    const result = await publishWithRetry(post, admin)

    // Update status
    const status = result.success ? 'published' : 'failed'
    await admin
      .from('scheduled_posts')
      .update({
        status,
        published_at: result.success ? now : null,
        upload_post_id: result.response?.id || null,
        upload_post_response: result.response || { error: result.error },
      })
      .eq('id', post.id)

    results.push({
      id: post.id,
      success: result.success,
      error: result.error,
    })
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return NextResponse.json({
    message: `Processed ${results.length} posts`,
    processed: results.length,
    success: successCount,
    failed: failCount,
    results,
  })
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
