'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/input'
import { ArrowRight, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' | 'info'; bg: string }> = {
  aprovacao_cliente: { label: 'Aguardando', variant: 'warning', bg: 'from-amber-400 to-orange-500' },
  aprovado_agendado: { label: 'Aprovado', variant: 'success', bg: 'from-green-400 to-emerald-500' },
  ajustes: { label: 'Ajustes', variant: 'danger', bg: 'from-red-400 to-rose-500' },
  concluido: { label: 'Concluído', variant: 'success', bg: 'from-green-400 to-emerald-500' },
  em_producao: { label: 'Produção', variant: 'info', bg: 'from-blue-400 to-indigo-500' },
  rascunho: { label: 'Rascunho', variant: 'default', bg: 'from-gray-400 to-gray-500' },
  publicado: { label: 'Publicado', variant: 'success', bg: 'from-green-400 to-emerald-500' },
}

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

const PLACEHOLDER_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-violet-500',
  'from-pink-400 to-rose-500',
  'from-orange-400 to-amber-500',
  'from-teal-400 to-cyan-500',
  'from-green-400 to-emerald-500',
]

function getMonthOptions(): { value: string; label: string }[] {
  const options = [{ value: '', label: 'Todos os meses' }]
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

export default function ConteudosPage() {
  const { org } = useAuth()
  const [conteudos, setConteudos] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data } = await db.select('conteudos', {
      select: '*, empresa:clientes(id, nome, slug, cores)',
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'created_at', asc: false }],
    })
    setConteudos((data as any) || [])
    setLoading(false)
  }

  const tipos = useMemo(() => {
    const set = new Set(conteudos.map(c => c.tipo))
    return Array.from(set).sort()
  }, [conteudos])

  const filtered = useMemo(() => {
    return conteudos.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false
      if (filterTipo && c.tipo !== filterTipo) return false
      if (filterMonth) {
        const d = new Date(c.created_at)
        const cMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (cMonth !== filterMonth) return false
      }
      return true
    })
  }, [conteudos, filterStatus, filterMonth, filterTipo])

  const monthOptions = useMemo(() => getMonthOptions(), [])

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Conteúdos</h1>
        <p className="text-gray-500 mt-1">{conteudos.length} conteúdo(s) no total</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </Select>
            <Select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
            <Select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {tipos.map(t => (
                <option key={t} value={t}>{TIPO_EMOJI[t] || '📄'} {t}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {conteudos.length === 0 ? 'Nenhum conteúdo ainda' : 'Nenhum resultado'}
            </h3>
            <p className="text-gray-500 text-sm">
              {conteudos.length === 0
                ? 'Seus conteúdos aparecerão aqui quando forem criados pela equipe.'
                : 'Tente ajustar os filtros para encontrar o que procura.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, idx) => {
            const st = STATUS_CONFIG[c.status]
            const hasMedia = Array.isArray(c.midia_urls) && c.midia_urls.length > 0
            const firstMedia = hasMedia ? c.midia_urls[0] : null
            const isImage = firstMedia && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(firstMedia)
            const placeholderColor = PLACEHOLDER_COLORS[idx % PLACEHOLDER_COLORS.length]

            return (
              <Link key={c.id} href={`/portal/conteudos/${c.id}`}>
                <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden h-full border-0 shadow-md">
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden">
                    {isImage ? (
                      <img
                        src={firstMedia!}
                        alt={c.titulo || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${placeholderColor} flex items-center justify-center`}>
                        <span className="text-5xl opacity-70">{TIPO_EMOJI[c.tipo] || '📄'}</span>
                      </div>
                    )}
                    {/* Status badge overlay */}
                    <div className="absolute top-3 right-3">
                      <Badge variant={st?.variant || 'default'} className="shadow-sm">
                        {st?.label || c.status}
                      </Badge>
                    </div>
                    {/* Type badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                        {TIPO_EMOJI[c.tipo] || '📄'} {c.tipo}
                      </span>
                    </div>
                  </div>

                  <CardContent className="py-4">
                    <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {c.titulo || 'Sem título'}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {c.empresa?.nome || ''}
                      </span>
                      {c.data_publicacao && (
                        <span className="text-xs text-gray-400">
                          📅 {new Date(c.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
