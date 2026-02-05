import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ensureProfile, generateJwtUrl, buildUsername } from '@/lib/upload-post'

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

    const { clienteSlug } = await request.json()
    
    if (!clienteSlug) {
      return NextResponse.json({ error: 'clienteSlug is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Get client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('slug', clienteSlug)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Build consistent username (same as schedule uses)
    const username = buildUsername(membership.org_id, cliente.id, cliente.slug)

    console.log('=== CONNECT-URL DEBUG ===')
    console.log('clienteSlug:', clienteSlug)
    console.log('Generated username:', username)

    // Ensure profile exists
    const profileResult = await ensureProfile(username)
    if (!profileResult.success) {
      console.error('Failed to ensure profile:', profileResult.error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Generate JWT link
    const jwtResult = await generateJwtUrl({
      username,
      connect_title: `Conectar Redes - ${cliente.nome}`,
      connect_description: 'Conecte suas redes para agendar publicações automaticamente',
      platforms: ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin'],
      show_calendar: false,
    })

    if (!jwtResult.success || !jwtResult.access_url) {
      console.error('Upload-Post JWT error:', jwtResult.error)
      return NextResponse.json({ error: 'Failed to generate connect URL' }, { status: 500 })
    }

    return NextResponse.json({ 
      url: jwtResult.access_url,
      username,
    })
  } catch (error) {
    console.error('Connect URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
