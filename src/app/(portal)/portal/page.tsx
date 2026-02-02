'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, CheckCircle, FileText, TrendingUp,
  ArrowRight, Eye, Zap, Calendar
} from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Solicitacao, Cliente, ActivityLog } from '@/types/database'

const STATUS_COLORS: Record<string, string> = {
  aprovado_agendado: '#22c55e',
  concluido: '#22c55e',
  aprovacao_cliente: '#eab308',
  ajustes: '#eab308',
  em_producao: '#3b82f6',
  rascunho: '#3b82f6',
  publicado: '#22c55e',
}

const STATUS_LABELS: Record<string, string> = {
  aprovacao_cliente: 'Pendente',
  aprovado_agendado: 'Aprovado',
  ajustes: 'Ajuste',
  em_producao: 'Produção',
  rascunho: 'Rascunho',
  concluido: 'Concluído',
  publicado: 'Publicado',
}

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

function getLast6Months(): { month: number; year: number; label: string }[] {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: getMonthLabel(d) })
  }
  return months
}

export default function PortalHomePage() {
  const { org, member } = useAuth()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const [contRes, solRes] = await Promise.all([
      db.select('conteudos', {
        select: '*, empresa:clientes(id, nome, slug, cores)',
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
        order: [{ col: 'updated_at', asc: false }],
      }),
      db.select('solicitacoes', {
        select: '*, cliente:clientes(id, nome, slug, cores)',
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
        order: [{ col: 'created_at', asc: false }],
      }),
    ])

    setConteudos((contRes.data as any) || [])
    setSolicitacoes((solRes.data as any) || [])
    setLoading(false)
  }

  const months = useMemo(() => getLast6Months(), [])

  const chartData = useMemo(() => {
    return months.map(m => {
      const monthConteudos = conteudos.filter(c => {
        const d = new Date(c.created_at)
        return d.getMonth() + 1 === m.month && d.getFullYear() === m.year
      })
      const aprovados = monthConteudos.filter(c => ['aprovado_agendado', 'concluido', 'publicado'].includes(c.status)).length
      const producao = monthConteudos.filter(c => ['em_producao', 'rascunho'].includes(c.status)).length
      const pendentes = monthConteudos.filter(c => ['aprovacao_cliente', 'ajustes'].includes(c.status)).length
      return { ...m, aprovados, producao, pendentes, total: aprovados + producao + pendentes }
    })
  }, [conteudos, months])

  const maxTotal = useMemo(() => Math.max(...chartData.map(d => d.total), 1), [chartData])

  // Current month stats
  const now = new Date()
  const currentMonthConteudos = conteudos.filter(c => {
    const d = new Date(c.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const prontos = currentMonthConteudos.filter(c => ['aprovado_agendado', 'concluido', 'publicado'].includes(c.status)).length
  const totalMes = currentMonthConteudos.length
  const progressPercent = totalMes > 0 ? Math.round((prontos / totalMes) * 100) : 0

  // Summary cards
  const pendentesAprovacao = conteudos.filter(c => c.status === 'aprovacao_cliente').length
  const emProducao = conteudos.filter(c => ['em_producao', 'rascunho'].includes(c.status)).length
  const publicadosMes = currentMonthConteudos.filter(c => ['concluido', 'publicado', 'aprovado_agendado'].includes(c.status)).length

  // Timeline - combine recent conteudos and solicitacoes
  const timeline = useMemo(() => {
    const events: { id: string; type: string; title: string; desc: string; date: string; icon: string; color: string }[] = []

    conteudos.slice(0, 20).forEach(c => {
      if (['aprovado_agendado', 'concluido'].includes(c.status)) {
        events.push({
          id: c.id + '-apr',
          type: 'aprovacao',
          title: c.titulo || 'Conteúdo',
          desc: `${TIPO_EMOJI[c.tipo] || '📄'} Aprovado · ${c.empresa?.nome || ''}`,
          date: c.updated_at,
          icon: '✅',
          color: 'bg-green-100 text-green-700',
        })
      }
      if (c.status === 'aprovacao_cliente') {
        events.push({
          id: c.id + '-pend',
          type: 'pendente',
          title: c.titulo || 'Conteúdo',
          desc: `${TIPO_EMOJI[c.tipo] || '📄'} Aguardando aprovação · ${c.empresa?.nome || ''}`,
          date: c.updated_at,
          icon: '⏳',
          color: 'bg-yellow-100 text-yellow-700',
        })
      }
    })

    solicitacoes.slice(0, 10).forEach(s => {
      events.push({
        id: s.id + '-sol',
        type: 'solicitacao',
        title: s.titulo,
        desc: `Nova solicitação · ${(s as any).cliente?.nome || ''}`,
        date: s.created_at,
        icon: '📋',
        color: 'bg-blue-100 text-blue-700',
      })
    })

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  }, [conteudos, solicitacoes])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Olá, {member?.display_name?.split(' ')[0] || 'Cliente'} 👋
          </h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base">
            Acompanhe seus conteúdos e gerencie aprovações
          </p>
          {/* Monthly progress */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-100">Progresso do mês</span>
              <span className="text-sm font-bold">{prontos} de {totalMes} prontos</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-blue-200">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/portal/aprovacoes">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{pendentesAprovacao}</div>
                  <div className="text-sm text-gray-500 mt-1">Pendentes de aprovação</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/conteudos">
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-indigo-50 cursor-pointer">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-900">{emProducao}</div>
                  <div className="text-sm text-gray-500 mt-1">Em produção</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{publicadosMes}</div>
                <div className="text-sm text-gray-500 mt-1">Publicados este mês</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200/50">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Conteúdos por mês</h3>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">Aprovados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Produção</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-gray-500">Pendentes</span>
            </div>
          </div>
        </div>
        <CardContent className="py-6">
          <div className="flex items-end gap-3 h-48">
            {chartData.map((d, i) => {
              const barHeight = d.total > 0 ? (d.total / maxTotal) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">{d.total}</span>
                  <div className="w-full relative flex flex-col justify-end" style={{ height: '160px' }}>
                    <div
                      className="w-full rounded-t-lg overflow-hidden transition-all duration-700 ease-out flex flex-col justify-end"
                      style={{
                        height: `${Math.max(barHeight, d.total > 0 ? 8 : 0)}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    >
                      {d.aprovados > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 transition-all duration-500"
                          style={{ height: `${(d.aprovados / d.total) * 100}%`, minHeight: '4px' }}
                        />
                      )}
                      {d.producao > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ height: `${(d.producao / d.total) * 100}%`, minHeight: '4px' }}
                        />
                      )}
                      {d.pendentes > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-yellow-500 to-yellow-400 transition-all duration-500"
                          style={{ height: `${(d.pendentes / d.total) * 100}%`, minHeight: '4px' }}
                        />
                      )}
                    </div>
                    {d.total === 0 && (
                      <div className="w-full h-1 bg-gray-100 rounded-full" />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{d.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">⚡ Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/portal/solicitar">
              <div className="group p-5 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 cursor-pointer transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-gray-900">Nova Solicitação</div>
                <div className="text-xs text-gray-500 mt-0.5">Pedir conteúdo</div>
              </div>
            </Link>
            <Link href="/portal/aprovacoes">
              <div className="group p-5 rounded-xl border-2 border-dashed border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/50 to-orange-50/50 cursor-pointer transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-gray-900">Aprovações</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {pendentesAprovacao > 0 ? `${pendentesAprovacao} pendente(s)` : 'Nenhuma'}
                </div>
              </div>
            </Link>
            <Link href="/portal/conteudos">
              <div className="group p-5 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50/50 to-emerald-50/50 cursor-pointer transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-gray-900">Meus Conteúdos</div>
                <div className="text-xs text-gray-500 mt-0.5">{conteudos.length} total</div>
              </div>
            </Link>
            <Link href="/portal/conteudos">
              <div className="group p-5 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 bg-gradient-to-br from-purple-50/50 to-violet-50/50 cursor-pointer transition-all hover:shadow-md">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold text-gray-900">Calendário</div>
                <div className="text-xs text-gray-500 mt-0.5">Ver agenda</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">🕐 Atividades Recentes</h3>
          {timeline.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {timeline.map((event, i) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${event.color}`}>
                    {event.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
                    <div className="text-xs text-gray-400">{event.desc}</div>
                  </div>
                  <div className="text-xs text-gray-300 whitespace-nowrap">
                    {formatTimeAgo(event.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
