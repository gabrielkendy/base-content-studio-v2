import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// =====================================================
// GET /api/campanhas/notificacoes
// Lista notificações de campanhas
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

    // Buscar membership
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
    const pendentes = searchParams.get('pendentes') === 'true'
    const campanhaId = searchParams.get('campanha_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = admin
      .from('campanha_notificacoes')
      .select(`
        *,
        campanha:campanhas(id, nome, tipo, cor, cliente_id)
      `)
      .eq('org_id', member.org_id)

    if (pendentes) {
      query = query
        .eq('enviada', false)
        .lte('enviar_em', new Date().toISOString())
    }

    if (campanhaId) {
      query = query.eq('campanha_id', campanhaId)
    }

    query = query
      .order('enviar_em', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar notificações:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas/notificacoes error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// POST /api/campanhas/notificacoes
// Marcar notificações como enviadas
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

    const body = await request.json()
    const { notificacao_ids, action } = body

    if (action !== 'marcar_enviadas' || !Array.isArray(notificacao_ids)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Marcar como enviadas
    const { error } = await admin
      .from('campanha_notificacoes')
      .update({ 
        enviada: true, 
        enviada_em: new Date().toISOString() 
      })
      .in('id', notificacao_ids)

    if (error) {
      console.error('Erro ao marcar notificações:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: notificacao_ids.length })
  } catch (err: any) {
    console.error('POST /api/campanhas/notificacoes error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
