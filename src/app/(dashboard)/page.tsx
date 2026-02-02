'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_CONFIG, TIPO_EMOJI, formatDate } from '@/lib/utils'
import {
  FileText, CheckCircle, Clock, AlertTriangle,
  TrendingUp, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, ActivityLog, Cliente } from '@/types/database'

export default function DashboardPage() {
  const { org, member, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({ total: 0, pendentes: 0, atrasados: 0, concluidos: 0 })
  const [proximos, setProximos] = useState<(Conteudo & { empresa: Cliente })[]>([])
  const [atividades, setAtividades] = useState<ActivityLog[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return

    async function load() {
      const now = new Date()
      const hoje = now.toISOString().split('T')[0]

      // Stats
      const { data: conteudos } = await db.select('conteudos', {
        select: 'id, status, data_publicacao',
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      })

      const all = conteudos || []

      setStats({
        total: all.length,
        pendentes: all.filter((c: any) => ['rascunho', 'conteudo', 'aprovacao_cliente'].includes(c.status)).length,
        atrasados: all.filter((c: any) => c.data_publicacao && c.data_publicacao < hoje && !['concluido', 'aprovado_agendado'].includes(c.status)).length,
        concluidos: all.filter((c: any) => c.status === 'concluido').length,
      })

      // Próximos conteúdos
      const { data: prox } = await db.select('conteudos', {
        select: '*, empresa:clientes(*)',
        filters: [
          { op: 'eq', col: 'org_id', val: org!.id },
          { op: 'gte', col: 'data_publicacao', val: hoje },
          { op: 'not', col: 'status', val: 'concluido', nop: 'eq' },
        ],
        order: [{ col: 'data_publicacao', asc: true }],
        limit: 6,
      })

      setProximos((prox as any) || [])

      // Clientes
      const { data: cls } = await db.select('clientes', {
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
        order: [{ col: 'nome', asc: true }],
      })

      setClientes(cls || [])

      // Atividade recente
      const { data: acts } = await db.select('activity_log', {
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
        order: [{ col: 'created_at', asc: false }],
        limit: 10,
      })

      setAtividades(acts || [])
      setLoading(false)
    }

    load()
  }, [org])

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Total de conteúdos', value: stats.total, icon: FileText, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'bg-amber-500', bg: 'bg-amber-50' },
    { label: 'Atrasados', value: stats.atrasados, icon: AlertTriangle, color: 'bg-red-500', bg: 'bg-red-50' },
    { label: 'Concluídos (mês)', value: stats.concluidos, icon: CheckCircle, color: 'bg-green-500', bg: 'bg-green-50' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">
          Olá, {member?.display_name?.split(' ')[0] || 'Bem-vindo'} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1 max-sm:text-xs">
          Aqui está o resumo da sua organização
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {STAT_CARDS.map((s, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-3 py-4 max-sm:gap-2 max-sm:py-3">
              <div className={`p-2 rounded-lg ${s.bg} max-sm:p-1.5`}>
                <s.icon className={`w-5 h-5 text-white ${s.color} rounded-lg p-0.5 max-sm:w-4 max-sm:h-4`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold text-zinc-900 max-sm:text-lg">{s.value}</div>
                <div className="text-xs text-zinc-500 truncate max-sm:text-[10px]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas entregas */}
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">📅 Próximas entregas</h3>
            <Link href="/calendario" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver calendário <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-0 max-h-80 overflow-y-auto scrollbar-thin">
            {proximos.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                Nenhuma entrega próxima 🎉
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {proximos.map(c => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.empresa?.slug}/conteudo/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors max-sm:gap-2 max-sm:px-3 max-sm:py-2"
                  >
                    <div className="text-lg max-sm:text-base">{TIPO_EMOJI[c.tipo] || '📄'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate max-sm:text-xs">{c.titulo || 'Sem título'}</div>
                      <div className="text-xs text-zinc-400 max-sm:text-[10px]">{c.empresa?.nome}</div>
                    </div>
                    <div className="text-xs text-zinc-500 max-sm:text-[10px] max-sm:hidden">{formatDate(c.data_publicacao)}</div>
                    <div className="max-sm:flex max-sm:flex-col max-sm:items-end max-sm:gap-1">
                      <div className="text-xs text-zinc-500 max-sm:text-[10px] sm:hidden">{formatDate(c.data_publicacao)}</div>
                      <Badge variant={
                        c.status === 'concluido' ? 'success' :
                        c.status === 'aprovacao_cliente' ? 'warning' :
                        c.status === 'ajustes' ? 'danger' : 'default'
                      } className="max-sm:text-[9px] max-sm:px-1.5 max-sm:py-0.5">
                        {STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG]?.label || c.status}
                      </Badge>
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
            <h3 className="font-semibold text-zinc-900">👥 Clientes</h3>
            <Link href="/clientes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {clientes.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400 mb-3">Nenhum cliente ainda</p>
                <Link href="/clientes">
                  <span className="text-sm text-blue-600 hover:underline">+ Adicionar cliente</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {clientes.map(c => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.slug}`}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-zinc-50 transition-colors"
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
      </div>

      {/* Atividade recente */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">🕐 Atividade recente</h3>
        </div>
        <CardContent className="p-0">
          {atividades.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">Nenhuma atividade ainda</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {atividades.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <div className="flex-1 text-sm text-zinc-600">
                    <span className="font-medium">{(a.details as any)?.user_name || 'Alguém'}</span>
                    {' '}{a.action}{' '}
                    <span className="text-zinc-400">{a.entity_type}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {new Date(a.created_at).toLocaleString('pt-BR', { 
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
