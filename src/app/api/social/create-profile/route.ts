import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createProfile, buildUsername } from '@/lib/upload-post'

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
    if (!clienteSlug) return NextResponse.json({ error: 'clienteSlug is required' }, { status: 400 })

    const admin = createServiceClient()

    // Get client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, org_id')
      .eq('slug', clienteSlug)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const username = buildUsername(membership.org_id, cliente.id)
    const result = await createProfile(username)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro ao criar perfil' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      username,
      profile: result.profile,
    })
  } catch (error: any) {
    console.error('Create profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
