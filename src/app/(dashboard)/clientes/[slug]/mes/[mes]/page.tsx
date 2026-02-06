'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { STATUS_CONFIG, TIPO_EMOJI, MESES, formatDate, normalizeStatus } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Image, Play, ArrowLeft, CheckCircle2, AlertCircle, FileText, Instagram, Youtube, Facebook, Music2 } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Solicitacao, Member } from '@/types/database'

type DataImportante = { id: string; date: string; title: string; description?: string; priority: 'critical' | 'high' | 'medium' | 'low'; category: string }

const CANAL_ICONS: Record<string, any> = { instagram: Instagram, tiktok: Music2, facebook: Facebook, youtube: Youtube }

export default function ClienteMesPage() {
  const params = useParams()
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

  useEffect(() => { if (org) loadData() }, [org, ano, mes])

  const loadData = useCallback(async () => {
    const { data: c } = await db.select('clientes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }, { op: 'eq', col: 'slug', val: slug }], single: true })
    if (!c) return
    setCliente(c)

    const { data: members } = await db.select('members', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }] })
    const memberMap = new Map((members || []).map((m: Member) => [m.user_id, m]))

    const { data: conts } = await db.select('conteudos', { filters: [{ op: 'eq', col: 'empresa_id', val: c.id }, { op: 'eq', col: 'ano', val: ano }, { op: 'eq', col: 'mes', val: mes }], order: [{ col: 'data_publicacao', asc: true }, { col: 'ordem', asc: true }] })
    setConteudos((conts || []).map((cont: any) => ({ ...cont, status: normalizeStatus(cont.status || 'rascunho'), assignee: cont.assigned_to ? memberMap.get(cont.assigned_to) : undefined })))

    const { data: sols } = await db.select('solicitacoes', { filters: [{ op: 'eq', col: 'cliente_id', val: c.id }, { op: 'eq', col: 'org_id', val: org!.id }], order: [{ col: 'created_at', asc: false }] })
    setSolicitacoes((sols || []).slice(0, 10))

    try {
      const { data: datas } = await db.select('client_calendar_dates', { filters: [{ op: 'eq', col: 'cliente_id', val: c.id }] })
      setDatasImportantes((datas || []).filter((d: any) => new Date(d.date).getMonth() + 1 === mes))
    } catch { setDatasImportantes([]) }

    setLoading(false)
  }, [org, slug, ano, mes])

  function navegarMes(delta: number) {
    let novoMes = mes + delta, novoAno = ano
    if (novoMes > 12) { novoMes = 1; novoAno++ } else if (novoMes < 1) { novoMes = 12; novoAno-- }
    setMes(novoMes); setAno(novoAno)
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-full rounded-2xl" /><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div></div>
  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'
  const statusCounts: Record<string, number> = {}
  conteudos.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })
  const total = conteudos.length, publicados = statusCounts['publicado'] || 0, emProducao = (statusCounts['conteudo'] || 0) + (statusCounts['rascunho'] || 0), aguardandoAprovacao = (statusCounts['aprovacao_interna'] || 0) + (statusCounts['aprovacao_cliente'] || 0)

  const PRIORIDADE_STYLE: Record<string, string> = { critical: 'bg-red-100 text-red-700 border-red-200', high: 'bg-orange-100 text-orange-700 border-orange-200', medium: 'bg-blue-100 text-blue-700 border-blue-200', low: 'bg-zinc-100 text-zinc-600 border-zinc-200' }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: primaria }} />
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href={`/clientes/${slug}`}><Button size="sm" variant="ghost"><ArrowLeft className="w-4 h-4" /></Button></Link>
              <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" />
              <div>
                <h1 className="text-xl font-bold text-zinc-900">{cliente.nome}</h1>
                <p className="text-sm text-zinc-500">{MESES[mes - 1]} {ano} • {total} conteúdos</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
              <Button size="sm" variant="ghost" onClick={() => navegarMes(-1)} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
              <span className="font-bold min-w-[100px] text-center text-sm">{MESES[mes - 1]}</span>
              <Button size="sm" variant="ghost" onClick={() => navegarMes(1)} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats mini */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, icon: FileText, color: 'blue' },
          { label: 'Publicados', value: publicados, icon: CheckCircle2, color: 'green' },
          { label: 'Aprovação', value: aguardandoAprovacao, icon: Clock, color: 'yellow' },
          { label: 'Produção', value: emProducao, icon: AlertCircle, color: 'purple' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
              </div>
              <div>
                <div className="text-lg font-bold text-zinc-900">{stat.value}</div>
                <div className="text-[10px] text-zinc-500">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cards de conteúdo - 3 colunas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-900">📝 Conteúdos</h2>
            <Link href={`/workflow/nova-demanda?cliente=${cliente.id}`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
            </Link>
          </div>

          {conteudos.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-zinc-500 mb-4">Nenhum conteúdo para {MESES[mes - 1]}</p>
                <Link href={`/workflow/nova-demanda?cliente=${cliente.id}`}>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Criar demanda</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {conteudos.map(cont => {
                const statusCfg = STATUS_CONFIG[cont.status]
                const canais = (cont as any).canais || []
                return (
                  <Link key={cont.id} href={`/clientes/${slug}/conteudo/${cont.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                      {/* Thumbnail */}
                      <div className="relative aspect-square bg-gradient-to-br from-zinc-100 to-zinc-200 overflow-hidden">
                        {cont.midia_urls?.length > 0 ? (
                          <img src={cont.midia_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : cont.tipo?.toLowerCase().includes('video') || cont.tipo?.toLowerCase().includes('reels') ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                              <Play className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-12 h-12 text-zinc-300" />
                          </div>
                        )}
                        {/* Status badge */}
                        <Badge className="absolute top-2 right-2 text-[10px] shadow-sm" style={{ backgroundColor: statusCfg?.color, color: '#fff' }}>
                          {statusCfg?.emoji} {statusCfg?.label}
                        </Badge>
                        {/* Data */}
                        {cont.data_publicacao && (
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(cont.data_publicacao)}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm text-zinc-900 truncate group-hover:text-blue-600 mb-1">
                          {cont.titulo || 'Sem título'}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-zinc-500">{TIPO_EMOJI[cont.tipo] || '📄'} {cont.tipo}</span>
                          </div>
                          {/* Canais */}
                          <div className="flex items-center gap-0.5">
                            {canais.slice(0, 3).map((canal: string) => {
                              const Icon = CANAL_ICONS[canal]
                              return Icon ? <Icon key={canal} className="w-3.5 h-3.5 text-zinc-400" /> : null
                            })}
                          </div>
                        </div>
                        {/* Assignee */}
                        {cont.assignee && (
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-100">
                            <Avatar name={cont.assignee.display_name} size="sm" className="w-5 h-5 text-[8px]" />
                            <span className="text-[10px] text-zinc-500 truncate">{cont.assignee.display_name}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Datas importantes */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-purple-500" /> Datas Importantes
              </h3>
              {datasImportantes.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">Nenhuma data neste mês</p>
              ) : (
                <div className="space-y-2">
                  {datasImportantes.map(data => (
                    <div key={data.id} className={`p-2 rounded-lg border text-xs ${PRIORIDADE_STYLE[data.priority] || PRIORIDADE_STYLE.medium}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{new Date(data.date).getDate()}</span>
                        <span className="font-medium">{data.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitações */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3 flex items-center gap-2 text-sm">📩 Solicitações</h3>
              {solicitacoes.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">Nenhuma solicitação</p>
              ) : (
                <div className="space-y-2">
                  {solicitacoes.slice(0, 5).map(sol => (
                    <div key={sol.id} className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                      <h4 className="text-xs font-medium text-zinc-800 truncate">{sol.titulo}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span>{sol.status === 'nova' ? '📩' : sol.status === 'em_analise' ? '🔍' : sol.status === 'aprovada' ? '✅' : sol.status === 'em_producao' ? '🔨' : sol.status === 'entregue' ? '🚀' : '❌'}</span>
                        <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-zinc-900 mb-3 text-sm">📊 Status</h3>
              {total === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const cfg = STATUS_CONFIG[status]
                    if (!cfg) return null
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="flex items-center gap-1">{cfg.emoji} {cfg.label}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
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
