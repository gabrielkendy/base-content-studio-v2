import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// GET /api/campanhas/ativas
// Retorna campanhas ativas do mês atual (para dashboard)
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

    const admin = createServiceClient()

    // Buscar membership do usuário para pegar org_id
    const { data: member } = await admin
      .from('members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Usuário sem organização' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const tipo = searchParams.get('tipo') // 'ativas' | 'proximas' | 'todas'

    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()

    let query = admin
      .from('campanhas')
      .select(`
        *,
        cliente:clientes(id, nome, slug, logo_url)
      `)
      .eq('org_id', member.org_id)
      .eq('ano', anoAtual)

    if (tipo === 'proximas') {
      // Próximas: começam no próximo mês
      query = query
        .eq('status', 'planejada')
        .eq('mes_inicio', mesAtual + 1)
    } else if (tipo === 'ativas') {
      // Ativas: mês atual está dentro do período
      query = query
        .in('status', ['planejada', 'em_andamento'])
        .lte('mes_inicio', mesAtual)
        .gte('mes_fim', mesAtual)
    } else {
      // Todas do ano em andamento ou planejadas
      query = query.in('status', ['planejada', 'em_andamento'])
    }

    query = query
      .order('prioridade', { ascending: false })
      .order('mes_inicio', { ascending: true })
      .limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar campanhas ativas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas/ativas error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
