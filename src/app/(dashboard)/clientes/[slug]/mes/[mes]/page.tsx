'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { STATUS_CONFIG, TIPO_EMOJI, MESES, formatDate, formatDateFull, normalizeStatus } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Image, Play, ArrowLeft, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Solicitacao, Member } from '@/types/database'

// Tipo para datas importantes
type DataImportante = {
  id: string
  date: string
  title: string
  description?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
}

export default function ClienteMesPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const mesParam = parseInt(params.mes as string)
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<(Conteudo & { assignee?: Member })[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [datasImportantes, setDatasImportantes] = useState<DataImportante[]>([])
  const [loading, setLoading] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(mesParam)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, ano, mes])

  const loadData = useCallback(async () => {
    // Carregar cliente
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })

    if (!c) return
    setCliente(c)

    // Carregar membros para resolver assignees
    const { data: members } = await db.select('members', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })
    const memberMap = new Map((members || []).map((m: Member) => [m.user_id, m]))

    // Carregar conteúdos do mês
    const { data: conts } = await db.select('conteudos', {
      filters: [
        { op: 'eq', col: 'empresa_id', val: c.id },
        { op: 'eq', col: 'ano', val: ano },
        { op: 'eq', col: 'mes', val: mes },
      ],
      order: [{ col: 'data_publicacao', asc: true }, { col: 'ordem', asc: true }],
    })

    const normalized = (conts || []).map((cont: any) => ({
      ...cont,
      status: normalizeStatus(cont.status || 'rascunho'),
      assignee: cont.assigned_to ? memberMap.get(cont.assigned_to) : undefined,
    }))
    setConteudos(normalized)

    // Carregar solicitações do cliente
    const { data: sols } = await db.select('solicitacoes', {
      filters: [
        { op: 'eq', col: 'cliente_id', val: c.id },
        { op: 'eq', col: 'org_id', val: org!.id },
      ],
      order: [{ col: 'created_at', asc: false }],
    })
    setSolicitacoes((sols || []).slice(0, 10)) // últimas 10

    // Carregar datas importantes do mês (se existir tabela)
    try {
      const { data: datas } = await db.select('client_calendar_dates', {
        filters: [
          { op: 'eq', col: 'cliente_id', val: c.id },
        ],
      })
      // Filtrar datas do mês atual
      const datasDoMes = (datas || []).filter((d: any) => {
        const dataObj = new Date(d.date)
        return dataObj.getMonth() + 1 === mes
      })
      setDatasImportantes(datasDoMes)
    } catch {
      // Tabela pode não existir ainda
      setDatasImportantes([])
    }

    setLoading(false)
  }, [org, slug, ano, mes])

  function navegarMes(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano

    if (novoMes > 12) {
      novoMes = 1
      novoAno++
    } else if (novoMes < 1) {
      novoMes = 12
      novoAno--
    }

    setMes(novoMes)
    setAno(novoAno)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  // Stats do mês
  const statusCounts: Record<string, number> = {}
  conteudos.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })
  const total = conteudos.length
  const publicados = statusCounts['publicado'] || 0
  const emProducao = (statusCounts['conteudo'] || 0) + (statusCounts['rascunho'] || 0)
  const aguardandoAprovacao = (statusCounts['aprovacao_interna'] || 0) + (statusCounts['aprovacao_cliente'] || 0)

  // Agrupar por semana
  const porSemana: Record<number, Conteudo[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  conteudos.forEach(c => {
    if (c.data_publicacao) {
      const dia = new Date(c.data_publicacao + 'T00:00:00').getDate()
      const semana = Math.ceil(dia / 7)
      if (porSemana[semana]) porSemana[semana].push(c)
    } else {
      porSemana[1].push(c) // sem data vai pra primeira semana
    }
  })

  const PRIORIDADE_STYLE: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/clientes/${slug}`}>
            <Button size="sm" variant="ghost">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{cliente.nome}</h1>
            <p className="text-sm text-zinc-500">{MESES[mes - 1]} {ano}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navegarMes(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg min-w-[120px] text-center">{MESES[mes - 1]} {ano}</span>
          <Button size="sm" variant="ghost" onClick={() => navegarMes(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900">{total}</div>
              <div className="text-xs text-zinc-500">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{publicados}</div>
              <div className="text-xs text-zinc-500">Publicados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{aguardandoAprovacao}</div>
              <div className="text-xs text-zinc-500">Aprovação</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{emProducao}</div>
              <div className="text-xs text-zinc-500">Em produção</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts do mês */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">📝 Conteúdos do Mês</h2>
            <Link href={`/workflow/nova-demanda?cliente=${cliente.id}`}>
              <Button size="sm" variant="primary">
                <Plus className="w-4 h-4" /> Nova Demanda
              </Button>
            </Link>
          </div>

          {conteudos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-zinc-500">Nenhum conteúdo para {MESES[mes - 1]}</p>
                <Link href={`/workflow/nova-demanda?cliente=${cliente.id}`}>
                  <Button size="sm" variant="primary" className="mt-4">
                    <Plus className="w-4 h-4" /> Criar primeira demanda
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conteudos.map(cont => {
                const statusCfg = STATUS_CONFIG[cont.status]
                return (
                  <Link key={cont.id} href={`/clientes/${slug}/conteudo/${cont.id}`}>
                    <Card className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div className="w-20 h-20 rounded-lg bg-zinc-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {(cont as any).midia_url ? (
                              <img src={(cont as any).midia_url} alt="" className="w-full h-full object-cover" />
                            ) : (cont as any).midia_type?.startsWith('video') ? (
                              <Play className="w-8 h-8 text-zinc-300" />
                            ) : (
                              <Image className="w-8 h-8 text-zinc-300" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-zinc-900 truncate group-hover:text-blue-600">
                                {cont.titulo || 'Sem título'}
                              </h3>
                              <Badge
                                className="flex-shrink-0 text-[10px]"
                                style={{ backgroundColor: statusCfg?.color + '20', color: statusCfg?.color }}
                              >
                                {statusCfg?.emoji} {statusCfg?.label}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>{TIPO_EMOJI[cont.tipo] || '📄'} {cont.tipo}</span>
                              {cont.data_publicacao && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(cont.data_publicacao)}
                                </span>
                              )}
                              {cont.assignee && (
                                <span className="flex items-center gap-1">
                                  <Avatar name={cont.assignee.display_name} size="sm" className="w-4 h-4 text-[6px]" />
                                  {cont.assignee.display_name}
                                </span>
                              )}
                            </div>

                            {/* Canais */}
                            {(cont as any).canais?.length > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                {(cont as any).canais.map((canal: string) => (
                                  <span key={canal} className="text-sm" title={canal}>
                                    {canal === 'instagram' ? '📷' : canal === 'tiktok' ? '🎵' : canal === 'facebook' ? '👤' : canal === 'youtube' ? '▶️' : '📱'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Datas importantes */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                Datas Importantes
              </h3>
              {datasImportantes.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">
                  Nenhuma data importante neste mês
                </p>
              ) : (
                <div className="space-y-2">
                  {datasImportantes.map(data => (
                    <div
                      key={data.id}
                      className={`p-2 rounded-lg border ${PRIORIDADE_STYLE[data.priority] || PRIORIDADE_STYLE.medium}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{new Date(data.date).getDate()}</span>
                        <span className="text-sm font-medium">{data.title}</span>
                      </div>
                      {data.description && (
                        <p className="text-xs mt-1 opacity-80">{data.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas solicitações */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3 flex items-center gap-2">
                📩 Solicitações Recentes
              </h3>
              {solicitacoes.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">
                  Nenhuma solicitação
                </p>
              ) : (
                <div className="space-y-2">
                  {solicitacoes.slice(0, 5).map(sol => (
                    <div key={sol.id} className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                      <h4 className="text-sm font-medium text-zinc-800 truncate">{sol.titulo}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span>
                          {sol.status === 'nova' ? '📩 Nova' : sol.status === 'em_analise' ? '🔍 Análise' : sol.status === 'aprovada' ? '✅ Aprovada' : sol.status === 'em_producao' ? '🔨 Produção' : sol.status === 'entregue' ? '🚀 Entregue' : '❌ Recusada'}
                        </span>
                        <span>•</span>
                        <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Barra de progresso do status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3">📊 Status do Mês</h3>
              {total === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const cfg = STATUS_CONFIG[status]
                    if (!cfg) return null
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1">
                            {cfg.emoji} {cfg.label}
                          </span>
                          <span className="font-medium">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
