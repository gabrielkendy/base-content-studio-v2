import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          'transition-all duration-150',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          'transition-all duration-150 resize-y min-h-[80px]',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
          'transition-all duration-150',
          className
        )}
        {...props}
      />
    )
  }
)
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-zinc-700 mb-1', className)}
      {...props}
    />
  )
}
