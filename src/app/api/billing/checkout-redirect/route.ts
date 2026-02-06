import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { PLANS, PlanId, BillingInterval } from '@/types/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const planId = searchParams.get('plan') as PlanId
    const interval = (searchParams.get('interval') || 'year') as BillingInterval
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // Validate plan
    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.redirect(`${origin}/pricing`)
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get member org
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    // Get price ID
    const priceId = interval === 'year' 
      ? plan.stripePriceIdAnnual 
      : plan.stripePriceIdMonthly

    if (!priceId) {
      return NextResponse.redirect(`${origin}/dashboard?error=pricing-not-configured`)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          user_id: user.id,
          organization_id: member?.organization_id || '',
          plan_id: planId,
        },
      },
      allow_promotion_codes: true,
    })

    if (session.url) {
      return NextResponse.redirect(session.url)
    }

    return NextResponse.redirect(`${origin}/pricing?error=checkout-failed`)
  } catch (err) {
    console.error('Checkout redirect error:', err)
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/pricing?error=checkout-failed`)
  }
}
