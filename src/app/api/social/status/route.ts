import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import * as UP from '@/lib/upload-post-v2'

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

    // Usar a mesma lógica da v2: username = slug do cliente
    const username = cliente.slug

    // Verificar conexões usando a mesma função da v2
    const contas = await UP.verificarConexoes(username)

    // Converter formato v2 para formato esperado pelo agendar post
    const accounts = contas
      .filter((c: any) => c.conectada)
      .map((c: any) => ({
        id: `${c.plataforma}_${username}`,
        platform: c.plataforma,
        profile_id: username,
        profile_name: c.nome || c.plataforma,
        profile_avatar: c.avatar || null,
        status: 'connected',
      }))

    return NextResponse.json({
      success: true,
      username,
      exists: true,
      accounts,
    })
  } catch (error) {
    console.error('Social status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
