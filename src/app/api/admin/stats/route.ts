import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const PLAN_PRICES: Record<string, number> = {
  starter: 97,
  pro: 197,
  agency: 397,
}

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isSystemAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createServiceClient()

    // Pagination
    const { searchParams } = new URL(request.url)
    const page = Math.max(0, parseInt(searchParams.get('page') || '0') || 0)
    const pageSize = 20
    const from = page * pageSize
    const to = from + pageSize - 1

    // Fetch all organizations for stats
    const { data: allOrgs } = await admin
      .from('organizations')
      .select('id, plan, created_at')

    const orgs = allOrgs || []
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const totalOrganizations = orgs.length
    const activeSubscriptions = orgs.filter(o => o.plan && o.plan !== 'free' && o.plan !== '').length
    const trialUsers = orgs.filter(o => (!o.plan || o.plan === 'free') && o.created_at >= startOfMonth).length
    const newSignupsThisMonth = orgs.filter(o => o.created_at >= startOfMonth).length

    let mrr = 0
    for (const org of orgs) {
      if (org.plan && PLAN_PRICES[org.plan]) {
        mrr += PLAN_PRICES[org.plan]
      }
    }

    // Fetch paginated orgs with details
    const { data: pageOrgs } = await admin
      .from('organizations')
      .select('id, name, slug, plan, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!pageOrgs) {
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Fetch member counts
    const orgIds = pageOrgs.map(o => o.id)
    const [membersRes, clientesRes, conteudosRes, adminMembersRes] = await Promise.all([
      admin.from('members').select('org_id').eq('status', 'active').in('org_id', orgIds),
      admin.from('clientes').select('org_id').in('org_id', orgIds),
      admin.from('conteudos').select('org_id').in('org_id', orgIds),
      admin.from('members').select('org_id, user_id, display_name').eq('role', 'admin').eq('status', 'active').in('org_id', orgIds),
    ])

    // Build count maps
    const memberCounts: Record<string, number> = {}
    const clienteCounts: Record<string, number> = {}
    const conteudoCounts: Record<string, number> = {}
    const ownerMap: Record<string, { user_id: string; display_name: string }> = {}

    for (const m of membersRes.data || []) {
      memberCounts[m.org_id] = (memberCounts[m.org_id] || 0) + 1
    }
    for (const c of clientesRes.data || []) {
      clienteCounts[c.org_id] = (clienteCounts[c.org_id] || 0) + 1
    }
    for (const c of conteudosRes.data || []) {
      conteudoCounts[c.org_id] = (conteudoCounts[c.org_id] || 0) + 1
    }
    for (const m of adminMembersRes.data || []) {
      if (!ownerMap[m.org_id]) ownerMap[m.org_id] = m
    }

    // Get owner emails via auth admin
    const ownerUserIds = Object.values(ownerMap).map(m => m.user_id)
    const emailMap: Record<string, string> = {}
    await Promise.all(
      ownerUserIds.map(async (uid) => {
        const { data } = await admin.auth.admin.getUserById(uid)
        if (data?.user?.email) emailMap[uid] = data.user.email
      })
    )

    const organizations = pageOrgs.map(org => {
      const owner = ownerMap[org.id]
      const ownerEmail = owner ? (emailMap[owner.user_id] || owner.display_name) : '—'
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || null,
        created_at: org.created_at,
        members_count: memberCounts[org.id] || 0,
        clients_count: clienteCounts[org.id] || 0,
        contents_count: conteudoCounts[org.id] || 0,
        owner_email: ownerEmail,
      }
    })

    return NextResponse.json({
      stats: {
        totalOrganizations,
        activeSubscriptions,
        trialUsers,
        mrr,
        newSignupsThisMonth,
      },
      organizations,
      page,
      pageSize,
      total: totalOrganizations,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/admin/stats error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
