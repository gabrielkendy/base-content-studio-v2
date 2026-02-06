'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Calendar, Clock, CheckCircle, FileText, AlertCircle, ArrowRight, Inbox, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Solicitacao, SolicitacaoStatus, SolicitacaoPrioridade, Cliente } from '@/types/database'

const PRIORIDADE_CONFIG: Record<SolicitacaoPrioridade, { label: string; color: string; bg: string; emoji: string }> = {
  baixa: { label: 'Baixa', color: '#22C55E', bg: 'bg-green-50 border-green-200', emoji: '🟢' },
  normal: { label: 'Normal', color: '#3B82F6', bg: 'bg-blue-50 border-blue-200', emoji: '🔵' },
  alta: { label: 'Alta', color: '#F59E0B', bg: 'bg-amber-50 border-amber-200', emoji: '🟡' },
  urgente: { label: 'Urgente', color: '#EF4444', bg: 'bg-red-50 border-red-200', emoji: '🔴' },
}

const STATUS_SOL_CONFIG: Record<SolicitacaoStatus, { label: string; color: string; emoji: string }> = {
  nova: { label: 'Nova', color: '#8B5CF6', emoji: '🆕' },
  em_analise: { label: 'Em Análise', color: '#F59E0B', emoji: '🔍' },
  aprovada: { label: 'Aprovada', color: '#22C55E', emoji: '✅' },
  em_producao: { label: 'Em Produção', color: '#3B82F6', emoji: '🔨' },
  entregue: { label: 'Entregue', color: '#6B7280', emoji: '📦' },
  cancelada: { label: 'Cancelada', color: '#EF4444', emoji: '❌' },
}

export default function SolicitacoesPage() {
  const { org, member, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCliente, setFiltroCliente] = useState<string>('todos')
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    cliente_id: '', titulo: '', descricao: '', referencias: '',
    prioridade: 'normal' as SolicitacaoPrioridade, prazo_desejado: '',
  })
  const [respostaText, setRespostaText] = useState('')

  useEffect(() => { if (org) loadData() }, [org])

  async function loadData() {
    const [solRes, cliRes] = await Promise.all([
      db.select('solicitacoes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }], order: [{ col: 'created_at', asc: false }] }),
      db.select('clientes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }], order: [{ col: 'nome', asc: true }] }),
    ])
    const cliMap = new Map((cliRes.data || []).map((c: Cliente) => [c.id, c]))
    setSolicitacoes((solRes.data || []).map((s: any) => ({ ...s, cliente: cliMap.get(s.cliente_id) })))
    setClientes(cliRes.data || [])
    setLoading(false)
  }

  function openNew() { setForm({ cliente_id: clientes[0]?.id || '', titulo: '', descricao: '', referencias: '', prioridade: 'normal', prazo_desejado: '' }); setModalOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id || !form.titulo) { toast('Preencha cliente e título', 'error'); return }
    const { error } = await db.insert('solicitacoes', { org_id: org!.id, cliente_id: form.cliente_id, titulo: form.titulo, descricao: form.descricao || null, referencias: form.referencias ? form.referencias.split('\n').filter(Boolean) : [], prioridade: form.prioridade, prazo_desejado: form.prazo_desejado || null, status: 'nova' })
    if (error) { toast(`Erro: ${error}`, 'error'); return }
    toast('Solicitação criada!', 'success')
    setModalOpen(false)
    loadData()
  }

  async function updateStatus(id: string, status: SolicitacaoStatus) {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() }
    if (status !== 'nova') updates.respondido_por = member?.user_id
    const { error } = await db.update('solicitacoes', updates, { id })
    if (error) { toast(`Erro: ${error}`, 'error'); return }
    toast(`Status → ${STATUS_SOL_CONFIG[status].label}`, 'success')
    setDetailId(null)
    loadData()
  }

  async function salvarResposta(id: string) {
    const { error } = await db.update('solicitacoes', { resposta: respostaText, respondido_por: member?.user_id, updated_at: new Date().toISOString() }, { id })
    if (error) { toast(`Erro: ${error}`, 'error'); return }
    toast('Resposta salva!', 'success')
    loadData()
  }

  async function aceitarSolicitacao(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    try {
      const res = await fetch(`/api/solicitacoes/${id}/aceitar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast(`Erro: ${json.error}`, 'error'); return }
      toast('✅ Solicitação aceita!', 'success')
      router.push('/workflow')
    } catch { toast('Erro ao aceitar', 'error') }
  }

  const filtered = solicitacoes.filter(s => {
    if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false
    if (filtroCliente !== 'todos' && s.cliente_id !== filtroCliente) return false
    if (busca && !s.titulo.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const detailSol = detailId ? solicitacoes.find(s => s.id === detailId) : null

  if (authLoading || loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div></div>

  // Stats
  const stats = Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => ({ key: k, ...v, count: solicitacoes.filter(s => s.status === k).length })).filter(s => s.count > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <Inbox className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Solicitações</h1>
            <p className="text-sm text-zinc-500">{solicitacoes.length} demandas dos clientes</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova Solicitação
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="pl-10" />
            </div>
            <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-40">
              <option value="todos">Todos status</option>
              {Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </Select>
            <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-44">
              <option value="todos">Todos clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          {/* Stats badges */}
          {stats.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-100">
              {stats.map(s => (
                <button key={s.key} onClick={() => setFiltroStatus(filtroStatus === s.key ? 'todos' : s.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtroStatus === s.key ? 'ring-2 ring-offset-1' : ''}`} style={{ backgroundColor: s.color + '15', color: s.color, ringColor: s.color }}>
                  {s.emoji} {s.count} {s.label}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhuma solicitação</h3>
            <p className="text-sm text-zinc-500 mb-4">Crie a primeira demanda do cliente</p>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Nova Solicitação</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(sol => {
            const scfg = STATUS_SOL_CONFIG[sol.status]
            const pcfg = PRIORIDADE_CONFIG[sol.prioridade]
            const cliente = sol.cliente as Cliente | undefined
            const canAceitar = ['nova', 'em_analise', 'aprovada'].includes(sol.status)

            return (
              <Card key={sol.id} className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-l-4`} style={{ borderLeftColor: pcfg.color }} onClick={() => { setDetailId(sol.id); setRespostaText(sol.resposta || '') }}>
                <CardContent className="p-0">
                  {/* Header com prioridade */}
                  <div className={`px-4 py-2 ${pcfg.bg} border-b flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: pcfg.color }}>{pcfg.emoji} {pcfg.label}</span>
                    </div>
                    <Badge className="text-[10px]" style={{ backgroundColor: scfg.color, color: '#fff' }}>
                      {scfg.emoji} {scfg.label}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Título */}
                    <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {sol.titulo}
                    </h3>

                    {/* Cliente */}
                    {cliente && (
                      <div className="flex items-center gap-2">
                        <Avatar name={cliente.nome} src={cliente.logo_url} color={cliente.cores?.primaria} size="sm" />
                        <span className="text-sm text-zinc-600 truncate">{cliente.nome}</span>
                      </div>
                    )}

                    {/* Descrição truncada */}
                    {sol.descricao && (
                      <p className="text-xs text-zinc-500 line-clamp-2">{sol.descricao}</p>
                    )}

                    {/* Datas */}
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {sol.prazo_desejado && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(sol.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer com ação */}
                  {canAceitar && (
                    <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
                      <Button size="sm" className="w-full" onClick={(e) => aceitarSolicitacao(sol.id, e)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Aceitar e Criar Conteúdo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Nova Solicitação */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="📋 Nova Solicitação" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} required>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Post para promoção de fevereiro" required />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Detalhes da solicitação..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as SolicitacaoPrioridade }))}>
                {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Prazo Desejado</Label>
              <Input type="date" value={form.prazo_desejado} onChange={e => setForm(f => ({ ...f, prazo_desejado: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Referências (URLs)</Label>
            <Textarea value={form.referencias} onChange={e => setForm(f => ({ ...f, referencias: e.target.value }))} rows={2} placeholder="Uma URL por linha..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">📨 Criar Solicitação</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalhes */}
      <Modal open={!!detailSol} onClose={() => setDetailId(null)} title={detailSol?.titulo || ''} size="lg">
        {detailSol && (() => {
          const scfg = STATUS_SOL_CONFIG[detailSol.status]
          const pcfg = PRIORIDADE_CONFIG[detailSol.prioridade]
          const cliente = detailSol.cliente as Cliente | undefined

          return (
            <div className="space-y-6">
              {/* Header info */}
              <div className="flex items-center gap-4 flex-wrap">
                {cliente && (
                  <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2">
                    <Avatar name={cliente.nome} src={cliente.logo_url} color={cliente.cores?.primaria} size="sm" />
                    <span className="text-sm font-medium text-zinc-700">{cliente.nome}</span>
                  </div>
                )}
                <Badge style={{ backgroundColor: pcfg.color + '15', color: pcfg.color }}>{pcfg.emoji} {pcfg.label}</Badge>
                <Badge style={{ backgroundColor: scfg.color + '15', color: scfg.color }}>{scfg.emoji} {scfg.label}</Badge>
              </div>

              {/* Datas */}
              <div className="flex gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Criado: {new Date(detailSol.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {detailSol.prazo_desejado && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span>Prazo: {new Date(detailSol.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {/* Descrição */}
              {detailSol.descricao && (
                <div>
                  <Label className="mb-2">Descrição</Label>
                  <div className="bg-zinc-50 rounded-lg p-4 text-sm text-zinc-700 whitespace-pre-wrap">{detailSol.descricao}</div>
                </div>
              )}

              {/* Referências */}
              {detailSol.referencias?.length > 0 && (
                <div>
                  <Label className="mb-2">Referências</Label>
                  <div className="space-y-1">
                    {detailSol.referencias.map((ref, i) => (
                      <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline truncate">{ref}</a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resposta */}
              <div>
                <Label className="mb-2">Resposta / Observações</Label>
                <Textarea value={respostaText} onChange={e => setRespostaText(e.target.value)} rows={3} placeholder="Adicione uma resposta ou observação..." />
                <Button size="sm" variant="outline" className="mt-2" onClick={() => salvarResposta(detailSol.id)}>Salvar Resposta</Button>
              </div>

              {/* Ações */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-100">
                <Label className="w-full mb-1">Alterar Status:</Label>
                {Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => (
                  <Button key={k} size="sm" variant={detailSol.status === k ? 'primary' : 'outline'} onClick={() => updateStatus(detailSol.id, k as SolicitacaoStatus)} disabled={detailSol.status === k}>
                    {v.emoji} {v.label}
                  </Button>
                ))}
              </div>

              {/* Aceitar */}
              {['nova', 'em_analise', 'aprovada'].includes(detailSol.status) && (
                <div className="pt-4 border-t border-zinc-100">
                  <Button className="w-full" onClick={() => aceitarSolicitacao(detailSol.id)}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Aceitar e Criar Conteúdo no Workflow
                  </Button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
