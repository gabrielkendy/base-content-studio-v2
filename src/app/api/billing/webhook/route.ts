import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { PlanId } from '@/types/billing'
import { notifyPaymentFailed, notifySubscriptionCanceled, notifyWelcome } from '@/lib/notifications'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

type AdminClient = ReturnType<typeof createServiceClient>

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, admin)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, admin)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, admin)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, admin)
        break
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, admin)
        break
      default:
        // Unhandled event types are silently ignored
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session, admin: AdminClient) {
  const { customer, subscription, metadata } = session

  if (!subscription || !metadata?.organization_id) {
    console.error('Missing subscription or organization_id in checkout session')
    return
  }

  await admin
    .from('organizations')
    .update({
      stripe_customer_id: customer as string,
      stripe_subscription_id: subscription as string,
      plan_id: metadata.plan_id as PlanId,
      subscription_status: 'trialing',
    })
    .eq('id', metadata.organization_id)

  if (metadata.user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(metadata.user_id)
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', metadata.organization_id)
      .single()

    if (userData?.user?.email) {
      await notifyWelcome(
        {
          id: metadata.user_id,
          email: userData.user.email,
          name: userData.user.user_metadata?.full_name,
        },
        org ? { id: metadata.organization_id, name: org.name } : undefined,
      ).catch((err) => console.error('notifyWelcome error:', err))
    }
  }

}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, admin: AdminClient) {
  const customer = subscription.customer
  const metadata = subscription.metadata
  const status = subscription.status
  const cancel_at_period_end = subscription.cancel_at_period_end
  // Stripe JS types lag behind the API — cast to access period fields
  const sub = subscription as unknown as {
    current_period_start: number
    current_period_end: number
    trial_end: number | null
  }

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) {
    console.error('Organization not found for customer:', customer)
    return
  }

  const item = subscription.items.data[0]
  const priceId = item?.price.id
  let planId: PlanId = 'starter'
  if (priceId?.includes('pro')) planId = 'pro'
  else if (priceId?.includes('agency')) planId = 'agency'
  else if (metadata?.plan_id) planId = metadata.plan_id as PlanId

  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
  }

  await admin
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      subscription_status: statusMap[status] || status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    })
    .eq('id', org.id)

}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, admin: AdminClient) {
  const customer = subscription.customer
  const sub = subscription as unknown as { current_period_end: number }

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  await admin
    .from('organizations')
    .update({ subscription_status: 'canceled', plan_id: null })
    .eq('id', org.id)

  const { data: member } = await admin
    .from('members')
    .select('user_id')
    .eq('org_id', org.id)
    .eq('role', 'admin')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (member?.user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(member.user_id)
    if (userData?.user?.email) {
      const accessUntil = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toLocaleDateString('pt-BR')
        : 'o fim do período pago'
      await notifySubscriptionCanceled(
        { id: member.user_id, email: userData.user.email, name: userData.user.user_metadata?.full_name },
        accessUntil,
      ).catch((err) => console.error('notifySubscriptionCanceled error:', err))
    }
  }

}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: AdminClient) {
  const { customer, id, amount_paid, currency, hosted_invoice_url, invoice_pdf } = invoice
  const inv = invoice as unknown as { period_start: number | null; period_end: number | null }

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  await admin.from('invoices').upsert(
    {
      stripe_invoice_id: id,
      organization_id: org.id,
      amount: amount_paid,
      currency,
      status: 'paid',
      invoice_url: hosted_invoice_url,
      invoice_pdf: invoice_pdf ?? null,
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
    },
    { onConflict: 'stripe_invoice_id' },
  )

}

async function handleInvoiceFailed(invoice: Stripe.Invoice, admin: AdminClient) {
  const { customer, id } = invoice

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customer as string)
    .single()

  if (!org) return

  await Promise.all([
    admin.from('invoices').update({ status: 'uncollectible' }).eq('stripe_invoice_id', id),
    admin.from('organizations').update({ subscription_status: 'past_due' }).eq('id', org.id),
  ])

  const { data: member } = await admin
    .from('members')
    .select('user_id')
    .eq('org_id', org.id)
    .eq('role', 'admin')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (member?.user_id) {
    const { data: userData } = await admin.auth.admin.getUserById(member.user_id)
    if (userData?.user?.email) {
      await notifyPaymentFailed({
        id: member.user_id,
        email: userData.user.email,
        name: userData.user.user_metadata?.full_name,
      }).catch((err) => console.error('notifyPaymentFailed error:', err))
    }
  }

}
