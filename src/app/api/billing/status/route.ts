import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { PLANS, PlanId, checkLimit } from '@/types/billing'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get user's organization with subscription info
    const { data: member } = await supabase
      .from('organization_members')
      .select(`
        organization:organizations(
          id,
          name,
          plan_id,
          subscription_status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          trial_end
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (!member?.organization) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    const org = member.organization as any
    const planId = org.plan_id as PlanId || 'starter'
    const plan = PLANS[planId]

    // Get current usage
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    // Count clients
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    // Count users
    const { count: usersCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    // Count contents this month
    const startOfMonth = `${currentMonth}-01`
    const { count: contentsCount } = await supabase
      .from('contents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .gte('created_at', startOfMonth)

    // Calculate limits
    const usage = {
      clients: {
        current: clientsCount || 0,
        limit: plan.limits.clients,
        allowed: checkLimit(plan, 'clients', clientsCount || 0).allowed,
      },
      users: {
        current: usersCount || 0,
        limit: plan.limits.users,
        allowed: checkLimit(plan, 'users', usersCount || 0).allowed,
      },
      contentsPerMonth: {
        current: contentsCount || 0,
        limit: plan.limits.contentsPerMonth,
        allowed: checkLimit(plan, 'contentsPerMonth', contentsCount || 0).allowed,
      },
    }

    // Check subscription status
    const isActive = ['active', 'trialing'].includes(org.subscription_status)
    const isTrialing = org.subscription_status === 'trialing'
    const trialDaysLeft = isTrialing && org.trial_end 
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
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
