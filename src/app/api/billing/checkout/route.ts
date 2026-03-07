import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getPriceId, PlanName } from '@/lib/stripe'
import { getInternalAppUrl, getPublicBaseUrl } from '@/lib/approval-notifications'
import { getAuthUser, getUserOrgId } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const orgId = await getUserOrgId(user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { planId, interval = 'month' } = body as { planId: PlanName; interval: 'month' | 'year' }

    if (!planId || !['starter', 'pro', 'agency'].includes(planId)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Get or create Stripe customer on the organization
    const { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single()

    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const stripe = getStripe()
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id, organization_id: orgId },
      })
      customerId = customer.id

      await admin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', orgId)
    }

    let priceId: string
    try {
      priceId = getPriceId(planId, interval)
    } catch {
      return NextResponse.json({ error: 'Preço não configurado' }, { status: 500 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getInternalAppUrl()}/clientes?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getPublicBaseUrl()}/pricing?checkout=canceled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          organization_id: orgId,
          plan_id: planId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 })
  }
}
