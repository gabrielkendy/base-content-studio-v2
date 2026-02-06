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
import { STATUS_CONFIG, TIPO_EMOJI, MESES, formatDate, normalizeStatus } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Image, Play, ArrowLeft, CheckCircle2, AlertCircle, FileText, Instagram, Youtube, Facebook, Music2, Pencil, Trash2, MoreVertical, X } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Solicitacao, Member } from '@/types/database'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

type DataImportante = { id: string; date: string; title: string; description?: string; priority: 'critical' | 'high' | 'medium' | 'low'; category: string }

const CANAL_ICONS: Record<string, any> = { instagram: Instagram, tiktok: Music2, facebook: Facebook, youtube: Youtube }

// Helper para detectar tipo de mídia
const isVideo = (url: string) => /\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(url)
const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url)

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
  
  // Estados para modais
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conteudoToDelete, setConteudoToDelete] = useState<Conteudo | null>(null)
  const [dataModalOpen, setDataModalOpen] = useState(false)
  const [newData, setNewData] = useState({ title: '', date: '', priority: 'medium', category: 'evento' })
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => { if (org) loadData() }, [org, ano, mes])

  const loadData = useCallback(async () => {
    const { data: c } = await db.select('clientes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }, { op: 'eq', col: 'slug', val: slug }], single: true })
    if (!c) return
    setCliente(c)

    const { data: members } = await db.select('members', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }] })
    const memberMap = new Map((members || []).map((m: Member) => [m.user_id, m]))

    const { data: conts } = await db.select('conteudos', { filters: [{ op: 'eq', col: 'empresa_id', val: c.id }, { op: 'eq', col: 'ano', val: ano }, { op: 'eq', col: 'mes', val: mes }], order: [{ col: 'data_publicacao', asc: true }, { col: 'ordem', asc: true }] })
    // Ordenar por data_publicacao (cronograma) - NULLs vão pro final
    const sortedConts = (conts || [])
      .map((cont: any) => ({ ...cont, status: normalizeStatus(cont.status || 'rascunho'), assignee: cont.assigned_to ? memberMap.get(cont.assigned_to) : undefined }))
      .sort((a: any, b: any) => {
        // Se ambos tem data, ordena por data/hora
        if (a.data_publicacao && b.data_publicacao) {
          return new Date(a.data_publicacao).getTime() - new Date(b.data_publicacao).getTime()
        }
        // Se só A tem data, A vem primeiro
        if (a.data_publicacao && !b.data_publicacao) return -1
        // Se só B tem data, B vem primeiro
        if (!a.data_publicacao && b.data_publicacao) return 1
        // Se nenhum tem data, ordena por ordem
        return (a.ordem || 0) - (b.ordem || 0)
      })
    setConteudos(sortedConts)

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

  // Função para deletar conteúdo
  async function handleDeleteConteudo() {
    if (!conteudoToDelete) return
    try {
      await db.delete('conteudos', { id: conteudoToDelete.id })
      setConteudos(prev => prev.filter(c => c.id !== conteudoToDelete.id))
      toast('Conteúdo excluído com sucesso!', 'success')
      setDeleteModalOpen(false)
      setConteudoToDelete(null)
    } catch (err) {
      toast('Não foi possível excluir o conteúdo.', 'error')
    }
  }

  // Função para adicionar data importante
  async function handleAddData() {
    if (!cliente || !newData.title || !newData.date) return
    try {
      const { data } = await db.insert('client_calendar_dates', {
        cliente_id: cliente.id,
        title: newData.title,
        date: newData.date,
        priority: newData.priority,
        category: newData.category
      })
      if (data) {
        const dateObj = new Date(newData.date)
        if (dateObj.getMonth() + 1 === mes) {
          setDatasImportantes(prev => [...prev, data])
        }
        toast('Data importante cadastrada com sucesso!', 'success')
      }
      setDataModalOpen(false)
      setNewData({ title: '', date: '', priority: 'medium', category: 'evento' })
    } catch (err) {
      toast('Não foi possível adicionar a data.', 'error')
    }
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {conteudos.map(cont => {
                const statusCfg = STATUS_CONFIG[cont.status]
                const canais = (cont as any).canais || []
                const isMenuOpen = menuOpen === cont.id
                return (
                  <Card key={cont.id} className="overflow-hidden hover:shadow-lg transition-all group h-full relative">
                    {/* Thumbnail - menor */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-200 overflow-hidden">
                      <Link href={`/clientes/${slug}/conteudo/${cont.id}`}>
                        {cont.midia_urls?.length > 0 ? (
                          isVideo(cont.midia_urls[0]) ? (
                            // Vídeo: mostrar thumbnail do vídeo com ícone de play
                            <div className="relative w-full h-full">
                              <video 
                                src={cont.midia_urls[0]} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                muted
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Imagem normal
                            <img src={cont.midia_urls[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )
                        ) : cont.tipo?.toLowerCase().includes('video') || cont.tipo?.toLowerCase().includes('reels') ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-10 h-10 text-zinc-300" />
                          </div>
                        )}
                      </Link>
                      {/* Status badge */}
                      <Badge className="absolute top-1.5 right-1.5 text-[9px] shadow-sm px-1.5 py-0.5" style={{ backgroundColor: statusCfg?.color, color: '#fff' }}>
                        {statusCfg?.emoji} {statusCfg?.label}
                      </Badge>
                      {/* Data */}
                      {cont.data_publicacao && (
                        <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {formatDate(cont.data_publicacao)}
                        </div>
                      )}
                      {/* Menu de ações */}
                      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-white shadow-sm"
                            onClick={(e) => { e.preventDefault(); setMenuOpen(isMenuOpen ? null : cont.id) }}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                          {isMenuOpen && (
                            <div className="absolute top-7 left-0 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 min-w-[120px] z-50">
                              <button
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 flex items-center gap-2"
                                onClick={(e) => { e.preventDefault(); router.push(`/clientes/${slug}/conteudo/${cont.id}`); setMenuOpen(null) }}
                              >
                                <Pencil className="w-3.5 h-3.5" /> Editar
                              </button>
                              <button
                                className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                                onClick={(e) => { e.preventDefault(); setConteudoToDelete(cont); setDeleteModalOpen(true); setMenuOpen(null) }}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Info - mais compacto */}
                    <CardContent className="p-2">
                      <Link href={`/clientes/${slug}/conteudo/${cont.id}`}>
                        <h3 className="font-semibold text-xs text-zinc-900 truncate group-hover:text-blue-600 mb-1">
                          {cont.titulo || 'Sem título'}
                        </h3>
                      </Link>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">{TIPO_EMOJI[cont.tipo] || '📄'} {cont.tipo}</span>
                        {/* Canais */}
                        <div className="flex items-center gap-0.5">
                          {canais.slice(0, 3).map((canal: string) => {
                            const Icon = CANAL_ICONS[canal]
                            return Icon ? <Icon key={canal} className="w-3 h-3 text-zinc-400" /> : null
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-purple-500" /> Datas Importantes
                </h3>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setDataModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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

      {/* Modal de confirmação de exclusão */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir conteúdo" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Tem certeza que deseja excluir "<strong>{conteudoToDelete?.titulo || 'este conteúdo'}</strong>"? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteConteudo}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de adicionar data importante */}
      <Modal open={dataModalOpen} onClose={() => setDataModalOpen(false)} title="Adicionar Data Importante" size="sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Título</label>
            <Input 
              placeholder="Ex: Dia das Mães"
              value={newData.title}
              onChange={(e) => setNewData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Data</label>
            <Input 
              type="date"
              value={newData.date}
              onChange={(e) => setNewData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Prioridade</label>
            <select 
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newData.priority}
              onChange={(e) => setNewData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="critical">🔴 Crítica</option>
              <option value="high">🟠 Alta</option>
              <option value="medium">🔵 Média</option>
              <option value="low">⚪ Baixa</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDataModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddData} disabled={!newData.title || !newData.date}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
