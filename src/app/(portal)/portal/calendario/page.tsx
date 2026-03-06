'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePortalCliente } from '../../portal-context'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeStatus } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  nova_solicitacao: { label: 'Solicitação', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  producao: { label: 'Produção', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  aprovacao: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ajuste: { label: 'Ajuste', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  agendado: { label: 'Agendado', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  publicado: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function CalendarioPage() {
  const { org } = useAuth()
  const { clienteId } = usePortalCliente()
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, clienteId])

  async function loadData() {
    const filters: any[] = [{ op: 'eq', col: 'org_id', val: org!.id }]
    if (clienteId) {
      filters.push({ op: 'eq', col: 'empresa_id', val: clienteId })
    }

    const { data } = await db.select('conteudos', {
      filters,
      order: [{ col: 'data_publicacao', asc: true }],
    })
    setConteudos(((data as any) || []).map((c: any) => ({ ...c, status: normalizeStatus(c.status) })))
    setLoading(false)
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Calendar grid
  const { days, firstDayOffset } = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    return { days: daysInMonth, firstDayOffset: firstDay }
  }, [currentMonth, currentYear])

  // Map conteudos by day in current month
  const conteudosByDay = useMemo(() => {
    const map: Record<number, Conteudo[]> = {}
    for (const c of conteudos) {
      if (!c.data_publicacao) continue
      const d = new Date(c.data_publicacao + 'T00:00:00')
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(c)
      }
    }
    return map
  }, [conteudos, currentMonth, currentYear])

  const selectedDayConteudos = selectedDay ? (conteudosByDay[selectedDay] || []) : []

  // Monthly summary
  const monthConteudos = conteudos.filter(c => {
    if (!c.data_publicacao) return false
    const d = new Date(c.data_publicacao + 'T00:00:00')
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-500 mt-1">{monthConteudos.length} conteúdo(s) agendado(s) este mês</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1
              const dayConteudos = conteudosByDay[day] || []
              const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear()
              const isSelected = day === selectedDay
              const hasContent = dayConteudos.length > 0

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`
                    aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all relative
                    ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-blue-50 ring-2 ring-blue-400' : hasContent ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {hasContent && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                      {dayConteudos.slice(0, 3).map((c, idx) => {
                        const cfg = STATUS_CONFIG[c.status]
                        return (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : (cfg?.dot || 'bg-gray-400')}`}
                          />
                        )
                      })}
                      {dayConteudos.length > 3 && (
                        <span className={`text-[8px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>+{dayConteudos.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).filter(([k]) => ['producao', 'aprovacao', 'aprovado', 'agendado', 'publicado'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
            <span className="text-xs text-gray-500">{val.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day content */}
      {selectedDay && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">
            {selectedDay} de {MONTH_NAMES[currentMonth]}
            {selectedDayConteudos.length === 0 && <span className="text-gray-400 font-normal"> — nenhum conteúdo</span>}
          </h3>
          {selectedDayConteudos.map(c => {
            const cfg = STATUS_CONFIG[c.status]
            const hasMedia = Array.isArray(c.midia_urls) && c.midia_urls.length > 0
            const firstMedia = hasMedia ? c.midia_urls[0] : null
            const isImage = firstMedia && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(firstMedia)

            return (
              <Link key={c.id} href={`/portal/conteudos/${c.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {isImage ? (
                          <img src={firstMedia!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            {TIPO_EMOJI[c.tipo] || '📄'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {c.titulo || 'Sem título'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {TIPO_EMOJI[c.tipo] || '📄'} {c.tipo}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${cfg?.color || 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label || c.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Month list view */}
      {!selectedDay && monthConteudos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Conteúdos de {MONTH_NAMES[currentMonth]}</h3>
          {monthConteudos.map(c => {
            const cfg = STATUS_CONFIG[c.status]
            const date = c.data_publicacao ? new Date(c.data_publicacao + 'T00:00:00') : null
            return (
              <Link key={c.id} href={`/portal/conteudos/${c.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg?.dot ? cfg.dot.replace('bg-', 'bg-') + '/10' : 'bg-gray-100'}`}>
                        <span className="text-lg">{TIPO_EMOJI[c.tipo] || '📄'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {c.titulo || 'Sem título'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {date ? `📅 ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${cfg?.color || 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label || c.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {!selectedDay && monthConteudos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Nenhum conteúdo agendado para {MONTH_NAMES[currentMonth]}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
