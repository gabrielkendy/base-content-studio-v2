import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { campanhaConteudosSchema, validateCampanha } from '@/lib/validations/campanha'

type RouteContext = { params: Promise<{ id: string }> }

// =====================================================
// GET /api/campanhas/[id]/conteudos
// Lista conteúdos vinculados à campanha
// =====================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Auth check
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const admin = createServiceClient()

    // Buscar campanha
    const { data: campanha } = await admin
      .from('campanhas')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (!campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', campanha.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar conteúdos vinculados
    const { data, error } = await admin
      .from('campanha_conteudos')
      .select(`
        ordem,
        conteudo:conteudos(
          id, 
          titulo, 
          tipo, 
          status, 
          data_publicacao,
          thumbnail_url
        )
      `)
      .eq('campanha_id', id)
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Erro ao buscar conteúdos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten os conteúdos
    const conteudos = data?.map(d => ({
      ...d.conteudo,
      ordem: d.ordem
    })) || []

    return NextResponse.json({ data: conteudos })
  } catch (err: any) {
    console.error('GET /api/campanhas/[id]/conteudos error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// PUT /api/campanhas/[id]/conteudos
// Atualiza vínculos de conteúdos (substitui todos)
// =====================================================
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Auth check
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    
    // Validate
    const validation = validateCampanha(campanhaConteudosSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error,
        issues: validation.issues 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar campanha
    const { data: campanha } = await admin
      .from('campanhas')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (!campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', campanha.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (member.role === 'cliente') {
      return NextResponse.json({ error: 'Clientes não podem vincular conteúdos' }, { status: 403 })
    }

    // Remover vínculos existentes
    await admin
      .from('campanha_conteudos')
      .delete()
      .eq('campanha_id', id)

    // Criar novos vínculos
    if (validation.data.conteudo_ids.length > 0) {
      const vinculos = validation.data.conteudo_ids.map((conteudoId, index) => ({
        campanha_id: id,
        conteudo_id: conteudoId,
        ordem: index,
      }))

      const { error } = await admin
        .from('campanha_conteudos')
        .insert(vinculos)

      if (error) {
        console.error('Erro ao vincular conteúdos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: validation.data.conteudo_ids.length 
    })
  } catch (err: any) {
    console.error('PUT /api/campanhas/[id]/conteudos error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// POST /api/campanhas/[id]/conteudos
// Adiciona um conteúdo à campanha (sem remover existentes)
// =====================================================
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    // Auth check
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { conteudo_id } = body

    if (!conteudo_id) {
      return NextResponse.json({ error: 'conteudo_id é obrigatório' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar campanha
    const { data: campanha } = await admin
      .from('campanhas')
      .select('id, org_id')
      .eq('id', id)
      .single()

    if (!campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', campanha.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (member.role === 'cliente') {
      return NextResponse.json({ error: 'Clientes não podem vincular conteúdos' }, { status: 403 })
    }

    // Buscar próxima ordem
    const { data: lastVinculo } = await admin
      .from('campanha_conteudos')
      .select('ordem')
      .eq('campanha_id', id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single()

    const novaOrdem = (lastVinculo?.ordem ?? -1) + 1

    // Criar vínculo
    const { data, error } = await admin
      .from('campanha_conteudos')
      .insert({
        campanha_id: id,
        conteudo_id,
        ordem: novaOrdem,
      })
      .select()
      .single()

    if (error) {
      // Se já existe, ignorar (upsert behavior)
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ success: true, message: 'Conteúdo já vinculado' })
      }
      console.error('Erro ao vincular conteúdo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/campanhas/[id]/conteudos error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
