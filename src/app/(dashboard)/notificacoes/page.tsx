'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Bell, Check, CheckCheck, ExternalLink, Clock, Paintbrush, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/api'
import Link from 'next/link'

type DemandasAguardando = {
  id: string
  demanda_id: number | null
  titulo: string
  tipo: string
  created_at: string
  empresa?: { nome: string; slug: string; cores?: { primaria?: string } }
}

export default function NotificacoesPage() {
  const { user, org } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllRead, refetch } = useNotifications(user?.id)
  const [loadingNotifs, setLoadingNotifs] = useState(true)
  const router = useRouter()
  const [demandasAguardando, setDemandasAguardando] = useState<DemandasAguardando[]>([])
  const [loadingDemandas, setLoadingDemandas] = useState(true)

  // Marcar notifs como "carregadas" após primeiro mount com userId
  useEffect(() => {
    if (user?.id) {
      const t = setTimeout(() => setLoadingNotifs(false), 800)
      return () => clearTimeout(t)
    }
  }, [user?.id])

  // Buscar demandas aguardando design
  useEffect(() => {
    if (!org) return
    
    const fetchDemandas = async () => {
      try {
        const { data } = await db.select('conteudos', {
          select: 'id, demanda_id, titulo, tipo, created_at, empresa:clientes(nome, slug, cores)',
          filters: [
            { op: 'eq', col: 'org_id', val: org.id },
            { op: 'eq', col: 'status', val: 'aguardando_design' },
          ],
          order: [{ col: 'created_at', asc: false }],
        })
        setDemandasAguardando((data as DemandasAguardando[]) || [])
      } catch (err) {
        console.error('Erro ao buscar demandas:', err)
      } finally {
        setLoadingDemandas(false)
      }
    }
    
    fetchDemandas()
  }, [org])

  // Navegar para o conteúdo quando clicar na notificação
  const handleNotificationClick = async (n: any) => {
    // Marcar como lida
    if (!n.read) {
      markAsRead(n.id)
    }
    
    // Se tiver referência a um conteúdo, navegar para ele
    if (n.reference_id && n.reference_type === 'conteudo') {
      try {
        // Buscar o conteúdo para pegar o cliente
        const { data: conteudo } = await db.select('conteudos', {
          select: 'id, empresa_id',
          filters: [{ op: 'eq', col: 'id', val: n.reference_id }],
          single: true,
        })
        
        if (conteudo?.empresa_id) {
          // Buscar o cliente para pegar o slug
          const { data: cliente } = await db.select('clientes', {
            select: 'slug',
            filters: [{ op: 'eq', col: 'id', val: conteudo.empresa_id }],
            single: true,
          })
          
          if (cliente?.slug) {
            router.push(`/clientes/${cliente.slug}/conteudo/${n.reference_id}`)
            return
          }
        }
      } catch (err) {
        console.error('Erro ao navegar para conteúdo:', err)
      }
    }
  }

  const ICONS: Record<string, string> = {
    'content.created': '📝',
    'content.status_changed': '🔄',
    'content.approved': '✅',
    'content_approved': '✅',
    'content.adjustment_requested': '⚠️',
    'content_adjustment': '⚠️',
    'content.comment': '💬',
    'member.invited': '👤',
    'deadline.approaching': '⏰',
    'mention': '📢',
    'solicitacao.nova': '📋',
    'aprovacao.pendente': '⏳',
    'task_assigned': '📋',
    'task_completed': '✅',
  }

  const TIPO_EMOJI: Record<string, string> = {
    'carrossel': '📑',
    'post': '📝',
    'stories': '📱',
    'reels': '🎬',
    'feed': '🖼️',
    'video': '🎥',
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays === 1) return 'ontem'
    return `${diffDays} dias atrás`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Notificações</h1>
          <p className="text-sm text-zinc-500">{unreadCount} não lidas</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Demandas Aguardando Design */}
      {loadingDemandas && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="h-5 w-48" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-yellow-100">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loadingDemandas && demandasAguardando.length > 0 && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Paintbrush className="w-5 h-5 text-yellow-600" />
              </div>
              <span>Aguardando Design</span>
              <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-300">
                {demandasAguardando.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {demandasAguardando.map(demanda => (
                <Link 
                  key={demanda.id} 
                  href={`/clientes/${demanda.empresa?.slug}/conteudo/${demanda.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-yellow-100 hover:border-yellow-300 hover:shadow-md transition-all cursor-pointer group">
                    {/* Cliente Avatar */}
                    <Avatar
                      name={demanda.empresa?.nome || '?'}
                      color={demanda.empresa?.cores?.primaria}
                      size="md"
                      className="w-10 h-10 text-sm flex-shrink-0"
                    />
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {demanda.demanda_id && (
                          <Badge variant="outline" className="text-xs font-mono bg-purple-50 text-purple-600 border-purple-200">
                            #{String(demanda.demanda_id).padStart(3, '0')}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-zinc-900 truncate group-hover:text-yellow-700 transition-colors">
                          {demanda.titulo || 'Sem título'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">
                          {demanda.empresa?.nome}
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs text-zinc-400">
                          {TIPO_EMOJI[demanda.tipo] || '📄'} {demanda.tipo}
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(demanda.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-zinc-300 group-hover:text-yellow-500 transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notificações Gerais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-zinc-100">
              <Bell className="w-5 h-5 text-zinc-600" />
            </div>
            <span>Todas as Notificações</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingNotifs ? (
            <div className="divide-y divide-zinc-50">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-start gap-4 px-6 py-4">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400">Tudo limpo!</h3>
              <p className="text-sm text-zinc-400">Nenhuma notificação por enquanto</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors cursor-pointer ${
                    n.read ? 'bg-white' : 'bg-blue-50/40'
                  } hover:bg-zinc-50`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="text-xl mt-0.5">{ICONS[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">{n.title}</span>
                      {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                      {n.reference_id && n.reference_type === 'conteudo' && (
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-zinc-500 mt-0.5 whitespace-pre-wrap">{n.body}</p>
                    )}
                    <span className="text-xs text-zinc-400 mt-1 block">
                      {new Date(n.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}>
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
