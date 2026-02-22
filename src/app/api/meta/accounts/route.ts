import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getAdAccounts } from '@/lib/meta-ads'

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const accounts = await getAdAccounts()
    
    return NextResponse.json({
      success: true,
      accounts: accounts.map(acc => ({
        id: acc.id,
        account_id: acc.account_id,
        name: acc.name,
        currency: acc.currency,
        status: acc.account_status === 1 ? 'active' : 'inactive',
      })),
    })
  } catch (error: any) {
    console.error('Error fetching ad accounts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
