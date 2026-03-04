'use client'

import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { ToastProvider } from '@/components/ui/toast'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, member, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sync with sidebar collapsed state via custom event + localStorage init
  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    function onToggle(e: Event) {
      setSidebarCollapsed((e as CustomEvent<boolean>).detail)
    }
    window.addEventListener('sidebar-toggle', onToggle)
    return () => window.removeEventListener('sidebar-toggle', onToggle)
  }, [])

  // Redirect clients to portal
  useEffect(() => {
    if (!loading && member?.role === 'cliente') {
      router.replace('/portal')
    }
  }, [loading, member, router])

  // Apply brand colors as CSS custom properties
  useEffect(() => {
    if (org) {
      const brand = org.brand_color || '#6366F1'
      const accent = org.accent_color || '#3B82F6'
      document.documentElement.style.setProperty('--brand-color', brand)
      document.documentElement.style.setProperty('--accent-color', accent)
    }
  }, [org])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (member?.role === 'cliente') {
    return null // Will redirect
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50">
        <Sidebar />
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
          <Topbar />
          <main className="p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
