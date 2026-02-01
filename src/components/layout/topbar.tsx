'use client'

import { Bell, Search, LogOut, User } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { Avatar } from '@/components/ui/avatar'
import { useState, useRef, useEffect } from 'react'

export function Topbar() {
  const { user, member, org, signOut } = useAuth()
  const { unreadCount } = useNotifications(user?.id)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-zinc-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-1.5 w-80 max-md:w-auto max-md:flex-1 max-md:ml-12 max-md:mr-2 max-sm:ml-16">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 outline-none w-full max-sm:placeholder:text-xs max-sm:text-xs"
        />
        <kbd className="hidden lg:inline text-[10px] text-zinc-400 bg-white px-1.5 py-0.5 rounded border border-zinc-200">/</kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <a
          href="/notificacoes"
          className="relative p-2 rounded-lg hover:bg-zinc-50 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Bell className="w-5 h-5 text-zinc-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>

        {/* Org name */}
        <span className="text-xs text-zinc-400 hidden lg:block">{org?.name}</span>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 transition-colors touch-manipulation min-h-[44px] min-w-[44px] justify-center"
          >
            <Avatar
              name={member?.display_name || user?.email || '?'}
              src={member?.avatar_url}
              size="sm"
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-50 max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:right-4 max-sm:mt-0 max-sm:w-auto max-sm:rounded-2xl max-sm:shadow-2xl">
              <div className="px-3 py-2 border-b border-zinc-100">
                <div className="text-sm font-medium text-zinc-900">{member?.display_name}</div>
                <div className="text-xs text-zinc-400">{user?.email}</div>
                <div className="text-xs text-blue-600 mt-0.5">{member?.role}</div>
              </div>
              <a href="/configuracoes" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                <User className="w-4 h-4" /> Configurações
              </a>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
