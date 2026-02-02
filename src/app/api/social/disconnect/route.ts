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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { accountId, clienteSlug } = await request.json()
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

    const admin = createServiceClient()

    // Verify the account belongs to a client in the user's org
    const { data: account } = await admin
      .from('social_accounts')
      .select('id, cliente_id, platform')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    // Verify client belongs to org
    const { data: cliente } = await admin
      .from('clientes')
      .select('id, org_id')
      .eq('id', account.cliente_id)
      .eq('org_id', membership.org_id)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Mark as disconnected in Supabase
    // Note: Upload-Post doesn't have per-platform disconnect API
    // User can reconnect via JWT URL if needed
    const { error: updateError } = await admin
      .from('social_accounts')
      .update({ status: 'disconnected' })
      .eq('id', accountId)

    if (updateError) {
      return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${account.platform} desconectado com sucesso`,
    })
  } catch (error: any) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
