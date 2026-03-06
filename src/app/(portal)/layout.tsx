'use client'

import { useAuth } from '@/hooks/use-auth'
import { ToastProvider } from '@/components/ui/toast'
import { ChatWidget } from '@/components/chat/chat-widget'
import { db } from '@/lib/api'
import { LogOut, Home, FileText, Calendar, FolderOpen, Hash, User, Bell, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { Notification } from '@/types/database'
import { PortalClienteContext } from './portal-context'

const NAV = [
  { href: '/portal', label: 'Início', icon: Home, exact: true },
  { href: '/portal/solicitacoes', label: 'Solicitações', icon: FileText },
  { href: '/portal/calendario', label: 'Calendário', icon: Calendar },
  { href: '/portal/conteudos', label: 'Acervo', icon: FolderOpen },
  { href: '/portal/redes', label: 'Agendamento', icon: Hash },
  { href: '/portal/perfil', label: 'Perfil', icon: User },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { member, org, signOut, loading, user } = useAuth()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Client empresa context
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteSlug, setClienteSlug] = useState<string | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(null)

  // Resolve the user's associated cliente once auth is ready
  useEffect(() => {
    if (loading || !user) return
    fetch('/api/portal/me')
      .then(r => r.json())
      .then(data => {
        if (data.clienteId) {
          setClienteId(data.clienteId)
          setClienteSlug(data.clienteSlug)
          setClienteNome(data.clienteNome)
        }
      })
      .catch(() => {})
  }, [loading, user])

  const loadNotifications = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await db.select('notifications', {
        filters: [{ op: 'eq', col: 'user_id', val: user.id }],
        order: [{ col: 'created_at', asc: false }],
        limit: 10,
      })
      const notifs = (data || []) as Notification[]
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch {
      // notifications table may not exist yet
    }
  }, [user])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAsRead(id: string) {
    await db.update('notifications', { read: true }, { id })
    loadNotifications()
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => db.update('notifications', { read: true }, { id: n.id })))
    loadNotifications()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <PortalClienteContext.Provider value={{ clienteId, clienteSlug, clienteNome }}>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Top bar */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/portal" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                  B
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-gray-900">{clienteNome || org?.name || 'BASE'}</div>
                  <div className="text-[10px] text-gray-400">Portal do Cliente</div>
                </div>
              </Link>

              {/* Nav */}
              <nav className="flex items-center gap-1">
                {NAV.map(item => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                        active
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="flex items-center gap-2">
                {/* Notifications */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Notificações"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">🔔 Notificações</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                            Marcar todas como lidas
                          </button>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="text-3xl mb-2">🔕</div>
                          <p className="text-sm text-gray-500">Nenhuma notificação</p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {notifications.slice(0, 5).map(n => (
                            <div
                              key={n.id}
                              className={cn(
                                'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
                                !n.read && 'bg-blue-50/50'
                              )}
                              onClick={() => markAsRead(n.id)}
                            >
                              <div className="flex items-start gap-2">
                                <div className={cn(
                                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                                  n.read ? 'bg-transparent' : 'bg-blue-500'
                                )} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                                  <div className="text-[10px] text-gray-400 mt-1">
                                    {formatNotifDate(n.created_at)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-sm text-gray-500 hidden sm:inline">
                  {member?.display_name}
                </span>
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>

        {/* Chat Widget - floating */}
        {member && org && (
          <ChatWidget
            orgId={org.id}
            memberId={member.id}
            clienteId={member.id}
            brandColor={org.brand_color}
            orgName={org.name}
            orgLogoUrl={org.logo_url}
          />
        )}
      </ToastProvider>
    </PortalClienteContext.Provider>
  )
}

function formatNotifDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min atrás`
  if (hours < 24) return `${hours}h atrás`
  if (days < 7) return `${days}d atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
