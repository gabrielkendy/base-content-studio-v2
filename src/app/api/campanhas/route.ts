import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { campanhaCreateSchema, validateCampanha } from '@/lib/validations/campanha'

// =====================================================
// GET /api/campanhas
// Lista campanhas (filtros: cliente_id, ano, status)
// =====================================================
export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id')
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')

    // Validar que cliente_id é obrigatório
    if (!clienteId) {
      return NextResponse.json({ error: 'cliente_id é obrigatório' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verificar se usuário tem acesso ao cliente
    const { data: cliente } = await admin
      .from('clientes')
      .select('org_id')
      .eq('id', clienteId)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', cliente.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Build query
    let query = admin
      .from('v_campanhas_stats')
      .select('*')
      .eq('cliente_id', clienteId)

    if (ano) {
      query = query.eq('ano', parseInt(ano))
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    query = query
      .order('ano', { ascending: false })
      .order('mes_inicio', { ascending: true })
      .order('prioridade', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar campanhas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// POST /api/campanhas
// Cria nova campanha
// =====================================================
export async function POST(request: NextRequest) {
  try {
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
    const validation = validateCampanha(campanhaCreateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error,
        issues: validation.issues 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verificar se usuário tem acesso ao cliente
    const { data: cliente } = await admin
      .from('clientes')
      .select('org_id')
      .eq('id', validation.data.cliente_id)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', cliente.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se é cliente (readonly)
    if (member.role === 'cliente') {
      return NextResponse.json({ error: 'Clientes não podem criar campanhas' }, { status: 403 })
    }

    // Criar campanha
    const { data, error } = await admin
      .from('campanhas')
      .insert({
        ...validation.data,
        org_id: cliente.org_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar campanha:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/campanhas error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
