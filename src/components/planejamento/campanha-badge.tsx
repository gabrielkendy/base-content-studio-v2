'use client'

import { cn } from '@/lib/utils'
import { CAMPANHA_TIPOS, CAMPANHA_STATUS, type CampanhaTipo, type CampanhaStatus } from '@/types/campanha'

interface CampanhaBadgeProps {
  nome: string
  tipo: CampanhaTipo
  status?: CampanhaStatus
  cor?: string
  onClick?: () => void
  size?: 'sm' | 'md'
  showStatus?: boolean
  className?: string
}

export function CampanhaBadge({ 
  nome, 
  tipo, 
  status,
  cor,
  onClick, 
  size = 'sm',
  showStatus = false,
  className 
}: CampanhaBadgeProps) {
  const tipoInfo = CAMPANHA_TIPOS[tipo]
  const statusInfo = status ? CAMPANHA_STATUS[status] : null
  const bgColor = cor || tipoInfo.cor

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-all',
        'hover:scale-105 hover:shadow-md',
        onClick ? 'cursor-pointer' : 'cursor-default',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
      style={{ 
        backgroundColor: `${bgColor}20`,
        color: bgColor,
        borderLeft: `3px solid ${bgColor}`
      }}
    >
      <span>{tipoInfo.icone}</span>
      <span className="truncate max-w-[120px]">{nome}</span>
      {showStatus && statusInfo && (
        <span 
          className="ml-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: statusInfo.cor }}
          title={statusInfo.label}
        />
      )}
    </button>
  )
}

// Badge contador para quando há mais campanhas
interface CampanhaBadgeCounterProps {
  count: number
  onClick?: () => void
  className?: string
}

export function CampanhaBadgeCounter({ count, onClick, className }: CampanhaBadgeCounterProps) {
  if (count <= 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'px-2 py-0.5 text-xs font-medium rounded-full',
        'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      +{count}
    </button>
  )
}
