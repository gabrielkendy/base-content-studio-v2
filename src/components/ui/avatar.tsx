import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export function Avatar({ name, src, size = 'md', color, className }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white',
        sizes[size],
        className
      )}
      style={{ backgroundColor: color || '#6366F1' }}
    >
      {initial}
    </div>
  )
}
