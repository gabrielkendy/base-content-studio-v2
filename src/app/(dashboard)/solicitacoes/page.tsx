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
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Calendar, Clock, MessageSquare, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Solicitacao, SolicitacaoStatus, SolicitacaoPrioridade, Cliente } from '@/types/database'

const PRIORIDADE_CONFIG: Record<SolicitacaoPrioridade, { label: string; color: string; emoji: string }> = {
  baixa: { label: 'Baixa', color: '#22C55E', emoji: '🟢' },
  normal: { label: 'Normal', color: '#3B82F6', emoji: '🔵' },
  alta: { label: 'Alta', color: '#F59E0B', emoji: '🟡' },
  urgente: { label: 'Urgente', color: '#EF4444', emoji: '🔴' },
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

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data: cls } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    setClientes(cls || [])

    const { data: sols, error } = await db.select('solicitacoes', {
      select: '*, cliente:clientes(id, nome, slug, cores)',
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'created_at', asc: false }],
    })

    if (error) console.error('Erro solicitações:', error)
    setSolicitacoes((sols as any) || [])
    setLoading(false)
  }

  function openNew() {
    setForm({ cliente_id: '', titulo: '', descricao: '', referencias: '', prioridade: 'normal', prazo_desejado: '' })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const refs = form.referencias.split('\n').filter(s => s.trim())

    const { error } = await db.insert('solicitacoes', {
      org_id: org!.id,
      cliente_id: form.cliente_id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      referencias: refs,
      prioridade: form.prioridade,
      prazo_desejado: form.prazo_desejado || null,
    })

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
    const { error } = await db.update('solicitacoes', {
      resposta: respostaText,
      respondido_por: member?.user_id,
      updated_at: new Date().toISOString(),
    }, { id })
    if (error) { toast(`Erro: ${error}`, 'error'); return }
    toast('Resposta salva!', 'success')
    loadData()
  }

  async function aceitarSolicitacao(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    try {
      const res = await fetch(`/api/solicitacoes/${id}/aceitar`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast(`Erro: ${json.error}`, 'error')
        return
      }
      toast('✅ Solicitação aceita! Conteúdo criado.', 'success')
      router.push('/workflow')
    } catch {
      toast('Erro ao aceitar solicitação', 'error')
    }
  }

  const filtered = solicitacoes.filter(s => {
    if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false
    if (filtroCliente !== 'todos' && s.cliente_id !== filtroCliente) return false
    if (busca && !s.titulo.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const detailSol = detailId ? solicitacoes.find(s => s.id === detailId) : null

  if (authLoading || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Solicitações</h1>
          <p className="text-sm text-zinc-500 max-sm:text-xs">{solicitacoes.length} demandas dos clientes</p>
        </div>
        <Button variant="primary" onClick={openNew} className="max-sm:w-full max-sm:justify-center">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 max-sm:flex-col">
        <div className="relative flex-1 max-sm:w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="pl-10" />
        </div>
        <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-40 max-sm:w-full">
          <option value="todos">Todos status</option>
          {Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </Select>
        <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-44 max-sm:w-full">
          <option value="todos">Todos clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      </div>

      {/* Stats rápidos */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => {
          const count = solicitacoes.filter(s => s.status === k).length
          if (!count) return null
          return <Badge key={k} style={{ backgroundColor: v.color + '15', color: v.color }}>{v.emoji} {count} {v.label}</Badge>
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhuma solicitação</h3>
            <p className="text-sm text-zinc-500 mb-4">Crie a primeira demanda do cliente</p>
            <Button variant="primary" onClick={openNew}><Plus className="w-4 h-4" /> Nova</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(sol => {
            const scfg = STATUS_SOL_CONFIG[sol.status]
            const pcfg = PRIORIDADE_CONFIG[sol.prioridade]
            return (
              <Card key={sol.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => { setDetailId(sol.id); setRespostaText(sol.resposta || '') }}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 mb-1">{sol.titulo}</h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                        <span>{sol.cliente?.nome || '—'}</span>
                        {sol.prazo_desejado && (
                          <>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(sol.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {sol.descricao && <p className="text-sm text-zinc-500 line-clamp-2">{sol.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
                      <Badge style={{ backgroundColor: pcfg.color + '15', color: pcfg.color }}>{pcfg.emoji} {pcfg.label}</Badge>
                      <Badge style={{ backgroundColor: scfg.color + '15', color: scfg.color }}>{scfg.emoji} {scfg.label}</Badge>
                      {(sol.status === 'nova' || sol.status === 'em_analise' || sol.status === 'aprovada') && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => aceitarSolicitacao(sol.id, e)}
                          className="ml-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Aceitar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailSol} onClose={() => setDetailId(null)} title={detailSol?.titulo || ''} size="lg">
        {detailSol && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge style={{ backgroundColor: STATUS_SOL_CONFIG[detailSol.status].color + '15', color: STATUS_SOL_CONFIG[detailSol.status].color }}>
                {STATUS_SOL_CONFIG[detailSol.status].emoji} {STATUS_SOL_CONFIG[detailSol.status].label}
              </Badge>
              <Badge style={{ backgroundColor: PRIORIDADE_CONFIG[detailSol.prioridade].color + '15', color: PRIORIDADE_CONFIG[detailSol.prioridade].color }}>
                {PRIORIDADE_CONFIG[detailSol.prioridade].emoji} {PRIORIDADE_CONFIG[detailSol.prioridade].label}
              </Badge>
              <span className="text-sm text-zinc-400 ml-auto">{detailSol.cliente?.nome}</span>
            </div>

            {detailSol.descricao && (
              <div>
                <Label>📝 Descrição</Label>
                <pre className="bg-zinc-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{detailSol.descricao}</pre>
              </div>
            )}

            {detailSol.prazo_desejado && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span>Prazo: {new Date(detailSol.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            )}

            {detailSol.referencias && (detailSol.referencias as string[]).length > 0 && (
              <div>
                <Label>🔗 Referências</Label>
                <div className="space-y-1">
                  {(detailSol.referencias as string[]).map((ref, i) => (
                    <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline truncate">{ref}</a>
                  ))}
                </div>
              </div>
            )}

            {/* Resposta */}
            <div>
              <Label><MessageSquare className="w-4 h-4 inline" /> Resposta da equipe</Label>
              <Textarea
                value={respostaText}
                onChange={e => setRespostaText(e.target.value)}
                rows={3}
                placeholder="Responder ao cliente..."
              />
              <Button size="sm" variant="primary" className="mt-2" onClick={() => salvarResposta(detailSol.id)}>
                💾 Salvar Resposta
              </Button>
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Label className="w-full text-xs text-zinc-400 mb-1">Alterar status:</Label>
              {Object.entries(STATUS_SOL_CONFIG).map(([k, v]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={detailSol.status === k ? 'primary' : 'outline'}
                  onClick={() => updateStatus(detailSol.id, k as SolicitacaoStatus)}
                  disabled={detailSol.status === k}
                >
                  {v.emoji} {v.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="➕ Nova Solicitação" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Cliente *</Label>
            <Select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required placeholder="Ex: Campanha de Natal 2026" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={4} placeholder="Descreva a demanda..." />
          </div>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value as SolicitacaoPrioridade })}>
                {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Prazo desejado</Label>
              <Input type="date" value={form.prazo_desejado} onChange={e => setForm({ ...form, prazo_desejado: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Referências (uma URL por linha)</Label>
            <Textarea value={form.referencias} onChange={e => setForm({ ...form, referencias: e.target.value })} rows={3} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">📨 Criar Solicitação</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
