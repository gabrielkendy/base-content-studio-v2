import Stripe from 'stripe'

// Lazy initialization to avoid errors during build
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
    })
  }
  return stripeInstance
}
