'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Crown,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface AdminStats {
  totalOrganizations: number
  activeSubscriptions: number
  trialUsers: number
  mrr: number
  mrrGrowth: number
  churnRate: number
  newSignupsThisMonth: number
  conversionRate: number
}

interface Organization {
  id: string
  name: string
  slug: string
  plan_id: string | null
  subscription_status: string | null
  created_at: string
  members_count: number
  clients_count: number
  contents_count: number
  owner_email: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // In production, this would fetch from your admin API
      // For now, using mock data
      setStats({
        totalOrganizations: 156,
        activeSubscriptions: 89,
        trialUsers: 34,
        mrr: 15780,
        mrrGrowth: 12.5,
        churnRate: 2.3,
        newSignupsThisMonth: 23,
        conversionRate: 45,
      })

      setOrganizations([
        {
          id: '1',
          name: 'Agência Digital XYZ',
          slug: 'agencia-xyz',
          plan_id: 'pro',
          subscription_status: 'active',
          created_at: '2026-01-15',
          members_count: 4,
          clients_count: 8,
          contents_count: 156,
          owner_email: 'contato@agenciaxyz.com',
        },
        {
          id: '2',
          name: 'Studio Criativo',
          slug: 'studio-criativo',
          plan_id: 'starter',
          subscription_status: 'trialing',
          created_at: '2026-02-01',
          members_count: 1,
          clients_count: 2,
          contents_count: 12,
          owner_email: 'maria@studiocriativo.com',
        },
        {
          id: '3',
          name: 'Marketing Pro',
          slug: 'marketing-pro',
          plan_id: 'agency',
          subscription_status: 'active',
          created_at: '2025-11-20',
          members_count: 12,
          clients_count: 25,
          contents_count: 890,
          owner_email: 'admin@marketingpro.com',
        },
        {
          id: '4',
          name: 'Freelancer João',
          slug: 'freelancer-joao',
          plan_id: null,
          subscription_status: 'canceled',
          created_at: '2026-01-28',
          members_count: 1,
          clients_count: 1,
          contents_count: 5,
          owner_email: 'joao@email.com',
        },
      ])
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(search.toLowerCase()) ||
                         org.owner_email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || org.subscription_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string | null) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Ativo' },
      trialing: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Trial' },
      past_due: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Atrasado' },
      canceled: { bg: 'bg-zinc-500/20', text: 'text-zinc-500', label: 'Cancelado' },
    }
    const config = configs[status || 'canceled'] || configs.canceled
    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} text-xs font-medium rounded-full`}>
        {config.label}
      </span>
    )
  }

  const getPlanBadge = (planId: string | null) => {
    const plans: Record<string, { icon: string; label: string; color: string }> = {
      starter: { icon: '⭐', label: 'Starter', color: 'text-zinc-400' },
      pro: { icon: '🚀', label: 'Pro', color: 'text-purple-400' },
      agency: { icon: '👑', label: 'Agency', color: 'text-amber-400' },
    }
    const plan = plans[planId || ''] || { icon: '—', label: 'Free', color: 'text-zinc-500' }
    return (
      <span className={`flex items-center gap-1 ${plan.color} text-sm font-medium`}>
        {plan.icon} {plan.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
          <p className="text-muted-foreground mt-1">
            Visão geral do SaaS
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          Atualizado agora
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
            label="Assinaturas Ativas"
            value={stats.activeSubscriptions}
            change={`${stats.trialUsers} em trial`}
          />
          <StatCard
            icon={DollarSign}
            label="MRR"
            value={`R$${stats.mrr.toLocaleString()}`}
            change={`+${stats.mrrGrowth}%`}
            positive
          />
          <StatCard
            icon={TrendingUp}
            label="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            change={`Churn: ${stats.churnRate}%`}
          />
        </div>
      )}

      {/* Organizations Table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-10 pr-4 py-2 bg-muted border-0 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm outline-none"
            >
              <option value="all">Todos status</option>
              <option value="active">Ativos</option>
              <option value="trialing">Em trial</option>
              <option value="past_due">Atrasados</option>
              <option value="canceled">Cancelados</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Organização</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Membros</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Clientes</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Conteúdos</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Criado em</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrgs.map(org => (
                <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground">{org.owner_email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getPlanBadge(org.plan_id)}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(org.subscription_status)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm">{org.members_count}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm">{org.clients_count}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm">{org.contents_count}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrgs.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma organização encontrada
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link
          href="https://dashboard.stripe.com"
          target="_blank"
          className="p-4 bg-card border rounded-xl hover:border-purple-500/30 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Stripe Dashboard</div>
            <div className="text-sm text-muted-foreground">Gerenciar pagamentos</div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>

        <Link
          href="/admin/invoices"
          className="p-4 bg-card border rounded-xl hover:border-purple-500/30 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Faturas</div>
            <div className="text-sm text-muted-foreground">Histórico de cobranças</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        <Link
          href="/admin/support"
          className="p-4 bg-card border rounded-xl hover:border-purple-500/30 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Suporte</div>
            <div className="text-sm text-muted-foreground">3 tickets abertos</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
  icon: any
  label: string
  value: string | number
  change: string
  positive?: boolean
}) {
  return (
    <div className="p-4 bg-card border rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className={`text-sm ${positive ? 'text-green-500' : 'text-muted-foreground'}`}>
        {change}
      </div>
    </div>
  )
}
