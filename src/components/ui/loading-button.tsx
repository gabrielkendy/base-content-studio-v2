'use client'

import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    loading = false, 
    loadingText,
    children,
    disabled,
    ...props 
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-zinc-800 text-white hover:bg-zinc-700': variant === 'default',
            'bg-blue-600 text-white hover:bg-blue-700 shadow-sm': variant === 'primary',
            'hover:bg-zinc-100 text-zinc-700': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'border border-zinc-200 text-zinc-700 hover:bg-zinc-50': variant === 'outline',
          },
          {
            'px-2.5 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className={cn(
              'animate-spin',
              size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )} />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
LoadingButton.displayName = 'LoadingButton'

export default LoadingButton
