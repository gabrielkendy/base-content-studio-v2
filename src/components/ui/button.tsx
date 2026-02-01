import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
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
      />
    )
  }
)
Button.displayName = 'Button'
