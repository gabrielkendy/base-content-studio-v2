'use client'

import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/api'

export default function NotificacoesPage() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications(user?.id)
  const router = useRouter()

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Notificações</h1>
          <p className="text-sm text-zinc-500">{unreadCount} não lidas</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
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
