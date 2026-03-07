import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, getPriceId, PlanName } from '@/lib/stripe'
import { getAuthUser, getUserOrgId } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const planId = searchParams.get('plan') as PlanName
  const interval = (searchParams.get('interval') || 'year') as 'month' | 'year'

  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    if (!planId || !['starter', 'pro', 'agency'].includes(planId)) {
      return NextResponse.redirect(`${origin}/pricing`)
    }

    const orgId = await getUserOrgId(user.id)
    if (!orgId) {
      return NextResponse.redirect(`${origin}/welcome?plan=${planId}&interval=${interval}`)
    }

    const admin = createServiceClient()
    const { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single()

    const stripe = getStripe()
    let customerId = org?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id, organization_id: orgId },
      })
      customerId = customer.id
      await admin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
    }

    let priceId: string
    try {
      priceId = getPriceId(planId, interval)
    } catch {
      return NextResponse.redirect(`${origin}/clientes?error=pricing-not-configured`)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/clientes?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, organization_id: orgId, plan_id: planId },
      },
      allow_promotion_codes: true,
    })

    if (session.url) {
      return NextResponse.redirect(session.url)
    }

    return NextResponse.redirect(`${origin}/pricing?error=checkout-failed`)
  } catch (err) {
    console.error('Checkout redirect error:', err)
    return NextResponse.redirect(`${origin}/pricing?error=checkout-failed`)
  }
}
