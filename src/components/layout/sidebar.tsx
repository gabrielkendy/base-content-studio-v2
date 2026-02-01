'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Kanban,
  MessageSquare,
  Settings,
  Bell,
  Webhook,
  ChevronLeft,
  Menu,
  FileText,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/solicitacoes', label: 'Solicitações', icon: FileText },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/workflow', label: 'Workflow', icon: Kanban },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/notificacoes', label: 'Notificações', icon: Bell },
  { divider: true },
  { href: '/equipe', label: 'Equipe', icon: Users },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            B
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold text-zinc-900 text-sm">BASE</div>
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
            const active = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-zinc-100">
            <div className="text-[10px] text-zinc-400">BASE Content Studio v2.0</div>
          </div>
        )}
      </aside>
    </>
  )
}
