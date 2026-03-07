import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function isSystemAdmin(email: string): boolean {
  return ENV_ADMIN_EMAILS.includes(email.toLowerCase())
}

async function getUser() {
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
  return user
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createServiceClient()

    // Fetch from admin_access table (may not exist yet)
    let tableEntries: Array<{
      id: string; email: string; granted_by: string; created_at: string; active: boolean
    }> = []
    try {
      const { data } = await admin
        .from('admin_access')
        .select('id, email, granted_by, created_at, active')
        .order('created_at', { ascending: false })
      tableEntries = data || []
    } catch {
      // Table doesn't exist yet — return env entries only
    }

    // Add env-based entries as virtual rows (read-only)
    const tableEmails = new Set(tableEntries.map((e) => e.email.toLowerCase()))
    const envEntries = ENV_ADMIN_EMAILS.filter((e) => !tableEmails.has(e)).map((email) => ({
      id: `env:${email}`,
      email,
      granted_by: '',
      created_at: '',
      active: true,
      via_env: true,
    }))

    return NextResponse.json({
      entries: [
        ...envEntries,
        ...tableEntries.map((e) => ({ ...e, via_env: false })),
      ],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, grantedBy } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const admin = createServiceClient()
    const { data, error } = await admin
      .from('admin_access')
      .insert({ email: email.toLowerCase(), granted_by: grantedBy || user.email, active: true })
      .select()
      .single()

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabela admin_access não existe. Execute a migration SQL.' },
          { status: 500 }
        )
      }
      throw error
    }

    return NextResponse.json({ entry: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id, active } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const admin = createServiceClient()
    const { error } = await admin.from('admin_access').update({ active }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
