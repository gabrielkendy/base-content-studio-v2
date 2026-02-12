import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

// =====================================================
// GET /api/campanhas/[id]/historico
// Lista histórico de alterações da campanha
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Buscar histórico
    const { data, error } = await admin
      .from('campanha_historico')
      .select('*')
      .eq('campanha_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas/[id]/historico error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
