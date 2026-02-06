import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { PlanId } from '@/types/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Use service role for webhook (no auth context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutComplete(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { customer, subscription, metadata } = session
  
  if (!subscription || !metadata?.organization_id) {
    console.error('Missing subscription or organization_id in checkout session')
    return
  }

  // Update organization with subscription info
  await supabase
    .from('organizations')
    .update({
      stripe_customer_id: customer as string,
      stripe_subscription_id: subscription as string,
      plan_id: metadata.plan_id as PlanId,
      subscription_status: 'trialing',
    })
    .eq('id', metadata.organization_id)

  console.log(`Checkout complete for org ${metadata.organization_id}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { customer, metadata, status, current_period_start, current_period_end, cancel_at_period_end, trial_end } = subscription

  // Get organization by stripe_customer_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) {
    console.error('Organization not found for customer:', customer)
    return
  }

  // Get plan from subscription items
  const item = subscription.items.data[0]
  const priceId = item?.price.id
  let planId: PlanId = 'starter'

  // Determine plan from price
  if (priceId?.includes('pro')) planId = 'pro'
  else if (priceId?.includes('agency')) planId = 'agency'
  else if (metadata?.plan_id) planId = metadata.plan_id as PlanId

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
  }

  await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      subscription_status: statusMap[status] || status,
      current_period_start: new Date(current_period_start * 1000).toISOString(),
      current_period_end: new Date(current_period_end * 1000).toISOString(),
      cancel_at_period_end,
      trial_end: trial_end ? new Date(trial_end * 1000).toISOString() : null,
    })
    .eq('id', org.id)

  console.log(`Subscription updated for org ${org.id}: ${planId} (${status})`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { customer } = subscription

  // Get organization by stripe_customer_id
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  await supabase
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      plan_id: null,
    })
    .eq('id', org.id)

  console.log(`Subscription canceled for org ${org.id}`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { customer, id, amount_paid, currency, hosted_invoice_url, invoice_pdf, period_start, period_end } = invoice

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  // Save invoice record
  await supabase.from('invoices').upsert({
    stripe_invoice_id: id,
    organization_id: org.id,
    amount: amount_paid,
    currency,
    status: 'paid',
    invoice_url: hosted_invoice_url,
    invoice_pdf: invoice_pdf,
    period_start: period_start ? new Date(period_start * 1000).toISOString() : null,
    period_end: period_end ? new Date(period_end * 1000).toISOString() : null,
  }, { onConflict: 'stripe_invoice_id' })

  console.log(`Invoice paid: ${id} for org ${org.id}`)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const { customer, id } = invoice

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  // Update invoice status
  await supabase
    .from('invoices')
    .update({ status: 'uncollectible' })
    .eq('stripe_invoice_id', id)

  // Update org status
  await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('id', org.id)

  // TODO: Send notification email about failed payment

  console.log(`Invoice payment failed: ${id} for org ${org.id}`)
}
