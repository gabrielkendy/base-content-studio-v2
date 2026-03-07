import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    stripeInstance = new Stripe(key, { apiVersion: '2026-01-28.clover' })
  }
  return stripeInstance
}

export type PlanName = 'starter' | 'pro' | 'agency'
export type PlanInterval = 'month' | 'year'

export function getPriceId(plan: PlanName, interval: PlanInterval): string {
  const key = `NEXT_PUBLIC_STRIPE_${plan.toUpperCase()}_${interval === 'month' ? 'MONTHLY' : 'ANNUAL'}`
  const id = process.env[key]
  if (!id) throw new Error(`Missing env var: ${key}`)
  return id
}

export const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

export const PLAN_PRICES_BRL: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 97, annual: 924 },
  pro: { monthly: 197, annual: 1884 },
  agency: { monthly: 397, annual: 3804 },
}

export const PLAN_FEATURES: Record<string, string[]> = {
  free: ['1 cliente', '5 conteúdos/mês', 'Workflow básico'],
  starter: ['5 clientes', '50 conteúdos/mês', 'WhatsApp Z-API', 'Webhooks', 'Suporte por email'],
  pro: ['20 clientes', '200 conteúdos/mês', 'Tudo do Starter', 'Analytics', 'Portal do cliente', 'Agendamento de posts'],
  agency: ['Clientes ilimitados', 'Conteúdos ilimitados', 'Tudo do Pro', 'API access', 'Suporte prioritário'],
}
