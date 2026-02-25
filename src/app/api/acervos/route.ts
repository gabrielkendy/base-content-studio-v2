import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API de Acervos - CRUD completo
 * GET: Lista acervos (com filtro por cliente opcional)
 * POST: Criar novo acervo
 */

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

// GET - Listar acervos
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

    const admin = createServiceClient()
    const orgId = membership.org_id
    
    // Parâmetros de filtro
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id')

    // Query base
    let query = admin
      .from('acervos')
      .select(`
        *,
        cliente:clientes(id, nome, slug)
      `)
      .eq('org_id', orgId)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false })

    // Filtro por cliente
    if (clienteId) {
      query = query.eq('cliente_id', clienteId)
    }

    const { data: acervos, error } = await query

    if (error) {
      console.error('Error fetching acervos:', error)
      return NextResponse.json({ error: 'Erro ao buscar acervos' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: acervos,
      _meta: {
        total: acervos?.length || 0
      }
    })

  } catch (error: any) {
    console.error('List acervos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Criar acervo
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

    const admin = createServiceClient()
    const orgId = membership.org_id
    
    const body = await request.json()
    const { 
      cliente_id, 
      titulo, 
      slug, 
      descricao, 
      icone, 
      tipo_origem,
      drive_folder_id,
      drive_folder_url,
      visibilidade,
      ordem 
    } = body

    // Validações
    if (!cliente_id) {
      return NextResponse.json({ error: 'cliente_id é obrigatório' }, { status: 400 })
    }
    if (!titulo) {
      return NextResponse.json({ error: 'titulo é obrigatório' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'slug é obrigatório' }, { status: 400 })
    }

    // Verificar se cliente pertence à org
    const { data: cliente } = await admin
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .eq('org_id', orgId)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar slug único para o cliente
    const { data: existing } = await admin
      .from('acervos')
      .select('id')
      .eq('cliente_id', cliente_id)
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Já existe um acervo com esse slug para este cliente' }, { status: 400 })
    }

    // Extrair folder_id do URL se fornecido
    let folderId = drive_folder_id
    if (!folderId && drive_folder_url) {
      // Extrair ID do formato: https://drive.google.com/drive/folders/FOLDER_ID
      const match = drive_folder_url.match(/folders\/([a-zA-Z0-9_-]+)/)
      if (match) {
        folderId = match[1]
      }
    }

    // Criar acervo
    const { data: acervo, error } = await admin
      .from('acervos')
      .insert({
        org_id: orgId,
        cliente_id,
        titulo,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        descricao: descricao || null,
        icone: icone || '📁',
        tipo_origem: tipo_origem || 'drive',
        drive_folder_id: folderId || null,
        drive_folder_url: drive_folder_url || null,
        visibilidade: visibilidade || 'publico',
        ordem: ordem || 0,
        ativo: true
      })
      .select(`
        *,
        cliente:clientes(id, nome, slug)
      `)
      .single()

    if (error) {
      console.error('Error creating acervo:', error)
      return NextResponse.json({ error: 'Erro ao criar acervo' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: acervo,
      message: 'Acervo criado com sucesso'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create acervo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
