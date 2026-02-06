'use client'

import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}

export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white shadow-2xl max-h-[85vh] overflow-y-auto',
          'animate-in fade-in duration-200',
          // Mobile: slide up from bottom, rounded top only
          'rounded-t-3xl sm:rounded-2xl',
          'slide-in-from-bottom-4 sm:zoom-in-95',
          {
            'w-full sm:max-w-sm': size === 'sm',
            'w-full sm:max-w-lg': size === 'md',
            'w-full sm:max-w-2xl': size === 'lg',
            'w-full sm:max-w-4xl': size === 'xl',
            'w-full sm:max-w-[95vw] sm:h-[90vh]': size === 'full',
          },
          'sm:mx-4'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-300 rounded-full" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        )}
        <div className="p-6 pb-8">{children}</div>
      </div>
    </div>
  )
}
