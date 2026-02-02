'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_CONFIG, TIPO_EMOJI, formatDate } from '@/lib/utils'
import {
  FileText, CheckCircle, Clock, AlertTriangle, Inbox,
  ArrowRight, Bell, BellDot, Eye, Kanban, Calendar,
  TrendingUp, Users, Flame, Target,
} from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente, Notification, Solicitacao } from '@/types/database'

function timeAgo(dateStr: string) {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function DashboardPage() {
  const { org, member, user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    total: 0, producao: 0, revisao: 0, design: 0,
    aprovacao: 0, atrasados: 0, aprovados: 0, concluidos_mes: 0,
  })
  const [minhasTarefas, setMinhasTarefas] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [proximos, setProximos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [notificacoes, setNotificacoes] = useState<Notification[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org || !user) return
    load()
  }, [org, user])

  async function load() {
    const now = new Date()
    const hoje = now.toISOString().split('T')[0]
    const mesAtual = now.getMonth() + 1
    const anoAtual = now.getFullYear()

    // All conteúdos for stats
    const { data: conteudos } = await db.select('conteudos', {
      select: '*, empresa:clientes(id, nome, slug, cores)',
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'updated_at', asc: false }],
    })

    const all: Conteudo[] = conteudos || []

    // Stats
    const statusActive = ['producao', 'revisao', 'design', 'aprovacao_cliente', 'ajuste']
    const atrasados = all.filter(c =>
      c.data_publicacao && c.data_publicacao < hoje &&
      !['aprovado', 'agendado', 'publicado'].includes(c.status)
    )
    const concluidos = all.filter(c =>
      ['aprovado', 'agendado', 'publicado'].includes(c.status) &&
      c.mes === mesAtual && c.ano === anoAtual
    )

    setStats({
      total: all.length,
      producao: all.filter(c => c.status === 'producao').length,
      revisao: all.filter(c => c.status === 'revisao').length,
      design: all.filter(c => c.status === 'design').length,
      aprovacao: all.filter(c => c.status === 'aprovacao_cliente').length,
      atrasados: atrasados.length,
      aprovados: all.filter(c => c.status === 'aprovado').length,
      concluidos_mes: concluidos.length,
    })

    // Minhas tarefas - assigned to current user, in active statuses
    const minhas = all.filter(c =>
      c.assigned_to === user!.id && statusActive.includes(c.status)
    ).slice(0, 8)
    setMinhasTarefas(minhas as any)

    // Próximas entregas
    const prox = all.filter(c =>
      c.data_publicacao && c.data_publicacao >= hoje &&
      !['aprovado', 'publicado'].includes(c.status)
    ).sort((a, b) => (a.data_publicacao || '').localeCompare(b.data_publicacao || '')).slice(0, 6)
    setProximos(prox as any)

    // Solicitações pendentes (todas que não foram finalizadas)
    const { data: sols } = await db.select('solicitacoes', {
      select: '*, cliente:clientes(id, nome, slug, cores)',
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'in', col: 'status', val: ['nova', 'em_analise', 'aprovada'] },
      ],
      order: [{ col: 'created_at', asc: false }],
      limit: 5,
    })
    setSolicitacoes((sols as any) || [])

    // Notificações recentes
    const { data: notifs } = await db.select('notifications', {
      filters: [{ op: 'eq', col: 'user_id', val: user!.id }],
      order: [{ col: 'created_at', asc: false }],
      limit: 5,
    })
    setNotificacoes(notifs || [])

    // Clientes
    const { data: cls } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    setClientes(cls || [])

    setLoading(false)
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Em Produção', value: stats.producao, icon: Flame, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
    { label: 'Em Revisão', value: stats.revisao, icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
    { label: 'Aguardando Aprovação', value: stats.aprovacao, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
    { label: 'Atrasados', value: stats.atrasados, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' },
  ]

  const PRIORIDADE_COLOR: Record<string, string> = {
    urgente: 'bg-red-100 text-red-700',
    alta: 'bg-orange-100 text-orange-700',
    normal: 'bg-blue-100 text-blue-700',
    baixa: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">
            Olá, {member?.display_name?.split(' ')[0] || 'Bem-vindo'} 👋
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-sm:text-xs">
            {stats.total} conteúdos • {stats.concluidos_mes} concluídos este mês
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/workflow">
            <Button size="sm" variant="outline">
              <Kanban className="w-4 h-4" /> Workflow
            </Button>
          </Link>
          <Link href="/calendario">
            <Button size="sm" variant="outline">
              <Calendar className="w-4 h-4" /> Calendário
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards - Pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((s, i) => (
          <Card key={i} className={`hover:shadow-md transition-shadow ${s.value > 0 ? `ring-1 ${s.ring}` : ''}`}>
            <CardContent className="flex items-center gap-3 py-4 max-sm:gap-2 max-sm:py-3">
              <div className={`p-2.5 rounded-xl ${s.bg} max-sm:p-2`}>
                <s.icon className={`w-5 h-5 ${s.color} max-sm:w-4 max-sm:h-4`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-zinc-900 max-sm:text-xl">{s.value}</div>
                <div className="text-[11px] text-zinc-500 truncate max-sm:text-[10px]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar do mês */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Progresso do mês
            </span>
            <span className="text-sm font-bold text-zinc-900">
              {stats.concluidos_mes} / {stats.total || 1}
            </span>
          </div>
          <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.concluidos_mes / stats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-zinc-400">
            <span>✍️ Produção: {stats.producao}</span>
            <span>🔍 Revisão: {stats.revisao}</span>
            <span>🎨 Design: {stats.design}</span>
            <span>👁️ Aprovação: {stats.aprovacao}</span>
            <span>✅ Aprovados: {stats.aprovados}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Minhas Tarefas */}
          <Card>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Minhas Tarefas
              </h3>
              <Link href="/workflow" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver workflow <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <CardContent className="p-0 max-h-96 overflow-y-auto scrollbar-thin">
              {minhasTarefas.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">Nenhuma tarefa pendente</p>
                  <p className="text-xs text-zinc-300 mt-1">Todas as tarefas atribuídas a você estão em dia!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {minhasTarefas.map(c => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.rascunho
                    const isAtrasado = c.data_publicacao && c.data_publicacao < new Date().toISOString().split('T')[0]
                    return (
                      <Link
                        key={c.id}
                        href={`/clientes/${(c.empresa as any)?.slug}/conteudo/${c.id}`}
                        className={`flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors ${isAtrasado ? 'bg-red-50/40' : ''}`}
                      >
                        <div
                          className="w-1.5 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <div className="text-lg flex-shrink-0">{TIPO_EMOJI[c.tipo] || '📄'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 truncate">
                            {c.titulo || 'Sem título'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-zinc-400">{(c.empresa as any)?.nome}</span>
                            {isAtrasado && (
                              <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Atrasado
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            className="text-[10px] px-2 py-0.5"
                            style={{ backgroundColor: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}30` }}
                          >
                            {cfg.emoji} {cfg.label}
                          </Badge>
                          {c.data_publicacao && (
                            <span className="text-[10px] text-zinc-400">{formatDate(c.data_publicacao)}</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitações Pendentes */}
          {solicitacoes.length > 0 && (
            <Card>
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-purple-500" /> Solicitações Pendentes
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {solicitacoes.length}
                  </span>
                </h3>
                <Link href="/solicitacoes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-50">
                  {solicitacoes.map(sol => (
                    <Link
                      key={sol.id}
                      href="/solicitacoes"
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="w-1.5 h-10 rounded-full flex-shrink-0 bg-purple-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">{sol.titulo}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {(sol.cliente as any)?.nome} • {timeAgo(sol.created_at)}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${PRIORIDADE_COLOR[sol.prioridade] || PRIORIDADE_COLOR.normal}`}>
                        {sol.prioridade}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Próximas Entregas */}
          <Card>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" /> Próximas Entregas
              </h3>
              <Link href="/calendario" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver calendário <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <CardContent className="p-0 max-h-72 overflow-y-auto scrollbar-thin">
              {proximos.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-400">
                  Nenhuma entrega próxima 🎉
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {proximos.map(c => (
                    <Link
                      key={c.id}
                      href={`/clientes/${(c.empresa as any)?.slug}/conteudo/${c.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="text-lg">{TIPO_EMOJI[c.tipo] || '📄'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">{c.titulo || 'Sem título'}</div>
                        <div className="text-[11px] text-zinc-400">{(c.empresa as any)?.nome}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-zinc-700">{formatDate(c.data_publicacao)}</div>
                        <div className="text-[10px] text-zinc-400">
                          {STATUS_CONFIG[c.status]?.emoji} {STATUS_CONFIG[c.status]?.label}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar direita */}
        <div className="space-y-6">

          {/* Notificações */}
          <Card>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                {notificacoes.some(n => !n.read) ? (
                  <BellDot className="w-4 h-4 text-red-500" />
                ) : (
                  <Bell className="w-4 h-4 text-zinc-400" />
                )}
                Notificações
              </h3>
              <Link href="/notificacoes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <CardContent className="p-0">
              {notificacoes.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {notificacoes.map(n => (
                    <Link
                      key={n.id}
                      href="/notificacoes"
                      className={`flex gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${!n.read ? 'bg-blue-500' : 'bg-zinc-200'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-zinc-800 line-clamp-1">{n.title}</div>
                        {n.body && <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-zinc-300 mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clientes */}
          <Card>
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Clientes
              </h3>
              <Link href="/clientes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <CardContent className="p-0">
              {clientes.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-zinc-400 mb-2">Nenhum cliente</p>
                  <Link href="/clientes" className="text-xs text-blue-600 hover:underline">+ Adicionar</Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {clientes.map(c => (
                    <Link
                      key={c.id}
                      href={`/clientes/${c.slug}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <Avatar name={c.nome} src={c.logo_url} color={c.cores?.primaria} size="sm" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{c.nome}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-300" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="py-4">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Resumo Geral
              </h4>
              <div className="space-y-2.5">
                {[
                  { label: 'Total conteúdos', value: stats.total, color: 'bg-blue-500' },
                  { label: 'Em produção', value: stats.producao, color: 'bg-emerald-500' },
                  { label: 'Aprovados', value: stats.aprovados, color: 'bg-green-500' },
                  { label: 'Atrasados', value: stats.atrasados, color: 'bg-red-500' },
                  { label: 'Concluídos (mês)', value: stats.concluidos_mes, color: 'bg-violet-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-zinc-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
