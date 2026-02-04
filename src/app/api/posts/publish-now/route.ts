import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buildUsername } from '@/lib/upload-post'

const UPLOAD_POST_API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY!

interface PublishNowRequest {
  cliente_id: string
  conteudo_id?: string
  platforms: Array<{ platform: string; format: string }>
  caption: string
  media_urls?: string[]
  hashtags?: string[]
}

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data
}

// Map platform IDs to Upload-Post platform names
const PLATFORM_MAP: Record<string, string> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
  facebook: 'facebook',
  linkedin: 'linkedin',
  twitter: 'twitter',
  threads: 'threads',
  pinterest: 'pinterest',
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 })
    }

    const body: PublishNowRequest = await request.json()
    const { 
      cliente_id, 
      conteudo_id, 
      platforms, 
      caption, 
      media_urls = [], 
      hashtags = []
    } = body

    // Support both old format (string[]) and new format (object[])
    const platformStrings = platforms.map(p => typeof p === 'string' ? p : p.platform)

    if (!cliente_id || !platforms || platforms.length === 0 || !caption) {
      return NextResponse.json({ 
        error: 'Missing required fields: cliente_id, platforms, caption' 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, org_id')
      .eq('id', cliente_id)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verify platforms connected
    const { data: connectedAccounts } = await admin
      .from('social_accounts')
      .select('platform, upload_post_user_id')
      .eq('cliente_id', cliente_id)
      .eq('status', 'active')
      .in('platform', platformStrings)

    const connectedPlatforms = (connectedAccounts || []).map(acc => acc.platform)
    const missingPlatforms = platformStrings.filter(p => !connectedPlatforms.includes(p))
    
    if (missingPlatforms.length > 0) {
      return NextResponse.json({ 
        error: `Plataformas não conectadas: ${missingPlatforms.join(', ')}` 
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    const username = buildUsername(membership.org_id, cliente_id)

    // Create the post record
    const { data: scheduledPost, error: insertError } = await admin
      .from('scheduled_posts')
      .insert({
        org_id: membership.org_id,
        cliente_id,
        conteudo_id,
        platforms: JSON.stringify(platformStrings),
        caption,
        media_urls,
        hashtags,
        scheduled_at: now,
        status: 'publishing',
        created_by: user.id
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating post record:', insertError)
      return NextResponse.json({ error: 'Erro ao publicar post' }, { status: 500 })
    }

    // Determine media type and call appropriate Upload-Post endpoint
    const fullCaption = hashtags.length > 0 
      ? `${caption}\n\n${hashtags.join(' ')}` 
      : caption

    const uploadPostPlatforms = platformStrings
      .map(p => PLATFORM_MAP[p])
      .filter(Boolean)

    let publishResponse: any = null
    let publishError: string | null = null

    try {
      if (media_urls.length > 0 && media_urls.some(isVideoUrl)) {
        // Video upload
        const videoUrl = media_urls.find(isVideoUrl)!
        const formData = new FormData()
        
        // Fetch the video file
        const videoResponse = await fetch(videoUrl)
        const videoBlob = await videoResponse.blob()
        formData.append('video', videoBlob, 'video.mp4')
        formData.append('title', fullCaption)
        formData.append('user', username)
        uploadPostPlatforms.forEach(p => formData.append('platform[]', p))

        const res = await fetch(`${UPLOAD_POST_API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Apikey ${UPLOAD_POST_API_KEY}` },
          body: formData,
        })
        publishResponse = await res.json()
        if (!res.ok) publishError = publishResponse.message || `HTTP ${res.status}`
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
          headers: { 'Authorization': `Apikey ${UPLOAD_POST_API_KEY}` },
          body: formData,
        })
        publishResponse = await res.json()
        if (!res.ok) publishError = publishResponse.message || `HTTP ${res.status}`
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
        if (!res.ok) publishError = publishResponse.message || `HTTP ${res.status}`
      }
    } catch (err: any) {
      publishError = err.message
      console.error('Upload-Post API error:', err)
    }

    // Update post record
    const status = publishError ? 'failed' : 'published'
    const { data: publishedPost } = await admin
      .from('scheduled_posts')
      .update({
        status,
        published_at: publishError ? null : now,
        upload_post_id: publishResponse?.id || null,
        upload_post_response: publishResponse || { error: publishError },
      })
      .eq('id', scheduledPost.id)
      .select('*')
      .single()

    if (publishError) {
      return NextResponse.json({ 
        error: `Erro ao publicar: ${publishError}`,
        data: publishedPost,
      }, { status: 502 })
    }

    return NextResponse.json({ 
      data: publishedPost,
      publish_response: publishResponse,
      message: 'Post publicado com sucesso!'
    })
  } catch (error: any) {
    console.error('Publish now error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
