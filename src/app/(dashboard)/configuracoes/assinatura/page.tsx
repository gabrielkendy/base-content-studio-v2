'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Crown, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  Loader2,
  Users,
  Building2,
  FileText,
  Zap,
  ExternalLink
} from 'lucide-react'
import { PLANS, PlanId } from '@/types/billing'

interface BillingStatus {
  plan: {
    id: PlanId
    name: string
    features: string[]
    limits: any
  }
  subscription: {
    status: string
    isActive: boolean
    isTrialing: boolean
    trialDaysLeft: number
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }
  usage: {
    clients: { current: number; limit: number; allowed: boolean }
    users: { current: number; limit: number; allowed: boolean }
    contentsPerMonth: { current: number; limit: number; allowed: boolean }
  }
}

export default function AssinaturaPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/billing/status')
      const data = await res.json()
      if (res.ok) {
        setStatus(data)
      }
    } catch (err) {
      console.error('Error fetching billing status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: PlanId, interval: 'month' | 'year' = 'year') => {
    setUpgradeLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setUpgradeLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Portal error:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const currentPlan = status?.plan
  const subscription = status?.subscription
  const usage = status?.usage

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-purple-500" />
          Assinatura
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e pagamentos
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Plano Atual</span>
            </div>
            <h2 className="text-3xl font-bold">{currentPlan?.name || 'Free'}</h2>
            
            {subscription?.isTrialing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-amber-500">
                <AlertTriangle className="w-4 h-4" />
                <span>Período de teste: {subscription.trialDaysLeft} dias restantes</span>
              </div>
            )}
            
            {subscription?.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span>Assinatura será cancelada em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>

          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Gerenciar Pagamento
          </button>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="grid sm:grid-cols-3 gap-4">
          <UsageCard
            icon={Building2}
            label="Clientes"
            current={usage.clients.current}
            limit={usage.clients.limit}
            allowed={usage.clients.allowed}
          />
          <UsageCard
            icon={Users}
            label="Usuários"
            current={usage.users.current}
            limit={usage.users.limit}
            allowed={usage.users.allowed}
          />
          <UsageCard
            icon={FileText}
            label="Conteúdos/mês"
            current={usage.contentsPerMonth.current}
            limit={usage.contentsPerMonth.limit}
            allowed={usage.contentsPerMonth.allowed}
          />
        </div>
      )}

      {/* Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(PLANS).map((plan) => {
            const isCurrent = currentPlan?.id === plan.id
            const isUpgrade = !currentPlan || 
              Object.keys(PLANS).indexOf(plan.id) > Object.keys(PLANS).indexOf(currentPlan.id)

            return (
              <div
                key={plan.id}
                className={`relative p-6 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-card border-border hover:border-purple-500/30'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-full">
                    Atual
                  </div>
                )}

                <h4 className="text-xl font-bold mb-1">{plan.name}</h4>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold">R${plan.priceAnnual}</span>
                  <span className="text-muted-foreground">/mês</span>
                  <p className="text-xs text-muted-foreground">cobrado anualmente</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgradeLoading === plan.id}
                    className={`w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      isUpgrade
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {upgradeLoading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isUpgrade ? 'Fazer Upgrade' : 'Mudar Plano'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Features Comparison */}
      <div className="bg-card border rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Recursos por Plano
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 font-medium">Recurso</th>
                {Object.values(PLANS).map(plan => (
                  <th key={plan.id} className="text-center py-3 font-medium">{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">Clientes</td>
                <td className="text-center">3</td>
                <td className="text-center">10</td>
                <td className="text-center">∞</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Usuários</td>
                <td className="text-center">1</td>
                <td className="text-center">5</td>
                <td className="text-center">∞</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">Conteúdos/mês</td>
                <td className="text-center">50</td>
                <td className="text-center">200</td>
                <td className="text-center">∞</td>
              </tr>
              <tr className="border-b">
                <td className="py-3">White-label</td>
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3">API Access</td>
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3">Suporte Prioritário</td>
                <td className="text-center text-muted-foreground">—</td>
                <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function UsageCard({ 
  icon: Icon, 
  label, 
  current, 
  limit, 
  allowed 
}: { 
  icon: any
  label: string
  current: number
  limit: number
  allowed: boolean 
}) {
  const percentage = limit === -1 ? 0 : (current / limit) * 100
  const isUnlimited = limit === -1
  const isNearLimit = !isUnlimited && percentage >= 80
  const isAtLimit = !isUnlimited && percentage >= 100

  return (
    <div className={`p-4 rounded-xl border ${
      isAtLimit ? 'bg-red-500/10 border-red-500/30' :
      isNearLimit ? 'bg-amber-500/10 border-amber-500/30' :
      'bg-card border-border'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${
          isAtLimit ? 'text-red-500' :
          isNearLimit ? 'text-amber-500' :
          'text-muted-foreground'
        }`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{current}</span>
        <span className="text-muted-foreground">
          / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' :
              isNearLimit ? 'bg-amber-500' :
              'bg-purple-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
