'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Zap, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { useSubscription } from '@/hooks/use-subscription'

export function TrialBanner() {
  const { subscription, loading } = useSubscription()
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('trial-banner-dismissed')
    if (dismissedUntil) {
      const until = new Date(dismissedUntil)
      if (until > new Date()) {
        setDismissed(true)
      }
    }
  }, [])

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    localStorage.setItem('trial-banner-dismissed', tomorrow.toISOString())
    setDismissed(true)
  }

  if (loading || dismissed) return null
  if (!subscription) return null

  // Don't show for active paid subscriptions
  if (subscription.isActive && !subscription.isTrialing) return null

  // Trial expiring soon (less than 5 days)
  if (subscription.isTrialing && subscription.trialDaysLeft <= 5) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm">
              <span className="font-semibold text-amber-500">
                {subscription.trialDaysLeft} {subscription.trialDaysLeft === 1 ? 'dia' : 'dias'}
              </span>
              {' '}restantes no seu período de teste
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/configuracoes/assinatura"
              className="px-4 py-1.5 bg-amber-500 text-black rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors flex items-center gap-1"
            >
              Assinar agora <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Trial expired
  if (subscription.status === 'past_due' || 
      (subscription.isTrialing && subscription.trialDaysLeft === 0)) {
    return (
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-red-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-sm">
              <span className="font-semibold text-red-500">Seu período de teste expirou.</span>
              {' '}Assine para continuar usando todas as funcionalidades.
            </p>
          </div>
          <Link
            href="/configuracoes/assinatura"
            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-400 transition-colors flex items-center gap-1"
          >
            Assinar agora <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    )
  }

  // Subscription will cancel
  if (subscription.cancelAtPeriodEnd) {
    const endDate = subscription.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
      : 'em breve'

    return (
      <div className="bg-gradient-to-r from-zinc-500/10 to-zinc-600/10 border-b border-zinc-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-zinc-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-sm">
              Sua assinatura será cancelada em <span className="font-semibold">{endDate}</span>
            </p>
          </div>
          <Link
            href="/configuracoes/assinatura"
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            Reativar
          </Link>
        </div>
      </div>
    )
  }

  return null
}

// Compact version for sidebars/navs
export function TrialBadge() {
  const { subscription, loading } = useSubscription()

  if (loading || !subscription) return null
  if (subscription.isActive && !subscription.isTrialing) return null

  if (subscription.isTrialing) {
    return (
      <Link
        href="/configuracoes/assinatura"
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-500 hover:bg-amber-500/30 transition-colors"
      >
        <Zap className="w-3 h-3" />
        {subscription.trialDaysLeft}d restantes
      </Link>
    )
  }

  return null
}
