import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface PublishNowRequest {
  cliente_id: string
  conteudo_id?: string
  platforms: string[]
  caption: string
  media_urls?: string[]
  hashtags?: string[]
}

// Get authenticated user
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

// Get user's membership (org_id + role)
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

    // Validate required fields
    if (!cliente_id || !platforms || platforms.length === 0 || !caption) {
      return NextResponse.json({ 
        error: 'Missing required fields: cliente_id, platforms, caption' 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify client exists and user has access
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, org_id')
      .eq('id', cliente_id)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verify platforms are connected for this client
    const { data: connectedAccounts } = await admin
      .from('social_accounts')
      .select('platform, upload_post_user_id')
      .eq('cliente_id', cliente_id)
      .eq('status', 'active')
      .in('platform', platforms)

    const connectedPlatforms = (connectedAccounts || []).map(acc => acc.platform)
    const missingPlatforms = platforms.filter(p => !connectedPlatforms.includes(p))
    
    if (missingPlatforms.length > 0) {
      return NextResponse.json({ 
        error: `Plataformas não conectadas: ${missingPlatforms.join(', ')}` 
      }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Create the post record (to track it)
    const { data: scheduledPost, error: insertError } = await admin
      .from('scheduled_posts')
      .insert({
        org_id: membership.org_id,
        cliente_id,
        conteudo_id,
        platforms: JSON.stringify(platforms),
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

    // TODO: When Upload-Post API key is available, publish immediately
    // For now, simulate immediate publishing
    const mockPublishResponse = {
      id: `up_${scheduledPost.id}`,
      status: 'published',
      published_at: now,
      platforms: platforms.map(platform => ({
        platform,
        status: 'published',
        post_id: `${platform}_${Date.now()}`,
        url: `https://${platform}.com/p/${Date.now()}`
      }))
    }

    // Update post as published
    const { data: publishedPost } = await admin
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: now,
        upload_post_id: mockPublishResponse.id,
        upload_post_response: mockPublishResponse,
        published_urls: mockPublishResponse.platforms.map(p => ({ platform: p.platform, url: p.url }))
      })
      .eq('id', scheduledPost.id)
      .select('*')
      .single()

    return NextResponse.json({ 
      data: publishedPost,
      publish_response: mockPublishResponse,
      message: 'Post publicado com sucesso!'
    })
  } catch (error: any) {
    console.error('Publish now error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}