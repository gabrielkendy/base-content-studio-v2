'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_CONFIG, TIPO_EMOJI, MESES } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente } from '@/types/database'

export default function CalendarioPage() {
  const { org, supabase } = useAuth()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
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
    const { data: cls } = await supabase.from('clientes').select('*').eq('org_id', org!.id)
    setClientes(cls || [])

    let query = supabase
      .from('conteudos')
      .select('*, empresa:clientes(id, nome, slug, cores)')
      .eq('org_id', org!.id)
      .eq('mes', mes + 1)
      .eq('ano', ano)

    if (filtroCliente !== 'todos') {
      query = query.eq('empresa_id', filtroCliente)
    }

    const { data } = await query.order('data_publicacao')
    setConteudos((data as any) || [])
    setLoading(false)
  }

  // Generate calendar grid
  const firstDay = new Date(ano, mes, 1)
  const lastDay = new Date(ano, mes + 1, 0)
  const startDay = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  const days: { day: number; posts: typeof conteudos }[] = []
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({
      day: d,
      posts: conteudos.filter(c => c.data_publicacao === dateStr)
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
          <p className="text-sm text-zinc-500 max-sm:text-xs">{conteudos.length} conteúdos em {MESES[mes]} {ano}</p>
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

          {days.map(({ day, posts }) => (
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
                {posts.slice(0, 3).map(p => {
                  const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG]
                  return (
                    <div
                      key={p.id}
                      className="text-[10px] px-1.5 py-1 rounded cursor-pointer truncate hover:opacity-80"
                      style={{ 
                        backgroundColor: (p.empresa?.cores?.primaria || '#6366F1') + '15',
                        borderLeft: `2px solid ${cfg?.color || '#ccc'}`
                      }}
                      title={`${p.titulo} (${p.empresa?.nome})`}
                    >
                      {TIPO_EMOJI[p.tipo] || '📄'} {p.titulo || 'Sem título'}
                    </div>
                  )
                })}
                {posts.length > 3 && (
                  <div className="text-[10px] text-zinc-400 px-1">+{posts.length - 3} mais</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mobile Agenda View */}
      <div className="md:hidden space-y-3">
        {days.filter(d => d.posts.length > 0).length === 0 ? (
          <Card>
            <div className="p-6 text-center text-zinc-400">
              <p>Nenhum conteúdo agendado para este mês</p>
            </div>
          </Card>
        ) : (
          days.filter(d => d.posts.length > 0).map(({ day, posts }) => (
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
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
