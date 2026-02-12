import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// GET /api/campanhas/stats
// Retorna estatísticas do planejamento anual
// Query params: cliente_id, ano
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

    if (!clienteId) {
      return NextResponse.json({ error: 'cliente_id é obrigatório' }, { status: 400 })
    }

    if (!ano) {
      return NextResponse.json({ error: 'ano é obrigatório' }, { status: 400 })
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

    // Buscar stats da view
    const { data, error } = await admin
      .from('v_planejamento_anual')
      .select('*')
      .eq('cliente_id', clienteId)
      .eq('ano', parseInt(ano))
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Erro ao buscar stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Se não houver dados, retornar zeros
    if (!data) {
      return NextResponse.json({
        data: {
          cliente_id: clienteId,
          ano: parseInt(ano),
          total_campanhas: 0,
          planejadas: 0,
          em_andamento: 0,
          pausadas: 0,
          concluidas: 0,
          canceladas: 0,
          orcamento_total: 0,
          progresso_medio: 0,
        }
      })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas/stats error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
