import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface SchedulePostRequest {
  cliente_id: string
  conteudo_id?: string
  platforms: Array<{ platform: string; format: string }> | string[]
  caption: string
  media_urls?: string[]
  hashtags?: string[]
  scheduled_at: string
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

    const body: SchedulePostRequest = await request.json()
    const { 
      cliente_id, 
      conteudo_id, 
      platforms, 
      caption, 
      media_urls = [], 
      hashtags = [], 
      scheduled_at 
    } = body

    // Support both old format (string[]) and new format (object[])
    const platformStrings = platforms.map(p => typeof p === 'string' ? p : p.platform)

    if (!cliente_id || !platforms || platforms.length === 0 || !scheduled_at || !caption) {
      return NextResponse.json({ 
        error: 'Missing required fields: cliente_id, platforms, caption, scheduled_at' 
      }, { status: 400 })
    }

    const scheduledDate = new Date(scheduled_at)
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Agendamento deve ser no futuro' 
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
      .select('platform')
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

    // Create scheduled post with full platform+format info
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
        scheduled_at,
        status: 'scheduled',
        created_by: user.id
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating scheduled post:', insertError)
      return NextResponse.json({ error: 'Erro ao agendar post' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: scheduledPost,
      message: 'Post agendado com sucesso!'
    })
  } catch (error: any) {
    console.error('Schedule post error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
