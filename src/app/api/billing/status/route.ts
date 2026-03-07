import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PLANS, PlanId, checkLimit } from '@/types/billing'
import { getAuthUser, getUserOrgId } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const orgId = await getUserOrgId(user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    const admin = createServiceClient()
    const { data: org } = await admin
      .from('organizations')
      .select('id, name, plan_id, subscription_status, current_period_start, current_period_end, cancel_at_period_end, trial_end')
      .eq('id', orgId)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    const planId = (org.plan_id as PlanId) || 'starter'
    const plan = PLANS[planId] || PLANS.starter

    const currentMonth = new Date().toISOString().slice(0, 7)
    const startOfMonth = `${currentMonth}-01`

    const [clientsRes, usersRes, contentsRes] = await Promise.all([
      admin.from('clientes').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      admin.from('members').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
      admin.from('conteudos').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', startOfMonth),
    ])

    const usage = {
      clients: {
        current: clientsRes.count || 0,
        limit: plan.limits.clients,
        allowed: checkLimit(plan, 'clients', clientsRes.count || 0).allowed,
      },
      users: {
        current: usersRes.count || 0,
        limit: plan.limits.users,
        allowed: checkLimit(plan, 'users', usersRes.count || 0).allowed,
      },
      contentsPerMonth: {
        current: contentsRes.count || 0,
        limit: plan.limits.contentsPerMonth,
        allowed: checkLimit(plan, 'contentsPerMonth', contentsRes.count || 0).allowed,
      },
    }

    const isActive = ['active', 'trialing'].includes(org.subscription_status || '')
    const isTrialing = org.subscription_status === 'trialing'
    const trialDaysLeft =
      isTrialing && org.trial_end
        ? Math.max(0, Math.ceil((new Date(org.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0

    return NextResponse.json({
      plan: {
        id: planId,
        name: plan.name,
        features: plan.features,
        limits: plan.limits,
      },
      subscription: {
        status: org.subscription_status,
        isActive,
        isTrialing,
        trialDaysLeft,
        currentPeriodEnd: org.current_period_end,
        cancelAtPeriodEnd: org.cancel_at_period_end,
      },
      usage,
      canCreateClient: usage.clients.allowed,
      canAddUser: usage.users.allowed,
      canCreateContent: usage.contentsPerMonth.allowed,
    })
  } catch (err) {
    console.error('Billing status error:', err)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
