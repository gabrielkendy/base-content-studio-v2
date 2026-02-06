'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlanId, PLANS, Plan } from '@/types/billing'

interface SubscriptionStatus {
  plan: Plan | null
  planId: PlanId | null
  subscription: {
    status: string
    isActive: boolean
    isTrialing: boolean
    trialDaysLeft: number
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
  usage: {
    clients: { current: number; limit: number; allowed: boolean }
    users: { current: number; limit: number; allowed: boolean }
    contentsPerMonth: { current: number; limit: number; allowed: boolean }
  } | null
  canCreateClient: boolean
  canAddUser: boolean
  canCreateContent: boolean
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscription(): SubscriptionStatus {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/billing/status')
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Não autenticado')
          return
        }
        throw new Error('Erro ao carregar status')
      }
      
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Return default values if no data
  if (!data) {
    return {
      plan: null,
      planId: null,
      subscription: null,
      usage: null,
      canCreateClient: false,
      canAddUser: false,
      canCreateContent: false,
      loading,
      error,
      refetch: fetchStatus,
    }
  }

  return {
    plan: data.plan ? PLANS[data.plan.id as PlanId] : null,
    planId: data.plan?.id || null,
    subscription: data.subscription,
    usage: data.usage,
    canCreateClient: data.canCreateClient ?? false,
    canAddUser: data.canAddUser ?? false,
    canCreateContent: data.canCreateContent ?? false,
    loading,
    error,
    refetch: fetchStatus,
  }
}

// Helper hook for checking specific limits
export function useCanPerformAction(action: 'createClient' | 'addUser' | 'createContent'): {
  allowed: boolean
  loading: boolean
  reason?: string
} {
  const { canCreateClient, canAddUser, canCreateContent, usage, plan, loading } = useSubscription()

  if (loading) {
    return { allowed: false, loading: true }
  }

  switch (action) {
    case 'createClient':
      return {
        allowed: canCreateClient,
        loading: false,
        reason: canCreateClient 
          ? undefined 
          : `Limite de ${usage?.clients.limit} clientes atingido. Faça upgrade para adicionar mais.`,
      }
    case 'addUser':
      return {
        allowed: canAddUser,
        loading: false,
        reason: canAddUser 
          ? undefined 
          : `Limite de ${usage?.users.limit} usuários atingido. Faça upgrade para adicionar mais.`,
      }
    case 'createContent':
      return {
        allowed: canCreateContent,
        loading: false,
        reason: canCreateContent 
          ? undefined 
          : `Limite de ${usage?.contentsPerMonth.limit} conteúdos/mês atingido. Faça upgrade para criar mais.`,
      }
    default:
      return { allowed: false, loading: false }
  }
}

// Helper to check feature access
export function useHasFeature(feature: 'whiteLabel' | 'apiAccess' | 'webhooks' | 'prioritySupport'): boolean {
  const { plan } = useSubscription()
  
  if (!plan) return false

  switch (feature) {
    case 'whiteLabel':
      return plan.limits.hasWhiteLabel
    case 'apiAccess':
      return plan.limits.hasApiAccess
    case 'webhooks':
      return plan.limits.hasWebhooks
    case 'prioritySupport':
      return plan.limits.hasPrioritySupport
    default:
      return false
  }
}
