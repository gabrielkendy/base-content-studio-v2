'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

interface FinanceiroData {
  mrr: number
  arr: number
  paidOrgs: number
  totalOrgs: number
  conversionRate: number
  byPlan: Array<{ plan: string; count: number; monthlyRevenue: number }>
  orgs: Array<{
    id: string
    name: string
    plan: string | null
    created_at: string
    monthly: number
  }>
}

export default function FinanceiroPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetch('/api/admin/financeiro')
      .then((r) => {
        if (r.status === 403) { router.replace('/'); return null }
        if (!r.ok) throw new Error('Falha ao carregar dados')
        return r.json()
      })
      .then((json) => { if (json) setData(json) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [authLoading, user, router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-zinc-500">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p>{error}</p>
      </div>
    )
  }

  if (!data) return null

  const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro', agency: 'Agency' }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-zinc-500 text-sm mt-1">Receita e assinaturas</p>
        </div>
        <Link
          href="https://dashboard.stripe.com"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Stripe Dashboard
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="MRR"
          value={`R$${data.mrr.toLocaleString('pt-BR')}`}
          sub="Receita mensal recorrente"
          color="text-green-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="ARR Estimado"
          value={`R$${data.arr.toLocaleString('pt-BR')}`}
          sub="MRR × 12"
          color="text-blue-600"
        />
        <KpiCard
          icon={CreditCard}
          label="Orgs Pagas"
          value={data.paidOrgs}
          sub={`de ${data.totalOrgs} total`}
          color="text-purple-600"
        />
        <KpiCard
          icon={Percent}
          label="Conversão Free→Paid"
          value={`${data.conversionRate.toFixed(1)}%`}
          sub="do total de organizações"
          color="text-amber-600"
        />
      </div>

      {/* By plan breakdown */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-700">Breakdown por Plano</h2>
        </div>
        <table className="w-full">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Plano</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Orgs</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">MRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {data.byPlan.map((row) => (
              <tr key={row.plan}>
                <td className="py-3 px-4 text-sm font-medium text-zinc-800">
                  {PLAN_LABELS[row.plan] || row.plan}
                </td>
                <td className="py-3 px-4 text-center text-sm text-zinc-600">{row.count}</td>
                <td className="py-3 px-4 text-right text-sm font-semibold text-zinc-800">
                  R${row.monthlyRevenue.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* All paid orgs table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-700">Organizações com Plano Pago</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Organização</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Plano</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">R$/mês</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.orgs.map((org) => (
                <tr key={org.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-zinc-900">{org.name}</td>
                  <td className="py-3 px-4 text-sm text-zinc-600">
                    {PLAN_LABELS[org.plan || ''] || org.plan || '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-zinc-800">
                    R${org.monthly.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-500">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.orgs.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Nenhuma organização com plano pago
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  color: string
}) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 mb-1">{value}</div>
      <div className="text-xs text-zinc-400">{sub}</div>
    </div>
  )
}
