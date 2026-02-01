'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { STATUS_CONFIG, TIPO_EMOJI, MESES, formatDate } from '@/lib/utils'
import type { Conteudo, Cliente } from '@/types/database'

export default function WorkflowPage() {
  const { org, supabase } = useAuth()
  const { toast } = useToast()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, filtroCliente, filtroMes])

  async function loadData() {
    const { data: cls } = await supabase.from('clientes').select('*').eq('org_id', org!.id)
    setClientes(cls || [])

    let query = supabase
      .from('conteudos')
      .select('*, empresa:clientes(id, nome, slug, cores)')
      .eq('org_id', org!.id)
      .order('ordem')

    if (filtroCliente !== 'todos') query = query.eq('empresa_id', filtroCliente)
    if (filtroMes !== 'todos') query = query.eq('mes', parseInt(filtroMes))

    const { data } = await query
    setConteudos((data as any) || [])
    setLoading(false)
  }

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return

    await supabase.from('conteudos').update({
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id)

    toast(`Movido para ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`, 'success')
    setDragging(null)
    loadData()
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[70vh] rounded-xl" /></div>
  }

  const porStatus: Record<string, typeof conteudos> = {}
  Object.keys(STATUS_CONFIG).forEach(s => porStatus[s] = [])
  conteudos.forEach(c => {
    const s = c.status || 'rascunho'
    if (porStatus[s]) porStatus[s].push(c)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Workflow</h1>
          <p className="text-sm text-zinc-500">{conteudos.length} conteúdos</p>
        </div>
        <div className="flex gap-2">
          <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-40">
            <option value="todos">Todos clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="w-36">
            <option value="todos">Todos meses</option>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </Select>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const items = porStatus[key] || []
          return (
            <div
              key={key}
              className="min-w-[280px] w-[280px] flex-shrink-0 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, key)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-sm font-semibold text-zinc-700">{cfg.label}</span>
                <Badge className="ml-auto">{items.length}</Badge>
              </div>

              {/* Cards */}
              <div className={`flex-1 space-y-2 p-2 rounded-xl transition-colors ${
                dragging ? 'bg-zinc-50 border-2 border-dashed border-zinc-200' : ''
              }`}>
                {items.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', item.id)
                      setDragging(item.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={`bg-white rounded-lg border border-zinc-100 p-3 cursor-grab active:cursor-grabbing
                      hover:shadow-md transition-all ${dragging === item.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-900 line-clamp-2 flex-1">
                        {item.titulo || 'Sem título'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.empresa && (
                        <Avatar name={item.empresa.nome} color={item.empresa.cores?.primaria} size="sm" className="w-5 h-5 text-[8px]" />
                      )}
                      <span className="text-[10px] text-zinc-400">{item.empresa?.nome}</span>
                      <span className="text-xs ml-auto">{TIPO_EMOJI[item.tipo] || '📄'}</span>
                      {item.data_publicacao && (
                        <span className="text-[10px] text-zinc-400">{formatDate(item.data_publicacao)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-xs text-zinc-300">Arraste cards aqui</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
