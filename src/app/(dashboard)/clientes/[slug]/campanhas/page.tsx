'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  DollarSign, Users, TrendingUp, Target, RefreshCw,
  Play, Pause, AlertTriangle, CheckCircle, XCircle,
  Calendar, ChevronDown, Settings,
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

interface Campaign {
  campaign_id: string
  campaign_name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  spend: number
  results: number
  cost_per_result: number
  roas: number
  daily_budget?: number
  lifetime_budget?: number
}

interface Totals {
  spend: number
  results: number
  cost_per_result: number
  roas: number
  active_campaigns: number
  total_campaigns: number
}

const DATE_PRESETS = {
  'today': 'Hoje',
  'yesterday': 'Ontem',
  'last_7d': 'Últimos 7 dias',
  'last_14d': 'Últimos 14 dias',
  'last_30d': 'Últimos 30 dias',
  'this_month': 'Este mês',
  'last_month': 'Mês passado',
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Ativa', color: 'bg-green-100 text-green-700', icon: Play },
  PAUSED: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
  DELETED: { label: 'Excluída', color: 'bg-red-100 text-red-700', icon: XCircle },
  ARCHIVED: { label: 'Arquivada', color: 'bg-zinc-100 text-zinc-700', icon: XCircle },
}

const OBJECTIVE_LABELS: Record<string, string> = {
  'OUTCOME_LEADS': 'Leads',
  'LEAD_GENERATION': 'Leads',
  'OUTCOME_SALES': 'Vendas',
  'CONVERSIONS': 'Conversões',
  'OUTCOME_TRAFFIC': 'Tráfego',
  'LINK_CLICKS': 'Cliques',
  'OUTCOME_AWARENESS': 'Reconhecimento',
  'REACH': 'Alcance',
  'OUTCOME_ENGAGEMENT': 'Engajamento',
  'POST_ENGAGEMENT': 'Engajamento',
  'MESSAGES': 'Mensagens',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

// Tag de alerta baseada na performance
function getAlertTag(campaign: Campaign): { label: string; color: string; icon: any } | null {
  // ROAS negativo
  if (campaign.spend > 50 && campaign.roas > 0 && campaign.roas < 1) {
    return { label: 'ROAS Baixo', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
  }
  
  // CPL muito alto (> R$100)
  if (campaign.results > 0 && campaign.cost_per_result > 100) {
    return { label: 'CPL Alto', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle }
  }
  
  // Campanha ativa sem resultados e gastando
  if (campaign.status === 'ACTIVE' && campaign.spend > 100 && campaign.results === 0) {
    return { label: 'Sem Resultados', color: 'bg-red-100 text-red-700', icon: XCircle }
  }
  
  // Performance boa
  if (campaign.roas >= 3) {
    return { label: 'Alta Performance', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  }
  
  // CPL baixo (< R$20 e tem resultados)
  if (campaign.results >= 5 && campaign.cost_per_result > 0 && campaign.cost_per_result < 20) {
    return { label: 'CPL Ótimo', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  }
  
  return null
}

export default function CampanhasPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [datePreset, setDatePreset] = useState('last_7d')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, slug, datePreset])

  async function loadData() {
    setLoading(true)

    // Buscar cliente
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })

    if (!c) {
      setLoading(false)
      return
    }

    setCliente(c)

    // Buscar campanhas
    try {
      const res = await fetch(`/api/campaigns?clienteSlug=${slug}&datePreset=${datePreset}`)
      const data = await res.json()
      
      if (data.success) {
        setCampaigns(data.campaigns || [])
        setTotals(data.totals || null)
        setNeedsSetup(data.needs_setup || false)
      } else {
        toast(data.error || 'Erro ao carregar campanhas', 'error')
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      toast('Erro ao carregar campanhas', 'error')
    }

    setLoading(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast('Campanhas atualizadas!', 'success')
  }

  // Filtrar campanhas por status
  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === statusFilter)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (!cliente) {
    return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>
  }

  // Estado: precisa configurar conta de anúncios
  if (needsSetup) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Campanhas</h1>
            <p className="text-sm text-zinc-500">{cliente.nome}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">📢</div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Conta de anúncios não configurada</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
              Configure a conta de anúncios do Facebook para visualizar as campanhas deste cliente.
            </p>
            <Link href={`/clientes/${slug}`}>
              <Button variant="primary">
                <Settings className="w-4 h-4 mr-2" />
                Configurar Conta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Campanhas</h1>
            <p className="text-sm text-zinc-500">{cliente.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {DATE_PRESETS[datePreset as keyof typeof DATE_PRESETS]}
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 z-50 min-w-[160px]">
                {Object.entries(DATE_PRESETS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 ${
                      datePreset === key ? 'bg-zinc-100 font-medium' : ''
                    }`}
                    onClick={() => {
                      setDatePreset(key)
                      setShowDatePicker(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-900">{formatCurrency(totals.spend)}</div>
                <div className="text-xs text-zinc-500 mt-1">Gasto total</div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-900">{formatNumber(totals.results)}</div>
                <div className="text-xs text-zinc-500 mt-1">Resultados</div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-900">
                  {totals.cost_per_result > 0 ? formatCurrency(totals.cost_per_result) : '-'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">Custo por resultado</div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-zinc-900">
                  {totals.roas > 0 ? `${totals.roas.toFixed(2)}x` : '-'}
                </div>
                <div className="text-xs text-zinc-500 mt-1">ROAS médio</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('all')}
        >
          Todas ({campaigns.length})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'ACTIVE' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('ACTIVE')}
        >
          <Play className="w-3 h-3 mr-1" />
          Ativas ({campaigns.filter(c => c.status === 'ACTIVE').length})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'PAUSED' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('PAUSED')}
        >
          <Pause className="w-3 h-3 mr-1" />
          Pausadas ({campaigns.filter(c => c.status === 'PAUSED').length})
        </Button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-zinc-500">Nenhuma campanha encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map(campaign => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PAUSED
            const StatusIcon = statusConfig.icon
            const alertTag = getAlertTag(campaign)
            const AlertIcon = alertTag?.icon

            return (
              <Card key={campaign.campaign_id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Campaign info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-900 truncate">
                          {campaign.campaign_name}
                        </h3>
                        <Badge className={`${statusConfig.color} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {alertTag && (
                          <Badge className={`${alertTag.color} text-xs`}>
                            {AlertIcon && <AlertIcon className="w-3 h-3 mr-1" />}
                            {alertTag.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                        {campaign.daily_budget && (
                          <span className="ml-2">• Orçamento: {formatCurrency(campaign.daily_budget)}/dia</span>
                        )}
                      </p>
                    </div>

                    {/* Right side - Metrics */}
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="text-lg font-bold text-zinc-900">
                          {formatCurrency(campaign.spend)}
                        </div>
                        <div className="text-xs text-zinc-500">Gasto</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-zinc-900">
                          {formatNumber(campaign.results)}
                        </div>
                        <div className="text-xs text-zinc-500">Resultados</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-zinc-900">
                          {campaign.cost_per_result > 0 ? formatCurrency(campaign.cost_per_result) : '-'}
                        </div>
                        <div className="text-xs text-zinc-500">CPR</div>
                      </div>
                      {campaign.roas > 0 && (
                        <div>
                          <div className={`text-lg font-bold ${campaign.roas >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {campaign.roas.toFixed(2)}x
                          </div>
                          <div className="text-xs text-zinc-500">ROAS</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
