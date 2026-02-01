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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto',
          'animate-in fade-in zoom-in-95 duration-200',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-lg': size === 'md',
            'w-full max-w-2xl': size === 'lg',
            'w-full max-w-4xl': size === 'xl',
            'w-full max-w-[95vw] h-[90vh]': size === 'full',
          },
          'mx-4'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
