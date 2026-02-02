'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  BarChart3, Users, Eye, TrendingUp, Heart, RefreshCw,
  Instagram, Youtube, Facebook, Linkedin, Twitter, Zap, Hash,
  ArrowUpRight, ArrowDownRight, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import type { Cliente } from '@/types/database'

interface Snapshot {
  id: string
  platform: string
  snapshot_date: string
  followers: number
  impressions: number
  reach: number
  profile_views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  raw_data: any
}

interface SocialAccount {
  platform: string
  profile_name: string
  profile_avatar: string
}

const PLATFORM_CONFIG: Record<string, { name: string; icon: any; color: string; gradient: string }> = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', gradient: 'from-pink-500 to-rose-600' },
  tiktok: { name: 'TikTok', icon: Zap, color: '#000000', gradient: 'from-gray-800 to-black' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000', gradient: 'from-red-500 to-red-700' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', gradient: 'from-blue-500 to-blue-700' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', gradient: 'from-blue-600 to-blue-800' },
  x: { name: 'X / Twitter', icon: Twitter, color: '#1DA1F2', gradient: 'from-sky-400 to-sky-600' },
  threads: { name: 'Threads', icon: Hash, color: '#000000', gradient: 'from-gray-700 to-gray-900' },
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function formatDate(dateStr: any): string {
  const str = String(dateStr)
  const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function AnalyticsPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [history, setHistory] = useState<Snapshot[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activePlatform, setActivePlatform] = useState<string | null>(null)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, slug])

  async function loadData() {
    setLoading(true)

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

    // Fetch current analytics
    try {
      const res = await fetch(`/api/analytics/fetch?clienteSlug=${slug}`)
      const data = await res.json()
      if (data.success) {
        setSnapshots(data.snapshots || [])
        setSocialAccounts(data.social_accounts || [])
        if (data.snapshots?.length > 0 && !activePlatform) {
          setActivePlatform(data.snapshots[0].platform)
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    }

    // Fetch history for charts
    try {
      const histRes = await fetch(`/api/analytics/history?clienteSlug=${slug}&days=30`)
      const histData = await histRes.json()
      if (histData.success) {
        setHistory(histData.snapshots || [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }

    setLoading(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/analytics/fetch?clienteSlug=${slug}`)
      const data = await res.json()
      if (data.success) {
        setSnapshots(data.snapshots || [])
        setSocialAccounts(data.social_accounts || [])
        toast('Métricas atualizadas!', 'success')
      } else {
        toast(data.error || 'Erro ao atualizar métricas', 'error')
      }

      // Refresh history too
      const histRes = await fetch(`/api/analytics/history?clienteSlug=${slug}&days=30`)
      const histData = await histRes.json()
      if (histData.success) {
        setHistory(histData.snapshots || [])
      }
    } catch (err) {
      toast('Erro ao atualizar métricas', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // Aggregate metrics
  const totalFollowers = snapshots.reduce((sum, s) => sum + (s.followers || 0), 0)
  const avgReach = snapshots.length > 0
    ? Math.round(snapshots.reduce((sum, s) => sum + (s.reach || 0), 0) / snapshots.length)
    : 0
  const avgEngagement = snapshots.length > 0
    ? (snapshots.reduce((sum, s) => sum + (s.engagement_rate || 0), 0) / snapshots.length).toFixed(1)
    : '0'
  const totalInteractions = snapshots.reduce(
    (sum, s) => sum + (s.likes || 0) + (s.comments || 0) + (s.shares || 0), 0
  )

  // Group history by date for chart
  const chartData = (() => {
    const dateMap: Record<string, { date: string; followers: number; reach: number; impressions: number }> = {}
    for (const h of history) {
      const key = h.snapshot_date
      if (!dateMap[key]) {
        dateMap[key] = { date: key, followers: 0, reach: 0, impressions: 0 }
      }
      dateMap[key].followers += h.followers || 0
      dateMap[key].reach += h.reach || 0
      dateMap[key].impressions += h.impressions || 0
    }
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  })()

  // Platform-specific history
  const platformHistory = activePlatform
    ? history.filter(h => h.platform === activePlatform).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    : []

  const platforms = [...new Set(snapshots.map(s => s.platform))]

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

  // Empty state - no social accounts connected
  if (socialAccounts.length === 0 && snapshots.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
            <p className="text-sm text-zinc-500">{cliente.nome}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Nenhuma rede social conectada</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
              Conecte as redes sociais do cliente para começar a acompanhar métricas de seguidores, alcance e engajamento.
            </p>
            <Link href={`/clientes/${slug}/redes`}>
              <Button variant="primary">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar Redes Sociais
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
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
            <p className="text-sm text-zinc-500">Métricas de {cliente.nome}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar métricas'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                {totalFollowers > 0 && (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    Ativo
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-zinc-900">{formatNumber(totalFollowers)}</div>
              <div className="text-xs text-zinc-500 mt-1">Total seguidores</div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Eye className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900">{formatNumber(avgReach)}</div>
              <div className="text-xs text-zinc-500 mt-1">Alcance médio</div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900">{avgEngagement}%</div>
              <div className="text-xs text-zinc-500 mt-1">Engajamento médio</div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <Heart className="w-5 h-5 text-rose-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-zinc-900">{formatNumber(totalInteractions)}</div>
              <div className="text-xs text-zinc-500 mt-1">Interações totais</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">📈 Crescimento de Seguidores (30 dias)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    labelFormatter={formatDate}
                    formatter={(value: any) => [formatNumber(Number(value) || 0), 'Seguidores']}
                  />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorFollowers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Tabs */}
      {platforms.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">📱 Métricas por Plataforma</h3>

            {/* Platform selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {platforms.map(p => {
                const config = PLATFORM_CONFIG[p]
                if (!config) return null
                const Icon = config.icon
                const isActive = activePlatform === p
                return (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-white shadow-lg scale-105'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                    style={isActive ? { backgroundColor: config.color } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {config.name}
                  </button>
                )
              })}
            </div>

            {/* Active platform metrics */}
            {activePlatform && (() => {
              const snapshot = snapshots.find(s => s.platform === activePlatform)
              const config = PLATFORM_CONFIG[activePlatform]
              if (!snapshot || !config) return null

              return (
                <div className="space-y-6">
                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Seguidores', value: snapshot.followers, icon: Users },
                      { label: 'Alcance', value: snapshot.reach, icon: Eye },
                      { label: 'Impressões', value: snapshot.impressions, icon: BarChart3 },
                      { label: 'Visitas perfil', value: snapshot.profile_views, icon: TrendingUp },
                      { label: 'Curtidas', value: snapshot.likes, icon: Heart },
                      { label: 'Comentários', value: snapshot.comments, icon: Hash },
                      { label: 'Compartilhamentos', value: snapshot.shares, icon: ExternalLink },
                      { label: 'Engajamento', value: `${snapshot.engagement_rate}%`, icon: TrendingUp },
                    ].map((metric, i) => {
                      const MIcon = metric.icon
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <MIcon className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs text-zinc-500">{metric.label}</span>
                          </div>
                          <div className="text-lg font-bold text-zinc-900">
                            {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Platform history chart */}
                  {platformHistory.length > 1 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-zinc-600 mb-3">
                        Evolução - {config.name}
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={platformHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                              dataKey="snapshot_date"
                              tickFormatter={formatDate}
                              tick={{ fontSize: 10, fill: '#94a3b8' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tickFormatter={formatNumber}
                              tick={{ fontSize: 10, fill: '#94a3b8' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#18181b',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '12px',
                              }}
                              labelFormatter={formatDate}
                              formatter={(value: any) => [formatNumber(Number(value) || 0), 'Alcance']}
                            />
                            <Bar dataKey="reach" fill={config.color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* All platforms overview cards */}
      {snapshots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map(snapshot => {
            const config = PLATFORM_CONFIG[snapshot.platform]
            if (!config) return null
            const Icon = config.icon
            return (
              <Card key={snapshot.id} className="overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-r ${config.gradient} px-5 py-3`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-white" />
                      <span className="text-white font-semibold text-sm">{config.name}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Seguidores</span>
                      <span className="font-bold text-zinc-900">{formatNumber(snapshot.followers)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Alcance</span>
                      <span className="font-medium text-zinc-700">{formatNumber(snapshot.reach)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Engajamento</span>
                      <span className="font-medium text-zinc-700">{snapshot.engagement_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Interações</span>
                      <span className="font-medium text-zinc-700">
                        {formatNumber((snapshot.likes || 0) + (snapshot.comments || 0) + (snapshot.shares || 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
