import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

async function getAuthUser() {
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
  return supabaseAuth.auth.getUser()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { data: { user } } = await getAuthUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const admin = createServiceClient()

    const [orgRes, membersRes, clientesRes, conteudosRes] = await Promise.all([
      admin.from('organizations').select('id, name, slug, plan, created_at').eq('id', id).single(),
      admin.from('members').select('id, user_id, display_name, role, status').eq('org_id', id).order('created_at', { ascending: true }),
      admin.from('clientes').select('id').eq('org_id', id),
      admin.from('conteudos').select('id').eq('org_id', id),
    ])

    if (orgRes.error || !orgRes.data) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch emails for members
    const members = membersRes.data || []
    const emailMap: Record<string, string> = {}
    await Promise.all(
      members.map(async (m) => {
        const { data } = await admin.auth.admin.getUserById(m.user_id)
        if (data?.user?.email) emailMap[m.user_id] = data.user.email
      })
    )

    const membersWithEmail = members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      email: emailMap[m.user_id] || m.display_name,
      role: m.role,
      status: m.status,
    }))

    return NextResponse.json({
      org: orgRes.data,
      members: membersWithEmail,
      usage: {
        clients: clientesRes.data?.length || 0,
        contents: conteudosRes.data?.length || 0,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/admin/org/[id] GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
