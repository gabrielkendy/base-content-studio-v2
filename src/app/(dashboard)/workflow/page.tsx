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
import { STATUS_CONFIG, TIPO_EMOJI, MESES, TIPOS_CONTEUDO, formatDate } from '@/lib/utils'
import { Search, X, Filter, Inbox } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente, Solicitacao, Member, AprovacaoLink } from '@/types/database'

// Map legacy status values from old Conteúdos do Mês to STATUS_CONFIG keys
const LEGACY_STATUS_MAP: Record<string, string> = {
  conteudo: 'producao',
  ajustes: 'ajuste',
  aprovado_agendado: 'aprovado',
  concluido: 'publicado',
}

function normalizeStatus(status: string): string {
  return LEGACY_STATUS_MAP[status] || status
}

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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Workflow</h1>
            {clienteFiltrado && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                <Avatar
                  name={clienteFiltrado.nome}
                  color={clienteFiltrado.cores?.primaria}
                  size="sm"
                  className="w-5 h-5 text-[8px]"
                />
                <span className="text-sm font-medium text-blue-700">{clienteFiltrado.nome}</span>
                <button onClick={() => { setFiltroCliente('todos'); router.replace('/workflow') }}
                  className="text-blue-400 hover:text-blue-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-zinc-500 max-sm:text-xs">
            {totalItems} itens no board
            {totalSolicitacoes > 0 && ` • ${totalSolicitacoes} solicitações pendentes`}
          </p>
        </div>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center max-sm:flex-col max-sm:items-stretch">
        <div className="relative flex-1 min-w-[180px] max-sm:w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-10"
          />
        </div>
        <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-40 max-sm:w-full">
          <option value="todos">Todos clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
        <Select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="w-36 max-sm:w-full">
          <option value="todos">Todos meses</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </Select>
        <Select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="w-40 max-sm:w-full">
          <option value="todos">Responsável</option>
          {members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
        </Select>
        <Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="w-36 max-sm:w-full">
          <option value="todos">Todos tipos</option>
          {TIPOS_CONTEUDO.map(t => <option key={t} value={t}>{TIPO_EMOJI[t] || '📄'} {t}</option>)}
        </Select>
      </div>

      {/* Kanban Board */}
      <div
        className="flex gap-3 overflow-x-auto pb-4 scroll-smooth scrollbar-thin"
        style={{ minHeight: '72vh' }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const items = porStatus[key] || []
          const isDropTarget = dragging !== null
          return (
            <div
              key={key}
              className="min-w-[270px] w-[270px] flex-shrink-0 flex flex-col max-sm:min-w-[240px] max-sm:w-[240px]"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, key)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-2 px-1 sticky top-0 bg-white z-10 py-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-semibold text-zinc-700 truncate">{cfg.label}</span>
                <span
                  className="ml-auto text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0"
                  style={{ backgroundColor: cfg.color + '20', color: cfg.color }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards container */}
              <div
                className={`flex-1 space-y-2 p-2 rounded-xl transition-all min-h-[100px] ${
                  isDropTarget ? 'bg-zinc-50/80 border-2 border-dashed border-zinc-300 shadow-inner' : 'bg-zinc-50/40 border-2 border-transparent'
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
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs text-zinc-300">
                    {key === 'nova_solicitacao' ? (
                      <div className="flex flex-col items-center gap-1">
                        <Inbox className="w-5 h-5" />
                        <span>Sem solicitações</span>
                      </div>
                    ) : (
                      'Arraste cards aqui'
                    )}
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
        bg-white rounded-lg p-3 cursor-grab active:cursor-grabbing
        hover:shadow-md transition-all touch-manipulation max-sm:p-2
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${isSol
          ? 'border-2 border-purple-300 shadow-purple-100 shadow-sm'
          : 'border border-zinc-100'
        }
      `}
    >
      {/* Solicitação badge + prioridade */}
      {isSol && (
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
            📩 Solicitação
          </span>
          {item.prioridade && item.prioridade !== 'normal' && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORIDADE_STYLE[item.prioridade] || ''}`}>
              {item.prioridade === 'urgente' ? '🔴' : item.prioridade === 'alta' ? '🟠' : '⚪'} {item.prioridade}
            </span>
          )}
        </div>
      )}

      {/* From solicitação badge */}
      {!isSol && item.fromSolicitacao && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
            📋 Demanda do cliente
          </span>
        </div>
      )}

      {/* Ajuste badge */}
      {item.ajusteComentario && (
        <div
          className="relative mb-1.5"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full cursor-help">
            🔄 Ajuste solicitado
          </span>
          {showTooltip && (
            <div className="absolute z-50 left-0 top-full mt-1 bg-zinc-900 text-white text-xs rounded-lg p-2 max-w-[220px] shadow-lg">
              {item.ajusteComentario}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <div className="text-sm font-medium text-zinc-900 line-clamp-2 mb-2 max-sm:text-xs">
        {item.titulo}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {item.empresa && (
          <>
            <Avatar
              name={item.empresa.nome}
              color={item.empresa.cores?.primaria}
              size="sm"
              className="w-5 h-5 text-[8px] flex-shrink-0"
            />
            <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">
              {item.empresa.nome}
            </span>
          </>
        )}

        <span className="text-xs ml-auto">{TIPO_EMOJI[item.tipo] || '📄'}</span>

        {item.assignee && (
          <Avatar
            name={item.assignee.display_name}
            size="sm"
            className="w-5 h-5 text-[8px] flex-shrink-0"
          />
        )}

        {item.data_publicacao && (
          <span className="text-[10px] text-zinc-400">{formatDate(item.data_publicacao)}</span>
        )}
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
