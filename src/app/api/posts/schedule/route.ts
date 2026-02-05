import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buildUsername } from '@/lib/upload-post'

const UPLOAD_POST_API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY!

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const body = await request.json()
    const { 
      conteudoId, 
      platforms, 
      scheduledDate, 
      scheduledTime,
      timezone = 'America/Sao_Paulo',
      title,
      description,
      firstComment,
    } = body

    if (!conteudoId) return NextResponse.json({ error: 'conteudoId is required' }, { status: 400 })
    if (!platforms || platforms.length === 0) return NextResponse.json({ error: 'platforms is required' }, { status: 400 })
    if (!scheduledDate || !scheduledTime) return NextResponse.json({ error: 'scheduledDate and scheduledTime are required' }, { status: 400 })

    const admin = createServiceClient()

    // Get conteúdo with cliente
    const { data: conteudo, error: contErr } = await admin
      .from('conteudos')
      .select('*, empresa:clientes(id, nome, slug, org_id)')
      .eq('id', conteudoId)
      .eq('org_id', membership.org_id)
      .single()

    if (contErr || !conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const cliente = conteudo.empresa as any
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Build Upload-Post username
    const username = buildUsername(membership.org_id, cliente.id, cliente.slug)

    // Get media URLs
    const mediaUrls: string[] = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
    if (!mediaUrls.length) {
      return NextResponse.json({ error: 'Nenhuma mídia para publicar' }, { status: 400 })
    }

    // Build ISO date
    const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`

    // Prepare Upload-Post request
    const uploadPostBody: Record<string, any> = {
      user: username,
      title: title || conteudo.legenda || conteudo.titulo || '',
      scheduled_date: scheduledDateTime,
      timezone,
      async_upload: true,
    }

    // Add platforms
    platforms.forEach((p: string) => {
      uploadPostBody[`platform[]`] = uploadPostBody[`platform[]`] || []
      if (!Array.isArray(uploadPostBody[`platform[]`])) {
        uploadPostBody[`platform[]`] = [uploadPostBody[`platform[]`]]
      }
      uploadPostBody[`platform[]`].push(p)
    })

    // Platform-specific fields
    if (platforms.includes('instagram')) {
      uploadPostBody.instagram_title = title || conteudo.legenda
    }
    if (platforms.includes('tiktok')) {
      uploadPostBody.tiktok_title = title || conteudo.legenda
    }
    if (platforms.includes('youtube')) {
      uploadPostBody.youtube_title = conteudo.titulo
      uploadPostBody.youtube_description = description || conteudo.descricao || conteudo.legenda
    }
    if (platforms.includes('facebook')) {
      uploadPostBody.facebook_title = title || conteudo.legenda
    }
    if (platforms.includes('linkedin')) {
      uploadPostBody.linkedin_title = title || conteudo.legenda
      uploadPostBody.linkedin_description = description || conteudo.descricao
    }

    // First comment
    if (firstComment) {
      uploadPostBody.first_comment = firstComment
    }

    // Determine if video or image(s)
    const firstMedia = mediaUrls[0]
    const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(firstMedia)

    // Build form data
    const formData = new FormData()
    
    // Add all simple fields
    formData.append('user', username)
    formData.append('title', uploadPostBody.title)
    formData.append('scheduled_date', scheduledDateTime)
    formData.append('timezone', timezone)
    formData.append('async_upload', 'true')

    // Add platforms
    platforms.forEach((p: string) => {
      formData.append('platform[]', p)
    })

    // Add platform-specific
    if (uploadPostBody.instagram_title) formData.append('instagram_title', uploadPostBody.instagram_title)
    if (uploadPostBody.tiktok_title) formData.append('tiktok_title', uploadPostBody.tiktok_title)
    if (uploadPostBody.youtube_title) formData.append('youtube_title', uploadPostBody.youtube_title)
    if (uploadPostBody.youtube_description) formData.append('youtube_description', uploadPostBody.youtube_description)
    if (uploadPostBody.facebook_title) formData.append('facebook_title', uploadPostBody.facebook_title)
    if (uploadPostBody.linkedin_title) formData.append('linkedin_title', uploadPostBody.linkedin_title)
    if (uploadPostBody.linkedin_description) formData.append('linkedin_description', uploadPostBody.linkedin_description)
    if (firstComment) formData.append('first_comment', firstComment)

    // Add media
    if (isVideo) {
      // Video upload via URL
      formData.append('video', firstMedia)
    } else {
      // Image(s) - for carousels, add multiple
      for (const url of mediaUrls) {
        formData.append('photos[]', url)
      }
    }

    console.log('=== SCHEDULE POST DEBUG ===')
    console.log('Username:', username)
    console.log('Platforms:', platforms)
    console.log('Scheduled:', scheduledDateTime)
    console.log('Media count:', mediaUrls.length)
    console.log('Is video:', isVideo)

    // Call Upload-Post API
    const response = await fetch(`${UPLOAD_POST_API_URL}/api/upload${isVideo ? '' : '_photos'}`, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${UPLOAD_POST_API_KEY}`,
      },
      body: formData,
    })

    const result = await response.json()
    console.log('Upload-Post response:', response.status, result)

    if (!response.ok) {
      return NextResponse.json({ 
        error: result.message || result.error || 'Erro ao agendar',
        details: result
      }, { status: response.status })
    }

    // Update conteúdo status
    await admin
      .from('conteudos')
      .update({
        status: 'agendado',
        data_publicacao: scheduledDate,
        hora_publicacao: scheduledTime,
        canais: platforms,
        scheduled_job_id: result.job_id || result.request_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conteudoId)

    return NextResponse.json({
      success: true,
      job_id: result.job_id || result.request_id,
      scheduled_date: scheduledDateTime,
      platforms,
    })

  } catch (err: any) {
    console.error('Schedule error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
