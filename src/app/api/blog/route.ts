import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// API: /api/blog
// Métodos: GET (listar), POST (criar artigo)
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

// GET: Listar artigos de blog de um cliente
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

    const admin = createServiceClient()

    // Buscar cliente
    let clienteQuery = admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('org_id', membership.org_id)

    if (clienteId) {
      clienteQuery = clienteQuery.eq('id', clienteId)
    } else if (clienteSlug) {
      clienteQuery = clienteQuery.eq('slug', clienteSlug)
    } else {
      return NextResponse.json({ error: 'cliente_id ou cliente_slug obrigatório' }, { status: 400 })
    }

    const { data: cliente, error: clienteError } = await clienteQuery.single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Buscar artigos de blog
    const { data: artigos, error: artigosError } = await admin
      .from('conteudos')
      .select('*')
      .eq('empresa_id', cliente.id)
      .eq('categoria', 'blog')
      .order('created_at', { ascending: false })

    if (artigosError) {
      console.error('Erro ao buscar artigos:', artigosError)
      return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 })
    }

    return NextResponse.json({
      cliente,
      artigos: artigos || [],
      total: artigos?.length || 0
    })
  } catch (error: any) {
    console.error('GET /api/blog error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Criar novo artigo de blog
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      cliente_id,
      cliente_slug,
      titulo,
      conteudo_html,
      imagem_url,
      status = 'rascunho'
    } = body

    if (!titulo || !conteudo_html) {
      return NextResponse.json({ 
        error: 'titulo e conteudo_html são obrigatórios' 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar cliente
    let clienteQuery = admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('org_id', membership.org_id)

    if (cliente_id) {
      clienteQuery = clienteQuery.eq('id', cliente_id)
    } else if (cliente_slug) {
      clienteQuery = clienteQuery.eq('slug', cliente_slug)
    } else {
      return NextResponse.json({ error: 'cliente_id ou cliente_slug obrigatório' }, { status: 400 })
    }

    const { data: cliente, error: clienteError } = await clienteQuery.single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Criar artigo
    const now = new Date()
    const { data: artigo, error: insertError } = await admin
      .from('conteudos')
      .insert({
        org_id: membership.org_id,
        empresa_id: cliente.id,
        titulo,
        descricao: conteudo_html,
        categoria: 'blog',
        tipo: 'artigo',
        status,
        midia_urls: imagem_url ? [imagem_url] : [],
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Erro ao criar artigo:', insertError)
      return NextResponse.json({ error: 'Erro ao criar artigo' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      artigo,
      message: 'Artigo criado com sucesso!'
    })
  } catch (error: any) {
    console.error('POST /api/blog error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
