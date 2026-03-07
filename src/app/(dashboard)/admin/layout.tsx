'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, DollarSign, ShieldCheck, Settings2, ScrollText, Loader2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Organizações', icon: Building2, exact: true },
  { href: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/admin/acessos', label: 'Acessos', icon: ShieldCheck },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings2 },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me-role')
      .then(r => r.json())
      .then(data => {
        if (!data.isSystemAdmin) {
          router.replace('/')
        } else {
          setAuthorized(true)
        }
      })
      .catch(() => router.replace('/'))
  }, [router])

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin secondary sidebar */}
      <aside className="w-52 shrink-0 border-r border-zinc-200 bg-zinc-50 pt-6 pb-4 flex flex-col gap-1 px-2">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3 mb-2">
          Admin Master
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
