'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  Shield,
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  DollarSign,
  Activity,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ExternalLink,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface AdminStats {
  totalOrganizations: number
  activeSubscriptions: number
  trialUsers: number
  mrr: number
  newSignupsThisMonth: number
}

interface Organization {
  id: string
  name: string
  slug: string
  plan: string | null
  created_at: string
  members_count: number
  clients_count: number
  contents_count: number
  owner_email: string
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/stats?page=${p}`)
      if (res.status === 403) {
        router.replace('/')
        return
      }
      if (!res.ok) throw new Error('Falha ao carregar dados')
      const json = await res.json()
      setStats(json.stats)
      setOrganizations(json.organizations)
      setTotal(json.total)
      setPage(json.page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetchData(0)
  }, [authLoading, user, router, fetchData])

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.owner_email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && org.plan && org.plan !== 'free') ||
      (statusFilter === 'free' && (!org.plan || org.plan === 'free'))
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(total / 20)

  const getPlanBadge = (plan: string | null) => {
    const plans: Record<string, { icon: string; label: string; color: string }> = {
      starter: { icon: '⭐', label: 'Starter', color: 'text-zinc-500' },
      pro: { icon: '🚀', label: 'Pro', color: 'text-purple-500' },
      agency: { icon: '👑', label: 'Agency', color: 'text-amber-500' },
    }
    const p = plans[plan || ''] || { icon: '—', label: 'Free', color: 'text-zinc-400' }
    return (
      <span className={`flex items-center gap-1 ${p.color} text-sm font-medium`}>
        {p.icon} {p.label}
      </span>
    )
  }

  if (authLoading || (loading && !stats)) {
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
        <button onClick={() => fetchData(page)} className="text-sm text-purple-600 hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-500" />
            Admin Dashboard
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">Visão geral do SaaS</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Activity className="w-4 h-4" />
          Dados reais
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total de Organizações"
            value={stats.totalOrganizations}
            change={`+${stats.newSignupsThisMonth} este mês`}
            positive
          />
          <StatCard
            icon={CreditCard}
            label="Assinaturas Pagas"
            value={stats.activeSubscriptions}
            change={`${stats.trialUsers} novos sem plano`}
          />
          <StatCard
            icon={DollarSign}
            label="MRR"
            value={`R$${stats.mrr.toLocaleString('pt-BR')}`}
            change="Calculado por plano"
            positive
          />
          <StatCard
            icon={TrendingUp}
            label="Novos este mês"
            value={stats.newSignupsThisMonth}
            change={`de ${stats.totalOrganizations} total`}
            positive={stats.newSignupsThisMonth > 0}
          />
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none"
            >
              <option value="all">Todos os planos</option>
              <option value="active">Com plano pago</option>
              <option value="free">Free / sem plano</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Organização</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Plano</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Membros</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Clientes</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Conteúdos</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Criado em</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrgs.map(org => (
                <tr
                  key={org.id}
                  className="hover:bg-zinc-50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/orgs/${org.id}`)}
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-zinc-900 text-sm">{org.name}</div>
                      <div className="text-xs text-zinc-400">{org.owner_email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getPlanBadge(org.plan)}</td>
                  <td className="py-3 px-4 text-center text-sm text-zinc-700">{org.members_count}</td>
                  <td className="py-3 px-4 text-center text-sm text-zinc-700">{org.clients_count}</td>
                  <td className="py-3 px-4 text-center text-sm text-zinc-700">{org.contents_count}</td>
                  <td className="py-3 px-4 text-sm text-zinc-500">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <ChevronRight className="w-4 h-4 text-zinc-300 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrgs.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Nenhuma organização encontrada
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <span className="text-sm text-zinc-500">
              Página {page + 1} de {totalPages} · {total} organizações
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={page === 0 || loading}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="https://dashboard.stripe.com"
          target="_blank"
          className="p-4 bg-white border border-zinc-200 rounded-xl hover:border-purple-300 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-zinc-900">Stripe Dashboard</div>
            <div className="text-xs text-zinc-500">Gerenciar pagamentos</div>
          </div>
          <ExternalLink className="w-4 h-4 text-zinc-400" />
        </Link>

        <Link
          href="/configuracoes?tab=integrations"
          className="p-4 bg-white border border-zinc-200 rounded-xl hover:border-purple-300 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-zinc-900">Integrações</div>
            <div className="text-xs text-zinc-500">Ver status de serviços</div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  positive
}: {
  icon: React.ElementType
  label: string
  value: string | number
  change: string
  positive?: boolean
}) {
  return (
    <div className="p-4 bg-white border border-zinc-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-zinc-400" />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-zinc-900 mb-1">{value}</div>
      <div className={`text-xs ${positive ? 'text-green-600' : 'text-zinc-400'}`}>{change}</div>
    </div>
  )
}
