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
import { STATUS_CONFIG, TIPO_EMOJI, MESES, TIPOS_CONTEUDO, formatDate, normalizeStatus } from '@/lib/utils'
import { Search, X, Filter, Inbox } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente, Solicitacao, Member, AprovacaoLink } from '@/types/database'

type KanbanItem = {
  id: string
  titulo: string
  tipo: string
  status: string
  empresa?: Cliente
  assignee?: Member
  data_publicacao?: string | null
  isSolicitacao?: boolean
  solicitacaoData?: Solicitacao
  ajusteComentario?: string | null
  prioridade?: string
  fromSolicitacao?: boolean
}

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

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState(searchParams.get('cliente') || 'todos')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Nome do cliente filtrado
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
      }),
    ])

    setClientes(clsRes.data || [])
    const membersData = membersRes.data || []
    setMembers(membersData)

    // Map assignee + normalize legacy statuses
    const rawConteudos = (conteudosRes.data as any) || []
    const conteudosWithAssignee = rawConteudos.map((c: any) => {
      // Normalize legacy status values
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

  // Build kanban items
  const kanbanItems: KanbanItem[] = []

  // Add solicitações as nova_solicitacao items (only pending ones)
  const pendingSolStatuses = ['nova', 'em_analise', 'aprovada']
  solicitacoes.forEach(sol => {
    if (!pendingSolStatuses.includes(sol.status)) return

    // Apply filters
    if (filtroCliente !== 'todos' && sol.cliente_id !== filtroCliente) return
    if (busca && !sol.titulo.toLowerCase().includes(busca.toLowerCase())) return

    kanbanItems.push({
      id: `sol_${sol.id}`,
      titulo: sol.titulo,
      tipo: 'post',
      status: 'nova_solicitacao',
      empresa: sol.cliente as Cliente | undefined,
      isSolicitacao: true,
      solicitacaoData: sol,
      prioridade: sol.prioridade,
    })
  })

  // Add conteúdos
  conteudos.forEach(c => {
    if (filtroCliente !== 'todos' && c.empresa_id !== filtroCliente) return
    if (filtroMes !== 'todos' && c.mes !== parseInt(filtroMes)) return
    if (filtroResponsavel !== 'todos' && c.assigned_to !== filtroResponsavel) return
    if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return
    if (busca && !(c.titulo || '').toLowerCase().includes(busca.toLowerCase())) return

    const ajusteLink = c.status === 'ajuste'
      ? aprovacoes.find(a => a.conteudo_id === c.id && a.status === 'ajuste')
      : null

    kanbanItems.push({
      id: c.id,
      titulo: c.titulo || 'Sem título',
      tipo: c.tipo,
      status: c.status || 'rascunho',
      empresa: c.empresa,
      assignee: c.assignee,
      data_publicacao: c.data_publicacao,
      ajusteComentario: ajusteLink?.comentario_cliente,
      fromSolicitacao: !!(c as any).solicitacao_id,
    })
  })

  // Group by status
  const porStatus: Record<string, KanbanItem[]> = {}
  Object.keys(STATUS_CONFIG).forEach(s => { porStatus[s] = [] })
  kanbanItems.forEach(item => {
    const s = item.status
    if (porStatus[s]) porStatus[s].push(item)
    else if (porStatus['rascunho']) porStatus['rascunho'].push(item)
  })

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault()
    e.stopPropagation()
    const rawId = e.dataTransfer.getData('text/plain')
    if (!rawId) { setDragging(null); return }

    // Solicitação being dropped — aceitar e mover pra Produção
    if (rawId.startsWith('sol_')) {
      if (newStatus === 'nova_solicitacao') { setDragging(null); return }
      const solId = rawId.replace('sol_', '')

      // Aceitar solicitação → cria conteúdo em "producao"
      try {
        const res = await fetch(`/api/solicitacoes/${solId}/aceitar`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          toast(`Erro: ${json.error}`, 'error')
        } else {
          toast('✅ Solicitação aceita → Conteúdo em Produção!', 'success')

          // Se o drop foi em outra coluna que não producao, mover o conteúdo criado
          if (newStatus !== 'producao' && newStatus !== 'nova_solicitacao' && json.data?.id) {
            await db.update('conteudos', {
              status: newStatus,
              updated_at: new Date().toISOString()
            }, { id: json.data.id })
            const cfg = STATUS_CONFIG[newStatus]
            toast(`Movido para ${cfg?.label || newStatus}`, 'success')
          }
        }
      } catch {
        toast('Erro ao aceitar solicitação', 'error')
      }
      setDragging(null)
      await loadData()
      return
    }

    // Regular conteúdo move
    const currentItem = kanbanItems.find(i => i.id === rawId)
    if (currentItem && currentItem.status === newStatus) { setDragging(null); return }

    try {
      await db.update('conteudos', {
        status: newStatus,
        updated_at: new Date().toISOString()
      }, { id: rawId })

      const cfg = STATUS_CONFIG[newStatus]
      toast(`Movido para ${cfg?.label || newStatus}`, 'success')
    } catch (err) {
      toast('Erro ao mover card', 'error')
    }
    setDragging(null)
    await loadData()
  }

  function clearFilters() {
    setFiltroCliente('todos')
    setFiltroMes('todos')
    setFiltroResponsavel('todos')
    setFiltroTipo('todos')
    setBusca('')
    // Remove URL params
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
  const totalSolicitacoes = solicitacoes.filter(s => pendingSolStatuses.includes(s.status)).length

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
              {totalSolicitacoes > 0 && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-purple-600 font-medium">
                  • {totalSolicitacoes} {totalSolicitacoes === 1 ? 'solicitação pendente' : 'solicitações pendentes'}
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Limpar filtros moved inline next to filter button */}
      </div>

      {/* Filtros — compact: search + toggle */}
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

      {/* Filtros expandidos */}
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

      {/* Kanban Board */}
      <div
        className="flex gap-4 overflow-x-auto pb-6 scroll-smooth"
        style={{ minHeight: '72vh' }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const items = porStatus[key] || []
          const isDragActive = dragging !== null
          return (
            <div
              key={key}
              className="min-w-[260px] w-[260px] flex-shrink-0 flex flex-col max-sm:min-w-[230px] max-sm:w-[230px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, key)}
            >
              {/* Column header — colored top bar */}
              <div className="rounded-t-xl overflow-hidden">
                <div className="h-1" style={{ backgroundColor: cfg.color }} />
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-x border-zinc-100">
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
                className={`flex-1 space-y-2.5 p-2.5 rounded-b-xl border-x border-b transition-all min-h-[80px] ${
                  isDragActive
                    ? 'bg-zinc-50 border-dashed border-zinc-300'
                    : 'bg-zinc-50/30 border-zinc-100'
                }`}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDragEnter={e => e.preventDefault()}
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
                    {key === 'nova_solicitacao' ? (
                      <>
                        <Inbox className="w-6 h-6 mb-1.5" />
                        <span className="text-[11px] font-medium">Sem solicitações</span>
                      </>
                    ) : (
                      <span className="text-[11px]">—</span>
                    )}
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
  )
}

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
  const isSol = item.isSolicitacao
  const [showTooltip, setShowTooltip] = useState(false)

  const PRIORIDADE_STYLE: Record<string, string> = {
    urgente: 'bg-red-50 text-red-600 border-red-200',
    alta: 'bg-orange-50 text-orange-600 border-orange-200',
    normal: 'bg-blue-50 text-blue-600 border-blue-200',
    baixa: 'bg-zinc-50 text-zinc-500 border-zinc-200',
  }

  // Link to content detail if it's a regular conteúdo
  const cardContent = (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', item.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`
        bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 touch-manipulation
        ${isDragging ? 'opacity-30 scale-95 rotate-1' : 'shadow-sm'}
        ${isSol
          ? 'border-l-[3px] border-l-purple-500 border border-purple-100'
          : 'border border-zinc-150'
        }
      `}
    >
      {/* Badges row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {/* Type badge */}
        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
          {TIPO_EMOJI[item.tipo] || '📄'} {item.tipo}
        </span>

        {/* Solicitação badge */}
        {isSol && (
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
            📩 Solicitação
          </span>
        )}

        {/* Priority */}
        {isSol && item.prioridade && item.prioridade !== 'normal' && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PRIORIDADE_STYLE[item.prioridade] || ''}`}>
            {item.prioridade === 'urgente' ? '🔴' : '🟠'} {item.prioridade}
          </span>
        )}

        {/* From solicitação */}
        {!isSol && item.fromSolicitacao && (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            📋 Demanda
          </span>
        )}
      </div>

      {/* Ajuste tooltip */}
      {item.ajusteComentario && (
        <div
          className="relative mb-2"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="text-[11px] text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5 border border-orange-100 cursor-help">
            🔄 <span className="font-medium">Ajuste:</span> <span className="text-orange-500 line-clamp-2">{item.ajusteComentario}</span>
          </div>
        </div>
      )}

      {/* Title */}
      <h4 className="text-[13px] font-semibold text-zinc-900 line-clamp-2 mb-2.5 leading-snug">
        {item.titulo}
      </h4>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-50">
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
            <span className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
              📅 {formatDate(item.data_publicacao)}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  // Wrap conteúdos (not solicitações) in Link
  if (!isSol && clienteSlug) {
    return (
      <Link href={`/clientes/${clienteSlug}/conteudo/${item.id}`}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

// Wrap in Suspense for useSearchParams
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
