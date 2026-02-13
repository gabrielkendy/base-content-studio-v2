import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Optimized endpoint for listing clientes with counts
 * Replaces N+1 queries with a single optimized query
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

    // 1. Get all clientes with content count in ONE query using Supabase's count
    const { data: clientes, error: clientesError } = await admin
      .from('clientes')
      .select(`
        *,
        conteudos:conteudos(count)
      `)
      .eq('org_id', orgId)
      .order('nome', { ascending: true })

    if (clientesError) {
      console.error('Error fetching clientes:', clientesError)
      return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
    }

    // 2. Get member_clients to check access (single query)
    const { data: memberClients } = await admin
      .from('member_clients')
      .select('cliente_id')
      .eq('org_id', orgId)

    const clienteIdsWithAccess = new Set((memberClients || []).map((mc: any) => mc.cliente_id))

    // 3. Transform data
    const result = (clientes || []).map((c: any) => ({
      ...c,
      _count: c.conteudos?.[0]?.count || 0,
      _hasAccess: clienteIdsWithAccess.has(c.id),
      conteudos: undefined, // Remove nested data
    }))

    return NextResponse.json({ 
      data: result,
      _meta: {
        total: result.length,
        optimized: true,
        queries: 2, // Instead of N+3
      }
    })

  } catch (error: any) {
    console.error('List clientes error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
