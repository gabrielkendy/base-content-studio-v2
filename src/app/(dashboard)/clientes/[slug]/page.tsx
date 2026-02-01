'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MESES, STATUS_CONFIG, TIPO_EMOJI, formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Calendar, Kanban } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo } from '@/types/database'

export default function ClienteDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org, supabase } = useAuth()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [view, setView] = useState<'anual' | 'workflow'>('anual')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, ano])

  async function loadData() {
    const { data: c } = await supabase
      .from('clientes')
      .select('*')
      .eq('org_id', org!.id)
      .eq('slug', slug)
      .single()

    if (!c) return
    setCliente(c)

    const { data: conts } = await supabase
      .from('conteudos')
      .select('*')
      .eq('empresa_id', c.id)
      .eq('ano', ano)
      .order('ordem')
      .order('data_publicacao')

    setConteudos(conts || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  // Group by month
  const porMes: Record<number, Conteudo[]> = {}
  for (let m = 1; m <= 12; m++) porMes[m] = []
  conteudos.forEach(c => { if (c.mes && porMes[c.mes]) porMes[c.mes].push(c) })

  // Group by status for workflow
  const porStatus: Record<string, Conteudo[]> = {}
  Object.keys(STATUS_CONFIG).forEach(s => porStatus[s] = [])
  conteudos.forEach(c => {
    const s = c.status || 'rascunho'
    if (porStatus[s]) porStatus[s].push(c)
    else porStatus['rascunho'].push(c)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: primaria }}>{cliente.nome}</h1>
            <p className="text-sm text-zinc-500">{conteudos.length} conteúdos em {ano}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAno(a => a - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg min-w-[60px] text-center">{ano}</span>
          <Button size="sm" variant="ghost" onClick={() => setAno(a => a + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === 'anual' ? 'primary' : 'outline'}
          onClick={() => setView('anual')}
        >
          <Calendar className="w-4 h-4" /> Visão Anual
        </Button>
        <Button
          size="sm"
          variant={view === 'workflow' ? 'primary' : 'outline'}
          onClick={() => setView('workflow')}
        >
          <Kanban className="w-4 h-4" /> Workflow
        </Button>
      </div>

      {view === 'anual' ? (
        /* VISÃO ANUAL - Grid de meses */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const posts = porMes[m]
            const total = posts.length
            const statusCounts: Record<string, number> = {}
            posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })

            return (
              <Link key={m} href={`/clientes/${slug}/mes/${m}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">{MESES[m - 1]}</h3>
                      <span className="text-xs text-zinc-400">{total} posts</span>
                    </div>
                    {total > 0 ? (
                      <>
                        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100 mb-2">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div
                              key={status}
                              className="h-full transition-all"
                              style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#ccc'
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(statusCounts).map(([s, c]) => (
                            <span key={s} className="text-[10px] text-zinc-400">
                              {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.emoji} {c}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-400">Nenhum conteúdo</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        /* WORKFLOW KANBAN */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const items = porStatus[key] || []
            return (
              <div key={key} className="min-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span>{cfg.emoji}</span>
                  <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <Link key={item.id} href={`/clientes/${slug}/conteudo/${item.id}`}>
                      <Card className="hover:shadow-md cursor-pointer transition-all">
                        <CardContent className="py-3 px-4">
                          <div className="text-sm font-medium text-zinc-900 truncate">{item.titulo || 'Sem título'}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs">{TIPO_EMOJI[item.tipo] || '📄'}</span>
                            <span className="text-xs text-zinc-400">{item.tipo}</span>
                            {item.data_publicacao && (
                              <span className="text-xs text-zinc-400 ml-auto">{formatDate(item.data_publicacao)}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-xs text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
