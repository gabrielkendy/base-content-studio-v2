'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarPlus,
  Kanban,
  MessageSquare,
  Settings,
  Bell,
  Webhook,
  ChevronLeft,
  Menu,
  FileText,
  LogOut,
  User,
  BarChart3,
  Rocket,
  ExternalLink,
  Share2,
  ListTodo,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/solicitacoes', label: 'Solicitações', icon: FileText },
  { href: '/agendar', label: 'Agendar Post', icon: CalendarPlus },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/workflow', label: 'Workflow', icon: Kanban },
  { href: '/social', label: 'Redes Sociais', icon: Share2 },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/notificacoes', label: 'Notificações', icon: Bell },
  { divider: true },
  { href: '/tarefas', label: 'Max Tasks', icon: ListTodo, highlight: true },
  { divider: true },
  { href: '/equipe', label: 'Equipe', icon: Users },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { org, member, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const brandColor = org?.brand_color || '#6366F1'

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-[60] p-2 rounded-lg bg-white shadow-lg md:hidden touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-zinc-100 z-[50]',
          'flex flex-col transition-all duration-300 ease-out',
          collapsed ? 'w-16' : 'w-60',
          'max-md:translate-x-[-100%] max-md:w-60 max-md:shadow-2xl',
          mobileOpen && 'max-md:translate-x-0'
        )}
      >
        {/* Logo / Org Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-100">
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-8 h-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {(org?.name || 'B').charAt(0).toUpperCase()}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-zinc-900 text-sm truncate">{org?.name || 'BASE'}</div>
              <div className="text-[10px] text-zinc-400">Content Studio</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded hover:bg-zinc-100 hidden md:flex"
          >
            <ChevronLeft className={cn('w-4 h-4 text-zinc-400 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item, i) => {
            if ('divider' in item) {
              return <div key={i} className="my-3 border-t border-zinc-100" />
            }

            const Icon = item.icon
            const isExternal = 'external' in item && item.external
            const isHighlight = 'highlight' in item && item.highlight
            const active = !isExternal && (pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href)))

            if (isExternal) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    'text-purple-600 hover:bg-purple-50 hover:text-purple-700 font-medium'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </span>
                  )}
                </a>
              )
            }

            // Highlighted item (Max Tasks)
            if (isHighlight && !active) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                    'text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-medium'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label} ✨</span>}
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  active
                    ? 'font-medium'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                )}
                style={
                  active
                    ? {
                        backgroundColor: isHighlight ? '#f97316' + '20' : `${brandColor}15`,
                        color: isHighlight ? '#f97316' : brandColor,
                      }
                    : undefined
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer with member info */}
        <div className="px-3 py-3 border-t border-zinc-100">
          {member && !collapsed && (
            <div className="flex items-center gap-3 mb-2">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.display_name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-900 truncate">{member.display_name}</div>
                <div className="text-[10px] text-zinc-400 capitalize">{member.role}</div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          )}
          {member && collapsed && (
            <div className="flex justify-center mb-2">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.display_name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-zinc-500" />
                </div>
              )}
            </div>
          )}
          {!collapsed && (
            <div className="text-[10px] text-zinc-400">BASE Content Studio v2.0</div>
          )}
        </div>
      </aside>
    </>
  )
}
