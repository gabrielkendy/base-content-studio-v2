import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = Math.max(0, parseInt(searchParams.get('page') || '0'))
    const typeFilter = searchParams.get('type') || ''
    const emailFilter = searchParams.get('email') || ''
    const pageSize = 25
    const from = page * pageSize
    const to = from + pageSize - 1

    const admin = createServiceClient()

    // Query auth.audit_log_entries via service role using schema() method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawLogs, count, error } = await (admin as any)
      .schema('auth')
      .from('audit_log_entries')
      .select('id, created_at, ip_address, user_agent, payload', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      // auth.audit_log_entries may not be accessible depending on Supabase plan
      return NextResponse.json({ logs: [], total: 0, error: error.message })
    }

    type RawEntry = {
      id: string
      created_at: string
      ip_address: string
      user_agent: string
      payload: Record<string, unknown> | string | null
    }

    const logs = ((rawLogs || []) as RawEntry[])
      .map((entry) => {
        let payload: Record<string, unknown> = {}
        if (typeof entry.payload === 'string') {
          try { payload = JSON.parse(entry.payload) } catch { payload = {} }
        } else if (entry.payload) {
          payload = entry.payload
        }

        const action =
          (payload.action as string) ||
          (payload.event as string) ||
          ''
        const actor =
          ((payload.actor_via_sso as Record<string, unknown>)?.actor_name as string) ||
          (payload.actor_name as string) ||
          ((payload.traits as Record<string, unknown>)?.email as string) ||
          ''

        return {
          id: entry.id,
          created_at: entry.created_at,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          action,
          actor_name: actor,
        }
      })
      .filter((entry) => {
        if (typeFilter && !entry.action.includes(typeFilter)) return false
        if (emailFilter && !entry.actor_name.toLowerCase().includes(emailFilter.toLowerCase())) return false
        return true
      })

    return NextResponse.json({ logs, total: count || 0, page, pageSize })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
