'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_CONFIG, TIPO_EMOJI, MESES } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente } from '@/types/database'

interface ScheduledPost {
  id: string
  cliente_id: string
  platforms: string[]
  caption: string
  scheduled_at: string
  status: string
  cliente?: Cliente
}

export default function CalendarioPage() {
  const { org } = useAuth()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filtroCliente, setFiltroCliente] = useState('todos')
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, mes, ano, filtroCliente])

  async function loadData() {
    const { data: cls } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })
    setClientes(cls || [])

    // Load regular conteudos
    const conteudoFilters: any[] = [
      { op: 'eq', col: 'org_id', val: org!.id },
      { op: 'eq', col: 'mes', val: mes + 1 },
      { op: 'eq', col: 'ano', val: ano },
    ]

    if (filtroCliente !== 'todos') {
      conteudoFilters.push({ op: 'eq', col: 'empresa_id', val: filtroCliente })
    }

    const { data } = await db.select('conteudos', {
      select: '*, empresa:clientes(id, nome, slug, cores)',
      filters: conteudoFilters,
      order: [{ col: 'data_publicacao', asc: true }],
    })
    setConteudos((data as any) || [])

    // Load scheduled posts for this month
    const startDate = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const endDate = `${ano}-${String(mes + 2).padStart(2, '0')}-01` // Next month start

    const scheduledFilters: any[] = [
      { op: 'eq', col: 'org_id', val: org!.id },
      { op: 'gte', col: 'scheduled_at', val: startDate },
      { op: 'lt', col: 'scheduled_at', val: endDate },
    ]

    if (filtroCliente !== 'todos') {
      scheduledFilters.push({ op: 'eq', col: 'cliente_id', val: filtroCliente })
    }

    const { data: scheduledData } = await db.select('scheduled_posts', {
      filters: scheduledFilters,
      order: [{ col: 'scheduled_at', asc: true }],
    })

    // Process scheduled posts to include client data
    const processedScheduled = (scheduledData || []).map((post: any) => ({
      ...post,
      platforms: typeof post.platforms === 'string' ? JSON.parse(post.platforms) : post.platforms,
      cliente: (cls || []).find((c: Cliente) => c.id === post.cliente_id)
    }))

    setScheduledPosts(processedScheduled)
    setLoading(false)
  }

  // Generate calendar grid
  const firstDay = new Date(ano, mes, 1)
  const lastDay = new Date(ano, mes + 1, 0)
  const startDay = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  const days: { day: number; posts: typeof conteudos; scheduledPosts: ScheduledPost[] }[] = []
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d,
      posts: conteudos.filter(c => c.data_publicacao === dateStr),
      scheduledPosts: scheduledPosts.filter(sp => sp.scheduled_at.startsWith(dateStr))
    })
  }

  function prevMonth() {
    if (mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }

  function nextMonth() {
    if (mes === 11) { setMes(0); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const today = new Date()
  const isToday = (d: number) => d === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Calendário Editorial</h1>
          <p className="text-sm text-zinc-500 max-sm:text-xs">{conteudos.length} conteúdos • {scheduledPosts.length} posts agendados em {MESES[mes]} {ano}</p>
        </div>
        <div className="flex items-center gap-3 max-sm:flex-col max-sm:w-full max-sm:gap-2">
          <Select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-44 max-sm:w-full">
            <option value="todos">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={prevMonth} className="min-h-[44px] min-w-[44px] max-sm:flex-1"><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold text-sm min-w-[140px] text-center max-sm:flex-1 max-sm:px-2">{MESES[mes]} {ano}</span>
            <Button size="sm" variant="ghost" onClick={nextMonth} className="min-h-[44px] min-w-[44px] max-sm:flex-1"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Desktop Calendar View */}
      <Card className="overflow-hidden max-md:hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-zinc-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="px-2 py-2 text-xs font-medium text-zinc-400 text-center">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-zinc-50 bg-zinc-25" />
          ))}

          {days.map(({ day, posts, scheduledPosts: dayScheduled }) => {
            const totalItems = posts.length + dayScheduled.length
            const allItems = [
              ...posts.map(p => ({ type: 'conteudo', data: p })),
              ...dayScheduled.map(sp => ({ type: 'scheduled', data: sp }))
            ]
            
            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-zinc-50 p-1 ${
                  isToday(day) ? 'bg-blue-50/50' : 'hover:bg-zinc-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 px-1 ${
                  isToday(day) ? 'text-blue-600' : 'text-zinc-400'
                }`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {allItems.slice(0, 3).map((item, idx) => {
                    if (item.type === 'conteudo') {
                      const p = item.data as Conteudo & { empresa?: Cliente }
                      const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
                      return (
                        <Link
                          key={`conteudo-${p.id}`}
                          href={`/clientes/${p.empresa?.slug}/conteudo/${p.id}`}
                          className="block"
                        >
                          <div
                            className="text-[10px] px-1.5 py-1 rounded cursor-pointer truncate hover:opacity-80"
                            style={{ 
                              backgroundColor: (p.empresa?.cores?.primaria || '#6366F1') + '15',
                              borderLeft: `2px solid ${cfg?.color || '#ccc'}`
                            }}
                            title={`${p.titulo} (${p.empresa?.nome})`}
                          >
                            {TIPO_EMOJI[p.tipo] || '📄'} {p.titulo || 'Sem título'}
                          </div>
                        </Link>
                      )
                    } else {
                      const sp = item.data as ScheduledPost
                      const statusColors = {
                        scheduled: '#3B82F6',
                        published: '#22C55E',
                        failed: '#EF4444',
                        publishing: '#F59E0B'
                      }
                      const statusEmoji = {
                        scheduled: '📅',
                        published: '🚀',
                        failed: '❌',
                        publishing: '⏳'
                      }
                      
                      return (
                        <div
                          key={`scheduled-${sp.id}`}
                          className="text-[10px] px-1.5 py-1 rounded cursor-pointer truncate hover:opacity-80"
                          style={{ 
                            backgroundColor: (sp.cliente?.cores?.primaria || '#6366F1') + '15',
                            borderLeft: `2px solid ${statusColors[sp.status as keyof typeof statusColors] || '#ccc'}`
                          }}
                          title={`${sp.caption.substring(0, 50)}... (${sp.cliente?.nome}) - ${sp.platforms.join(', ')}`}
                        >
                          {statusEmoji[sp.status as keyof typeof statusEmoji] || '📅'} {sp.caption.substring(0, 20)}...
                        </div>
                      )
                    }
                  })}
                  {totalItems > 3 && (
                    <div className="text-[10px] text-zinc-400 px-1">+{totalItems - 3} mais</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Mobile Agenda View */}
      <div className="md:hidden space-y-3">
        {days.filter(d => d.posts.length > 0 || d.scheduledPosts.length > 0).length === 0 ? (
          <Card>
            <div className="p-6 text-center text-zinc-400">
              <p>Nenhum conteúdo agendado para este mês</p>
            </div>
          </Card>
        ) : (
          days.filter(d => d.posts.length > 0 || d.scheduledPosts.length > 0).map(({ day, posts, scheduledPosts: dayScheduled }) => (
            <Card key={day}>
              <div className="p-4">
                <div className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                  isToday(day) ? 'text-blue-600' : 'text-zinc-700'
                }`}>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    isToday(day) ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {day}
                  </span>
                  {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(ano, mes, day).getDay()]}, {day} de {MESES[mes]}
                </div>
                <div className="space-y-2">
                  {/* Regular conteudos */}
                  {posts.map(p => {
                    const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
                    return (
                      <Link
                        key={p.id}
                        href={`/clientes/${p.empresa?.slug}/conteudo/${p.id}`}
                        className="block p-3 rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors"
                        style={{ borderLeftColor: cfg?.color || '#ccc', borderLeftWidth: '3px' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-lg">{TIPO_EMOJI[p.tipo] || '📄'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 truncate">{p.titulo || 'Sem título'}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{p.empresa?.nome}</div>
                          </div>
                          <Badge variant={
                            p.status === 'concluido' ? 'success' :
                            p.status === 'aprovacao_cliente' ? 'warning' :
                            p.status === 'ajustes' ? 'danger' : 'default'
                          } className="text-[10px] px-1.5 py-0.5">
                            {STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]?.label || p.status}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {/* Scheduled posts */}
                  {dayScheduled.map(sp => {
                    const statusColors = {
                      scheduled: '#3B82F6',
                      published: '#22C55E',
                      failed: '#EF4444',
                      publishing: '#F59E0B'
                    }
                    const statusLabels = {
                      scheduled: 'Agendado',
                      published: 'Publicado',
                      failed: 'Falhou',
                      publishing: 'Publicando'
                    }
                    const statusEmoji = {
                      scheduled: '📅',
                      published: '🚀',
                      failed: '❌',
                      publishing: '⏳'
                    }
                    
                    const time = new Date(sp.scheduled_at).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                    
                    return (
                      <div
                        key={sp.id}
                        className="block p-3 rounded-lg border border-zinc-100"
                        style={{ 
                          borderLeftColor: statusColors[sp.status as keyof typeof statusColors] || '#ccc', 
                          borderLeftWidth: '3px' 
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-lg">{statusEmoji[sp.status as keyof typeof statusEmoji] || '📅'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 line-clamp-2">{sp.caption}</div>
                            <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                              <span>{sp.cliente?.nome}</span>
                              <span>•</span>
                              <span>{time}</span>
                              <span>•</span>
                              <span>{sp.platforms.join(', ')}</span>
                            </div>
                          </div>
                          <Badge variant={
                            sp.status === 'published' ? 'success' :
                            sp.status === 'scheduled' ? 'default' :
                            sp.status === 'publishing' ? 'warning' :
                            'danger'
                          } className="text-[10px] px-1.5 py-0.5">
                            {statusLabels[sp.status as keyof typeof statusLabels] || sp.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
