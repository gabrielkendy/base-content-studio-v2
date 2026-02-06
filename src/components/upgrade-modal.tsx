'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  X, 
  Zap, 
  Crown, 
  ArrowRight, 
  Check,
  Loader2,
  AlertTriangle,
  Users,
  Building2,
  FileText
} from 'lucide-react'
import { PLANS, PlanId } from '@/types/billing'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason: 'clients' | 'users' | 'contents' | 'feature'
  featureName?: string
  currentPlan?: PlanId
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  reason, 
  featureName,
  currentPlan = 'starter' 
}: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

  const reasonConfig = {
    clients: {
      icon: Building2,
      title: 'Limite de clientes atingido',
      description: 'Você precisa de um plano maior para adicionar mais clientes.',
    },
    users: {
      icon: Users,
      title: 'Limite de usuários atingido',
      description: 'Você precisa de um plano maior para adicionar mais membros à equipe.',
    },
    contents: {
      icon: FileText,
      title: 'Limite de conteúdos atingido',
      description: 'Você atingiu o limite de conteúdos deste mês.',
    },
    feature: {
      icon: Zap,
      title: `${featureName || 'Recurso'} não disponível`,
      description: 'Este recurso está disponível em planos superiores.',
    },
  }

  const config = reasonConfig[reason]
  const Icon = config.icon

  // Determine which plans to show (only higher than current)
  const planOrder: PlanId[] = ['starter', 'pro', 'agency']
  const currentIndex = planOrder.indexOf(currentPlan)
  const upgradePlans = planOrder
    .slice(currentIndex + 1)
    .map(id => PLANS[id])

  const handleUpgrade = async (planId: PlanId) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval: 'year' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-6">
            <Icon className="w-8 h-8 text-amber-500" />
          </div>

          {/* Text */}
          <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
          <p className="text-zinc-400 mb-8">{config.description}</p>

          {/* Upgrade options */}
          {upgradePlans.length > 0 ? (
            <div className="space-y-4">
              {upgradePlans.map(plan => (
                <div 
                  key={plan.id}
                  className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold">{plan.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold">R${plan.priceAnnual}</span>
                      <span className="text-zinc-400 text-sm">/mês</span>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Fazer Upgrade <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-zinc-400 mb-4">
                Você já está no plano mais alto. Entre em contato para soluções enterprise.
              </p>
              <Link
                href="/contato"
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
              >
                Falar com vendas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Compare plans link */}
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              className="text-sm text-purple-400 hover:underline"
            >
              Comparar todos os planos →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simpler inline banner for trial/limits
interface UpgradeBannerProps {
  type: 'trial' | 'limit' | 'expired'
  daysLeft?: number
  limitType?: string
  onUpgrade?: () => void
}

export function UpgradeBanner({ type, daysLeft, limitType, onUpgrade }: UpgradeBannerProps) {
  const configs = {
    trial: {
      bg: 'from-amber-500/10 to-orange-500/10',
      border: 'border-amber-500/20',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      text: `Seu período de teste termina em ${daysLeft} dias`,
      cta: 'Assinar agora',
    },
    limit: {
      bg: 'from-purple-500/10 to-blue-500/10',
      border: 'border-purple-500/20',
      icon: <AlertTriangle className="w-4 h-4 text-purple-500" />,
      text: `Você está próximo do limite de ${limitType}`,
      cta: 'Fazer upgrade',
    },
    expired: {
      bg: 'from-red-500/10 to-orange-500/10',
      border: 'border-red-500/20',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      text: 'Seu período de teste expirou',
      cta: 'Assinar agora',
    },
  }

  const config = configs[type]

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-3 bg-gradient-to-r ${config.bg} border ${config.border} rounded-xl`}>
      <div className="flex items-center gap-3">
        {config.icon}
        <span className="text-sm font-medium">{config.text}</span>
      </div>
      <button
        onClick={onUpgrade}
        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
      >
        {config.cta}
      </button>
    </div>
  )
}
