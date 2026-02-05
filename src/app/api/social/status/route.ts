import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getProfile, parseSocialAccounts, buildUsername } from '@/lib/upload-post'

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const clienteSlug = searchParams.get('clienteSlug')
    
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

    // Build username (same as schedule uses)
    const username = buildUsername(membership.org_id, cliente.id, cliente.slug)

    // Get profile from Upload-Post
    const profileResult = await getProfile(username)

    if (!profileResult.success || !profileResult.profile) {
      // Profile doesn't exist yet - return empty accounts
      return NextResponse.json({
        username,
        exists: false,
        accounts: [],
      })
    }

    // Parse social accounts
    const accounts = parseSocialAccounts(profileResult.profile.social_accounts)

    return NextResponse.json({
      username,
      exists: true,
      accounts,
      created_at: profileResult.profile.created_at,
    })
  } catch (error) {
    console.error('Social status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
