import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const clienteSlug = searchParams.get('clienteSlug')
    const platform = searchParams.get('platform')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!clienteId && !clienteSlug) {
      return NextResponse.json({ error: 'clienteId or clienteSlug is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Resolve client ID
    let resolvedClienteId = clienteId
    if (!resolvedClienteId && clienteSlug) {
      const { data: cliente } = await admin
        .from('clientes')
        .select('id')
        .eq('slug', clienteSlug)
        .eq('org_id', membership.org_id)
        .single()
      
      if (!cliente) {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
      }
      resolvedClienteId = cliente.id
    }

    // Calculate date range
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    // Build query
    let query = admin
      .from('analytics_snapshots')
      .select('*')
      .eq('cliente_id', resolvedClienteId!)
      .gte('snapshot_date', fromDateStr)
      .order('snapshot_date', { ascending: true })

    if (platform) {
      query = query.eq('platform', platform)
    }

    const { data: snapshots, error } = await query

    if (error) {
      console.error('History query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      snapshots: snapshots || [],
      days,
      platform: platform || 'all',
    })
  } catch (error: any) {
    console.error('Analytics history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
