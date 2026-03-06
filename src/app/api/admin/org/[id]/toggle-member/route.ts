import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { memberId, active } = body as { memberId: string; active: boolean }

    if (!memberId || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { error } = await admin
      .from('members')
      .update({ status: active ? 'active' : 'inactive' })
      .eq('id', memberId)
      .eq('org_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/admin/org/[id]/toggle-member error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
