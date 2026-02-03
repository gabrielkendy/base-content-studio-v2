import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildUsername } from '@/lib/upload-post'

const UPLOAD_POST_API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY!
const CRON_SECRET = process.env.CRON_SECRET

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
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

async function publishPost(post: any, admin: any): Promise<{ success: boolean; error?: string; response?: any }> {
  try {
    // Get client info
    const { data: cliente } = await admin
      .from('clientes')
      .select('id, org_id')
      .eq('id', post.cliente_id)
      .single()

    if (!cliente) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    const username = buildUsername(cliente.org_id, cliente.id)

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

    const media_urls: string[] = post.media_urls || []
    const hashtags: string[] = post.hashtags || []
    const fullCaption = hashtags.length > 0 
      ? `${post.caption}\n\n${hashtags.join(' ')}` 
      : post.caption

    let publishResponse: any = null

    if (media_urls.length > 0 && media_urls.some(isVideoUrl)) {
      // Video upload
      const videoUrl = media_urls.find(isVideoUrl)!
      const formData = new FormData()
      
      const videoResponse = await fetch(videoUrl)
      const videoBlob = await videoResponse.blob()
      formData.append('video', videoBlob, 'video.mp4')
      formData.append('title', fullCaption)
      formData.append('user', username)
      uploadPostPlatforms.forEach(p => formData.append('platform[]', p))

      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `ApiKey ${UPLOAD_POST_API_KEY}` },
        body: formData,
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}` }
    } else if (media_urls.length > 0) {
      // Photo upload
      const formData = new FormData()
      
      for (const imageUrl of media_urls) {
        const imgResponse = await fetch(imageUrl)
        const imgBlob = await imgResponse.blob()
        const filename = imageUrl.split('/').pop() || 'image.jpg'
        formData.append('photos[]', imgBlob, filename)
      }
      
      formData.append('user', username)
      formData.append('title', fullCaption)
      formData.append('description', fullCaption)
      uploadPostPlatforms.forEach(p => formData.append('platform[]', p))

      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_photos`, {
        method: 'POST',
        headers: { 'Authorization': `ApiKey ${UPLOAD_POST_API_KEY}` },
        body: formData,
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}` }
    } else {
      // Text-only post
      const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload_text`, {
        method: 'POST',
        headers: { 
          'Authorization': `ApiKey ${UPLOAD_POST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: username,
          title: fullCaption,
          platform: uploadPostPlatforms,
        }),
      })
      publishResponse = await res.json()
      if (!res.ok) return { success: false, error: publishResponse.message || `HTTP ${res.status}` }
    }

    return { success: true, response: publishResponse }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()
  const now = new Date().toISOString()

  // Get all scheduled posts that are due
  const { data: duePosts, error: fetchError } = await admin
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10) // Process max 10 at a time

  if (fetchError) {
    console.error('Error fetching due posts:', fetchError)
    return NextResponse.json({ error: 'Error fetching posts' }, { status: 500 })
  }

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ message: 'No posts to process', processed: 0 })
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const post of duePosts) {
    // Mark as publishing
    await admin
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    // Publish
    const result = await publishPost(post, admin)

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
