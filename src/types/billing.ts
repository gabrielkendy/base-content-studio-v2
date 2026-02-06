// Billing Types

export type PlanId = 'starter' | 'pro' | 'agency'
export type BillingInterval = 'month' | 'year'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid'

export interface Plan {
  id: PlanId
  name: string
  description: string
  priceMonthly: number
  priceAnnual: number
  stripePriceIdMonthly: string
  stripePriceIdAnnual: string
  limits: PlanLimits
  features: string[]
}

export interface PlanLimits {
  clients: number // -1 = unlimited
  users: number   // -1 = unlimited
  contentsPerMonth: number // -1 = unlimited
  hasWhiteLabel: boolean
  hasApiAccess: boolean
  hasWebhooks: boolean
  hasPrioritySupport: boolean
}

export interface Subscription {
  id: string
  organization_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan_id: PlanId
  billing_interval: BillingInterval
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  trial_end?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  stripe_invoice_id: string
  amount: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  invoice_url?: string
  invoice_pdf?: string
  period_start: string
  period_end: string
  created_at: string
}

export interface UsageRecord {
  id: string
  organization_id: string
  month: string // YYYY-MM
  clients_count: number
  users_count: number
  contents_count: number
  created_at: string
  updated_at: string
}

// Plans Configuration
export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfeito para freelancers',
    priceMonthly: 97,
    priceAnnual: 77,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY || '',
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL || '',
    limits: {
      clients: 3,
      users: 1,
      contentsPerMonth: 50,
      hasWhiteLabel: false,
      hasApiAccess: false,
      hasWebhooks: false,
      hasPrioritySupport: false,
    },
    features: [
      '3 clientes',
      '1 usuário',
      '50 conteúdos/mês',
      'Workflow básico',
      'Chat com clientes',
      'Suporte por email',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para agências em crescimento',
    priceMonthly: 197,
    priceAnnual: 157,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY || '',
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL || '',
    limits: {
      clients: 10,
      users: 5,
      contentsPerMonth: 200,
      hasWhiteLabel: false,
      hasApiAccess: false,
      hasWebhooks: true,
      hasPrioritySupport: true,
    },
    features: [
      '10 clientes',
      '5 usuários',
      '200 conteúdos/mês',
      'Workflow avançado',
      'Aprovação externa',
      'Relatórios completos',
      'Integrações',
      'Suporte prioritário',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Para grandes operações',
    priceMonthly: 397,
    priceAnnual: 317,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_AGENCY_MONTHLY || '',
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL || '',
    limits: {
      clients: -1,
      users: -1,
      contentsPerMonth: -1,
      hasWhiteLabel: true,
      hasApiAccess: true,
      hasWebhooks: true,
      hasPrioritySupport: true,
    },
    features: [
      'Clientes ilimitados',
      'Usuários ilimitados',
      'Conteúdos ilimitados',
      'White-label',
      'API access',
      'Webhooks',
      'Onboarding dedicado',
      'Suporte 24/7',
    ],
  },
}

// Helper functions
export function getPlan(planId: PlanId): Plan {
  return PLANS[planId]
}

export function checkLimit(
  plan: Plan,
  limitType: keyof PlanLimits,
  currentValue: number
): { allowed: boolean; limit: number; current: number } {
  const limit = plan.limits[limitType]
  
  if (typeof limit === 'boolean') {
    return { allowed: limit, limit: limit ? 1 : 0, current: currentValue }
  }
  
  const allowed = limit === -1 || currentValue < limit
  return { allowed, limit, current: currentValue }
}

export function formatPrice(price: number, interval: BillingInterval): string {
  return `R$${price}/${interval === 'month' ? 'mês' : 'ano'}`
}
