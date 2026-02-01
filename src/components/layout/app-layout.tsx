'use client'

import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { ToastProvider } from '@/components/ui/toast'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50">
        <Sidebar />
        <div className="md:ml-60">
          <Topbar />
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
