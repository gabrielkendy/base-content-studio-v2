'use client'

import { useEffect, useState } from 'react'
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
  ArrowUpRight, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

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
}

interface Cliente {
  id: string
  nome: string
  slug: string
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

export default function PortalAnalyticsPage() {
  const { org, member } = useAuth()
  const { toast } = useToast()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [history, setHistory] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activePlatform, setActivePlatform] = useState<string | null>(null)

  useEffect(() => {
    if (!org || !member) return
    loadClientes()
  }, [org, member])

  useEffect(() => {
    if (selectedCliente) {
      loadAnalytics(selectedCliente)
    }
  }, [selectedCliente])

  async function loadClientes() {
    setLoading(true)

    // For portal users, get clients they have access to
    const { data: memberClients } = await db.select('member_clients', {
      filters: [
        { op: 'eq', col: 'member_id', val: member!.id },
        { op: 'eq', col: 'org_id', val: org!.id },
      ],
    })

    if (memberClients && memberClients.length > 0) {
      const clienteIds = memberClients.map((mc: any) => mc.cliente_id)
      const { data: clientesList } = await db.select('clientes', {
        filters: [
          { op: 'in', col: 'id', val: clienteIds },
        ],
      })
      const list = clientesList || []
      setClientes(list)
      if (list.length === 1) {
        setSelectedCliente(list[0])
      } else if (list.length > 0) {
        setSelectedCliente(list[0])
      }
    } else {
      // Fallback: try loading all clients for this org (for admin/manager in portal)
      const { data: allClientes } = await db.select('clientes', {
        filters: [
          { op: 'eq', col: 'org_id', val: org!.id },
        ],
      })
      const list = allClientes || []
      setClientes(list)
      if (list.length > 0) setSelectedCliente(list[0])
    }

    setLoading(false)
  }

  async function loadAnalytics(cliente: Cliente) {
    try {
      const res = await fetch(`/api/analytics/fetch?clienteSlug=${cliente.slug}`)
      const data = await res.json()
      if (data.success) {
        setSnapshots(data.snapshots || [])
        if (data.snapshots?.length > 0 && !activePlatform) {
          setActivePlatform(data.snapshots[0].platform)
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
    }

    try {
      const histRes = await fetch(`/api/analytics/history?clienteSlug=${cliente.slug}&days=30`)
      const histData = await histRes.json()
      if (histData.success) {
        setHistory(histData.snapshots || [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  async function handleRefresh() {
    if (!selectedCliente) return
    setRefreshing(true)
    try {
      await loadAnalytics(selectedCliente)
      toast('Métricas atualizadas!', 'success')
    } catch {
      toast('Erro ao atualizar', 'error')
    } finally {
      setRefreshing(false)
    }
  }

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

  const chartData = (() => {
    const dateMap: Record<string, { date: string; followers: number; reach: number }> = {}
    for (const h of history) {
      const key = h.snapshot_date
      if (!dateMap[key]) dateMap[key] = { date: key, followers: 0, reach: 0 }
      dateMap[key].followers += h.followers || 0
      dateMap[key].reach += h.reach || 0
    }
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  })()

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

  if (clientes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics</h2>
        <p className="text-gray-500">Nenhum cliente vinculado à sua conta.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Acompanhe suas métricas</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Client selector (if multiple) */}
      {clientes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {clientes.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCliente(c); setActivePlatform(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCliente?.id === c.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {snapshots.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma métrica disponível</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Conecte suas redes sociais para começar a ver métricas de desempenho.
            </p>
            <Link href="/portal/redes">
              <Button variant="primary">
                <ExternalLink className="w-4 h-4 mr-2" />
                Conectar Redes Sociais
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {snapshots.length > 0 && (
        <>
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
                        <ArrowUpRight className="w-3 h-3 mr-0.5" /> Ativo
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(totalFollowers)}</div>
                  <div className="text-xs text-gray-500 mt-1">Total seguidores</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-5">
                  <div className="p-2 rounded-lg bg-purple-500/20 mb-3 w-fit">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(avgReach)}</div>
                  <div className="text-xs text-gray-500 mt-1">Alcance médio</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 mb-3 w-fit">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{avgEngagement}%</div>
                  <div className="text-xs text-gray-500 mt-1">Engajamento médio</div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 p-5">
                  <div className="p-2 rounded-lg bg-rose-500/20 mb-3 w-fit">
                    <Heart className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(totalInteractions)}</div>
                  <div className="text-xs text-gray-500 mt-1">Interações totais</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">📈 Crescimento de Seguidores (30 dias)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="portalColorFollowers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                          backgroundColor: '#1e293b',
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
                        fill="url(#portalColorFollowers)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform cards */}
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
                        <span className="text-xs text-gray-500">Seguidores</span>
                        <span className="font-bold text-gray-900">{formatNumber(snapshot.followers)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Alcance</span>
                        <span className="font-medium text-gray-700">{formatNumber(snapshot.reach)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Engajamento</span>
                        <span className="font-medium text-gray-700">{snapshot.engagement_rate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Interações</span>
                        <span className="font-medium text-gray-700">
                          {formatNumber((snapshot.likes || 0) + (snapshot.comments || 0) + (snapshot.shares || 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
