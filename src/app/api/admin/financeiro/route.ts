import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const PLAN_PRICES: Record<string, number> = {
  starter: 97,
  pro: 197,
  agency: 397,
}

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

export async function GET() {
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

    const admin = createServiceClient()
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name, plan, created_at')
      .order('created_at', { ascending: false })

    const allOrgs = orgs || []
    const paidOrgs = allOrgs.filter((o) => o.plan && PLAN_PRICES[o.plan])
    const mrr = paidOrgs.reduce((sum, o) => sum + (PLAN_PRICES[o.plan!] || 0), 0)
    const arr = mrr * 12
    const conversionRate = allOrgs.length > 0 ? (paidOrgs.length / allOrgs.length) * 100 : 0

    // By plan breakdown
    const planMap: Record<string, { count: number; monthly: number }> = {}
    for (const org of paidOrgs) {
      const p = org.plan!
      if (!planMap[p]) planMap[p] = { count: 0, monthly: 0 }
      planMap[p].count++
      planMap[p].monthly += PLAN_PRICES[p] || 0
    }
    const byPlan = Object.entries(planMap).map(([plan, { count, monthly }]) => ({
      plan,
      count,
      monthlyRevenue: monthly,
    }))

    const orgList = paidOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      created_at: o.created_at,
      monthly: PLAN_PRICES[o.plan!] || 0,
    }))

    return NextResponse.json({
      mrr,
      arr,
      paidOrgs: paidOrgs.length,
      totalOrgs: allOrgs.length,
      conversionRate,
      byPlan,
      orgs: orgList,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
