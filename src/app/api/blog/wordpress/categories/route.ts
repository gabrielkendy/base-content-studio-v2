import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// API: /api/blog/wordpress/categories
// Método: GET - Listar categorias do WordPress
// ============================================

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id')
    const clienteSlug = searchParams.get('cliente_slug')

    if (!clienteId && !clienteSlug) {
      return NextResponse.json({ 
        error: 'cliente_id ou cliente_slug obrigatório' 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar cliente
    let clienteQuery = admin
      .from('clientes')
      .select('id, nome, slug, wp_url, wp_user, wp_app_password')
      .eq('org_id', membership.org_id)

    if (clienteId) {
      clienteQuery = clienteQuery.eq('id', clienteId)
    } else {
      clienteQuery = clienteQuery.eq('slug', clienteSlug)
    }

    const { data: cliente, error: clienteError } = await clienteQuery.single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    if (!cliente.wp_url || !cliente.wp_user || !cliente.wp_app_password) {
      return NextResponse.json({ 
        error: 'WordPress não configurado para este cliente' 
      }, { status: 400 })
    }

    // Buscar categorias do WordPress
    const credentials = Buffer.from(`${cliente.wp_user}:${cliente.wp_app_password}`).toString('base64')
    
    const response = await fetch(`${cliente.wp_url}/wp-json/wp/v2/categories?per_page=100`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Erro ao buscar categorias: ${response.status}` 
      }, { status: 502 })
    }

    const categories = await response.json()

    return NextResponse.json({
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.count,
        parent: cat.parent,
      }))
    })
  } catch (error: any) {
    console.error('GET /api/blog/wordpress/categories error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
