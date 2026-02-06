'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { STATUS_CONFIG, SUB_STATUS_CONFIG, TIPO_EMOJI, MESES, TIPOS_CONTEUDO, formatDate, normalizeStatus } from '@/lib/utils'
import { Search, X, Filter, Inbox, ChevronDown, ChevronRight, Image, Play, MoreHorizontal, Eye, Trash2, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente, Solicitacao, Member, AprovacaoLink } from '@/types/database'

type KanbanItem = {
  id: string
  titulo: string
  tipo: string
  status: string
  sub_status?: string | null
  empresa?: Cliente
  assignee?: Member
  data_publicacao?: string | null
  isSolicitacao?: boolean
  solicitacaoData?: Solicitacao
  ajusteComentario?: string | null
  prioridade?: string
  fromSolicitacao?: boolean
  midiaUrl?: string | null
  midiaType?: string | null
  canais?: string[]
}

// Colunas que aparecem no Kanban (exclui cancelado e arquivado por padrão)
const KANBAN_VISIBLE_STATUSES = ['rascunho', 'conteudo', 'aprovacao_interna', 'aprovacao_cliente', 'ajuste', 'aguardando_agendamento', 'agendado', 'publicado']

function WorkflowContent() {
  const { org } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente; assignee?: Member })[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [aprovacoes, setAprovacoes] = useState<AprovacaoLink[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  // Colunas colapsadas
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({})

  // Painel de solicitações
  const [showSolicitacoes, setShowSolicitacoes] = useState(true)

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState(searchParams.get('cliente') || 'todos')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const clienteFiltrado = filtroCliente !== 'todos'
    ? clientes.find(c => c.id === filtroCliente)
    : null

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  const loadData = useCallback(async () => {
    if (!org) return

    const [clsRes, membersRes, conteudosRes, solsRes, aprovRes] = await Promise.all([
      db.select('clientes', {
        filters: [{ op: 'eq', col: 'org_id', val: org.id }],
        order: [{ col: 'nome', asc: true }],
      }),
      db.select('members', {
        filters: [{ op: 'eq', col: 'org_id', val: org.id }, { op: 'eq', col: 'status', val: 'active' }],
      }),
      db.select('conteudos', {
        select: '*, empresa:clientes(id, nome, slug, cores)',
        filters: [{ op: 'eq', col: 'org_id', val: org.id }],
        order: [{ col: 'ordem', asc: true }],
      }),
      db.select('solicitacoes', {
        select: '*, cliente:clientes(id, nome, slug, cores)',
        filters: [
          { op: 'eq', col: 'org_id', val: org.id },
          { op: 'in', col: 'status', val: ['nova', 'em_analise', 'aprovada'] },
        ],
        order: [{ col: 'created_at', asc: false }],
      }),
      db.select('aprovacoes_links', {
        filters: [{ op: 'eq', col: 'status', val: 'ajuste' }],
        order: [{ col: 'created_at', asc: false }],
      }),
    ])

    setClientes(clsRes.data || [])
    const membersData = membersRes.data || []
    setMembers(membersData)

    const rawConteudos = (conteudosRes.data as any) || []
    const conteudosWithAssignee = rawConteudos.map((c: any) => {
      c.status = normalizeStatus(c.status || 'rascunho')
      if (c.assigned_to) {
        const assignee = membersData.find((m: any) => m.user_id === c.assigned_to)
        if (assignee) c.assignee = assignee
      }
      return c
    })
    setConteudos(conteudosWithAssignee)
    setSolicitacoes((solsRes.data as any) || [])
    setAprovacoes((aprovRes.data as any) || [])
    setLoading(false)
  }, [org])

  // Build kanban items (sem solicitações - elas ficam no painel lateral)
  const kanbanItems: KanbanItem[] = []

  conteudos.forEach(c => {
    if (filtroCliente !== 'todos' && c.empresa_id !== filtroCliente) return
    if (filtroMes !== 'todos' && c.mes !== parseInt(filtroMes)) return
    if (filtroResponsavel !== 'todos' && c.assigned_to !== filtroResponsavel) return
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return
    if (busca && !(c.titulo || '').toLowerCase().includes(busca.toLowerCase())) return

    // Esconder cancelados/arquivados se não estiver mostrando
    if (!showArchived && (c.status === 'cancelado' || c.status === 'arquivado')) return

    const ajusteLink = c.status === 'ajuste'
      ? aprovacoes.find(a => a.conteudo_id === c.id && a.status === 'ajuste')
      : null

    kanbanItems.push({
      id: c.id,
      titulo: c.titulo || 'Sem título',
      tipo: c.tipo,
      status: c.status || 'rascunho',
      sub_status: (c as any).sub_status,
      empresa: c.empresa,
      assignee: c.assignee,
      data_publicacao: c.data_publicacao,
      ajusteComentario: ajusteLink?.comentario_cliente,
      fromSolicitacao: !!(c as any).solicitacao_id,
      midiaUrl: (c as any).midia_url,
      midiaType: (c as any).midia_type,
      canais: (c as any).canais,
    })
  })

  // Group by status
  const porStatus: Record<string, KanbanItem[]> = {}
  KANBAN_VISIBLE_STATUSES.forEach(s => { porStatus[s] = [] })
  if (showArchived) {
    porStatus['cancelado'] = []
    porStatus['arquivado'] = []
  }
  kanbanItems.forEach(item => {
    const s = item.status
    if (porStatus[s]) porStatus[s].push(item)
    else if (porStatus['rascunho']) porStatus['rascunho'].push(item)
  })

  // Solicitações pendentes
  const pendingSolStatuses = ['nova', 'em_analise', 'aprovada']
  const solicitacoesPendentes = solicitacoes.filter(s => {
    if (!pendingSolStatuses.includes(s.status)) return false
    if (filtroCliente !== 'todos' && s.cliente_id !== filtroCliente) return false
    if (busca && !s.titulo.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault()
    e.stopPropagation()
    const rawId = e.dataTransfer.getData('text/plain')
    if (!rawId) { setDragging(null); return }

    // Solicitação sendo dropada → aceitar e mover
    if (rawId.startsWith('sol_')) {
      const solId = rawId.replace('sol_', '')
      try {
        const res = await fetch(`/api/solicitacoes/${solId}/aceitar`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          toast(`Erro: ${json.error}`, 'error')
        } else {
          toast('✅ Solicitação aceita!', 'success')
          // Mover para o status dropado se diferente de rascunho
          if (newStatus !== 'rascunho' && json.data?.id) {
            await db.update('conteudos', {
              status: newStatus,
              updated_at: new Date().toISOString()
            }, { id: json.data.id })
          }
        }
      } catch {
        toast('Erro ao aceitar solicitação', 'error')
      }
      setDragging(null)
      await loadData()
      return
    }

    const currentItem = kanbanItems.find(i => i.id === rawId)
    if (currentItem && currentItem.status === newStatus) { setDragging(null); return }

    try {
      await db.update('conteudos', {
        status: newStatus,
        updated_at: new Date().toISOString()
      }, { id: rawId })

      const cfg = STATUS_CONFIG[newStatus]
      toast(`${cfg?.emoji || '✅'} Movido para ${cfg?.label || newStatus}`, 'success')
    } catch (err) {
      toast('❌ Erro ao mover card', 'error')
    }
    setDragging(null)
    await loadData()
  }

  function toggleColumn(key: string) {
    setCollapsedCols(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearFilters() {
    setFiltroCliente('todos')
    setFiltroMes('todos')
    setFiltroResponsavel('todos')
    setFiltroTipo('todos')
    setBusca('')
    router.replace('/workflow')
  }

  const hasFilters = filtroCliente !== 'todos' || filtroMes !== 'todos' || filtroResponsavel !== 'todos' || filtroTipo !== 'todos' || busca !== ''

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[70vh] rounded-xl" />
      </div>
    )
  }

  const totalItems = kanbanItems.length
  const visibleStatuses = showArchived 
    ? [...KANBAN_VISIBLE_STATUSES, 'cancelado', 'arquivado']
    : KANBAN_VISIBLE_STATUSES

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Workflow</h1>
              <Link href="/workflow/nova-demanda">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8 px-3 shadow-sm">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nova Demanda
                </Button>
              </Link>
              {clienteFiltrado && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                  <Avatar
                    name={clienteFiltrado.nome}
                    color={clienteFiltrado.cores?.primaria}
                    size="sm"
                    className="w-5 h-5 text-[8px]"
                  />
                  <span className="text-sm font-medium text-blue-700">{clienteFiltrado.nome}</span>
                  <button onClick={() => { setFiltroCliente('todos'); router.replace('/workflow') }}
                    className="text-blue-400 hover:text-blue-600 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-500 max-sm:text-xs">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'} no board
              {solicitacoesPendentes.length > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-purple-600 font-medium">
                  • {solicitacoesPendentes.length} {solicitacoesPendentes.length === 1 ? 'solicitação' : 'solicitações'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Toggle arquivados */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
            showArchived 
              ? 'bg-zinc-100 border-zinc-300 text-zinc-700'
              : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          {showArchived ? '📦 Ocultar arquivados' : '📦 Ver arquivados'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="pl-10 h-9 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-medium transition-all ${
            hasFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : showFilters
                ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {hasFilters && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
              {[filtroCliente, filtroMes, filtroResponsavel, filtroTipo].filter(f => f !== 'todos').length}
            </span>
          )}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            Limpar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center bg-zinc-50 rounded-xl p-3 border border-zinc-100 animate-fade-in">
          <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="text-sm h-9">
            <option value="todos">Todos clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="text-sm h-9">
            <option value="todos">Todos meses</option>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="text-sm h-9">
            <option value="todos">Responsável</option>
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
          </Select>
          <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="text-sm h-9">
            <option value="todos">Todos tipos</option>
            {TIPOS_CONTEUDO.map(t => <option key={t} value={t}>{TIPO_EMOJI[t] || '📄'} {t}</option>)}
          </Select>
        </div>
      )}

      {/* Main content: Solicitações Panel + Kanban */}
      <div className="flex gap-4">
        {/* Painel de Solicitações (lateral) */}
        {solicitacoesPendentes.length > 0 && (
          <div className={`flex-shrink-0 transition-all duration-300 ${showSolicitacoes ? 'w-[280px]' : 'w-[48px]'}`}>
            <div className="bg-gradient-to-b from-purple-50 to-white rounded-xl border border-purple-100 h-full">
              {/* Header do painel */}
              <button
                onClick={() => setShowSolicitacoes(!showSolicitacoes)}
                className="w-full flex items-center gap-2 p-3 hover:bg-purple-50/50 transition-colors rounded-t-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                  {solicitacoesPendentes.length}
                </div>
                {showSolicitacoes && (
                  <>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-semibold text-purple-900">Solicitações</span>
                      <p className="text-[10px] text-purple-500">Arraste para o board</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-purple-400" />
                  </>
                )}
              </button>

              {/* Lista de solicitações */}
              {showSolicitacoes && (
                <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {solicitacoesPendentes.map(sol => (
                    <SolicitacaoCard
                      key={sol.id}
                      sol={sol}
                      isDragging={dragging === `sol_${sol.id}`}
                      onDragStart={() => setDragging(`sol_${sol.id}`)}
                      onDragEnd={() => setDragging(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div
          className="flex-1 flex gap-4 overflow-x-auto pb-6 scroll-smooth snap-x"
          style={{ minHeight: '72vh' }}
        >
          {visibleStatuses.map(key => {
            const cfg = STATUS_CONFIG[key]
            if (!cfg) return null
            const items = porStatus[key] || []
            const isDragActive = dragging !== null
            const isCollapsed = collapsedCols[key]

            // Coluna colapsada
            if (isCollapsed) {
              return (
                <div
                  key={key}
                  className="min-w-[48px] w-[48px] flex-shrink-0 cursor-pointer"
                  onClick={() => toggleColumn(key)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, key)}
                >
                  <div className="h-full rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col items-center py-3 gap-2 hover:bg-zinc-100 transition-colors">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <span className="text-lg">{cfg.emoji}</span>
                    <span
                      className="text-[11px] font-bold rounded-md px-1.5 py-0.5"
                      style={{ backgroundColor: cfg.color + '20', color: cfg.color }}
                    >
                      {items.length}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium [writing-mode:vertical-rl] rotate-180">
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={key}
                className={`min-w-[270px] w-[270px] flex-shrink-0 flex flex-col max-sm:min-w-[230px] max-sm:w-[230px] snap-start transition-all duration-200 ${
                  isDragActive ? 'scale-[0.98]' : ''
                }`}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDragEnter={e => e.currentTarget.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2', 'rounded-xl')}
                onDragLeave={e => e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2', 'rounded-xl')}
                onDrop={e => { e.currentTarget.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2', 'rounded-xl'); handleDrop(e, key) }}
              >
                {/* Column header */}
                <div className="rounded-t-xl overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: cfg.color }} />
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-x border-zinc-100">
                    <button
                      onClick={() => toggleColumn(key)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-sm">{cfg.emoji}</span>
                    <span className="text-xs font-bold text-zinc-800 truncate flex-1">{cfg.label}</span>
                    <span
                      className="text-[11px] font-bold rounded-md px-2 py-0.5 min-w-[24px] text-center flex-shrink-0"
                      style={{ backgroundColor: cfg.color + '15', color: cfg.color }}
                    >
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards container */}
                <div
                  className={`flex-1 space-y-3 p-3 rounded-b-xl border-x border-b transition-all duration-200 min-h-[80px] ${
                    isDragActive
                      ? 'bg-blue-50/50 border-dashed border-blue-300 ring-2 ring-blue-200 ring-inset'
                      : 'bg-zinc-50/30 border-zinc-100'
                  }`}
                >
                  {items.map(item => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      isDragging={dragging === item.id}
                      onDragStart={() => setDragging(item.id)}
                      onDragEnd={() => setDragging(null)}
                      clienteSlug={(item.empresa as any)?.slug}
                    />
                  ))}
                  {items.length === 0 && !isDragActive && (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                      <span className="text-[11px]">—</span>
                    </div>
                  )}
                  {items.length === 0 && isDragActive && (
                    <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg transition-colors"
                      style={{ borderColor: cfg.color + '40' }}>
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>
                        Soltar aqui
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Card de Solicitação (no painel lateral)
function SolicitacaoCard({
  sol,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  sol: Solicitacao
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const PRIORIDADE_STYLE: Record<string, string> = {
    urgente: 'bg-red-100 text-red-600 border-red-200',
    alta: 'bg-orange-100 text-orange-600 border-orange-200',
    normal: 'bg-blue-100 text-blue-600 border-blue-200',
    baixa: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', `sol_${sol.id}`)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`
        bg-white rounded-xl p-3.5 cursor-grab active:cursor-grabbing
        border-2 border-purple-200 hover:border-purple-400
        hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] transition-all duration-200 ease-out
        ${isDragging ? 'opacity-40 scale-90 rotate-2 shadow-2xl' : 'shadow-sm'}
        group/sol
      `}
    >
      {/* Priority badge */}
      {sol.prioridade && sol.prioridade !== 'normal' && (
        <div className="mb-2.5">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${PRIORIDADE_STYLE[sol.prioridade] || ''} ${sol.prioridade === 'urgente' ? 'animate-pulse' : ''}`}>
            {sol.prioridade === 'urgente' ? '🔴' : '🟠'} {sol.prioridade.toUpperCase()}
          </span>
        </div>
      )}

      <h4 className="text-[13px] font-semibold text-zinc-900 line-clamp-2 mb-2.5 group-hover/sol:text-purple-600 transition-colors">
        {sol.titulo}
      </h4>

      {/* Cliente */}
      {sol.cliente && (
        <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-2 py-1.5 -mx-1">
          <Avatar
            name={(sol.cliente as any).nome}
            color={(sol.cliente as any).cores?.primaria}
            size="sm"
            className="w-5 h-5 text-[7px]"
          />
          <span className="text-[11px] font-medium text-zinc-600 truncate">
            {(sol.cliente as any).nome}
          </span>
        </div>
      )}

      {/* Status da solicitação */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[10px] text-purple-500 font-semibold">
          {sol.status === 'nova' ? '📩 Nova' : sol.status === 'em_analise' ? '🔍 Em análise' : '✅ Aprovada'}
        </span>
        <span className="text-[9px] text-zinc-400 opacity-0 group-hover/sol:opacity-100 transition-opacity">
          Arraste →
        </span>
      </div>
    </div>
  )
}

// Card do Kanban (conteúdo)
function KanbanCard({
  item,
  isDragging,
  onDragStart,
  onDragEnd,
  clienteSlug,
}: {
  item: KanbanItem
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  clienteSlug?: string
}) {
  const subStatusCfg = item.sub_status ? SUB_STATUS_CONFIG[item.sub_status] : null

  const cardContent = (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', item.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`
        bg-white rounded-xl overflow-hidden cursor-grab active:cursor-grabbing
        hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] transition-all duration-200 ease-out
        ${isDragging ? 'opacity-40 scale-90 rotate-2 shadow-2xl' : 'shadow-sm'}
        border border-zinc-200 hover:border-zinc-300
        group/card
      `}
    >
      {/* Thumbnail da mídia */}
      {item.midiaUrl && (
        <div className="relative h-32 bg-gradient-to-br from-zinc-100 to-zinc-200 overflow-hidden">
          {item.midiaType?.startsWith('video') ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/20 z-10">
              <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover/card:scale-110 transition-transform">
                <Play className="w-5 h-5 text-zinc-800 ml-0.5" />
              </div>
            </div>
          ) : null}
          <img
            src={item.midiaUrl}
            alt=""
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-3.5">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
            {TIPO_EMOJI[item.tipo] || '📄'} {item.tipo}
          </span>

          {/* Sub-status badge */}
          {subStatusCfg && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: subStatusCfg.color + '20', color: subStatusCfg.color }}
            >
              {subStatusCfg.emoji} {subStatusCfg.label}
            </span>
          )}

          {item.fromSolicitacao && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              📋 Demanda
            </span>
          )}
        </div>

        {/* Canais */}
        {item.canais && item.canais.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {item.canais.slice(0, 4).map(canal => (
              <span key={canal} className="text-sm" title={canal}>
                {canal === 'instagram' ? '📷' : canal === 'tiktok' ? '🎵' : canal === 'facebook' ? '👤' : canal === 'youtube' ? '▶️' : '📱'}
              </span>
            ))}
            {item.canais.length > 4 && (
              <span className="text-[10px] text-zinc-400">+{item.canais.length - 4}</span>
            )}
          </div>
        )}

        {/* Ajuste comentário */}
        {item.ajusteComentario && (
          <div className="mb-2 text-[11px] text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5 border border-orange-100">
            🔄 <span className="font-medium">Ajuste:</span> <span className="text-orange-500 line-clamp-2">{item.ajusteComentario}</span>
          </div>
        )}

        {/* Title */}
        <h4 className="text-[13px] font-semibold text-zinc-900 line-clamp-2 mb-3 leading-snug group-hover/card:text-blue-600 transition-colors">
          {item.titulo}
        </h4>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-100 mt-auto">
          {item.empresa && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Avatar
                name={item.empresa.nome}
                color={item.empresa.cores?.primaria}
                size="sm"
                className="w-5 h-5 text-[7px] flex-shrink-0"
              />
              <span className="text-[10px] text-zinc-400 truncate">
                {item.empresa.nome}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {item.assignee && (
              <div className="relative group/avatar">
                <Avatar
                  name={item.assignee.display_name}
                  size="sm"
                  className="w-5 h-5 text-[7px] ring-2 ring-white"
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/avatar:block z-50">
                  <div className="bg-zinc-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                    {item.assignee.display_name}
                  </div>
                </div>
              </div>
            )}

            {item.data_publicacao && (
              <span className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(item.data_publicacao)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (clienteSlug) {
    return (
      <Link href={`/clientes/${clienteSlug}/conteudo/${item.id}`}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[70vh] rounded-xl" />
      </div>
    }>
      <WorkflowContent />
    </Suspense>
  )
}
