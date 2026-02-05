'use client'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { 
  Inbox, 
  FileText, 
  FolderOpen, 
  Users, 
  Calendar, 
  Bell, 
  Search,
  Plus,
  type LucideIcon
} from 'lucide-react'

// Preset icons for common empty states
const PRESET_ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  files: FileText,
  folder: FolderOpen,
  users: Users,
  calendar: Calendar,
  notifications: Bell,
  search: Search,
}

interface EmptyStateProps {
  icon?: LucideIcon | keyof typeof PRESET_ICONS
  emoji?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: LucideIcon
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  className,
  size = 'md',
}: EmptyStateProps) {
  // Resolve icon
  let Icon: LucideIcon | null = null
  if (typeof icon === 'string') {
    Icon = PRESET_ICONS[icon] || null
  } else if (icon) {
    Icon = icon
  }

  const sizes = {
    sm: {
      wrapper: 'py-8',
      icon: 'w-10 h-10',
      emoji: 'text-4xl',
      title: 'text-base',
      desc: 'text-xs',
    },
    md: {
      wrapper: 'py-12',
      icon: 'w-14 h-14',
      emoji: 'text-5xl',
      title: 'text-lg',
      desc: 'text-sm',
    },
    lg: {
      wrapper: 'py-16',
      icon: 'w-20 h-20',
      emoji: 'text-6xl',
      title: 'text-xl',
      desc: 'text-base',
    },
  }

  const s = sizes[size]

  return (
    <div className={cn('text-center', s.wrapper, className)}>
      {/* Icon or Emoji */}
      {emoji ? (
        <div className={cn(s.emoji, 'mb-4 opacity-80')}>{emoji}</div>
      ) : Icon ? (
        <div className="mb-4 flex justify-center">
          <div className="p-4 rounded-2xl bg-zinc-100">
            <Icon className={cn(s.icon, 'text-zinc-300')} />
          </div>
        </div>
      ) : null}

      {/* Title */}
      <h3 className={cn('font-semibold text-zinc-700', s.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-zinc-400 mt-2 max-w-sm mx-auto', s.desc)}>
          {description}
        </p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700 text-white">
            <ActionIcon className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common cases
export const emptyStates = {
  noContent: (onAction?: () => void) => (
    <EmptyState
      emoji="📝"
      title="Nenhum conteúdo"
      description="Crie seu primeiro conteúdo para começar"
      actionLabel={onAction ? "Criar Conteúdo" : undefined}
      onAction={onAction}
    />
  ),
  
  noClients: (onAction?: () => void) => (
    <EmptyState
      emoji="👥"
      title="Nenhum cliente"
      description="Adicione seu primeiro cliente para gerenciar conteúdos"
      actionLabel={onAction ? "Adicionar Cliente" : undefined}
      onAction={onAction}
    />
  ),
  
  noFiles: (onAction?: () => void) => (
    <EmptyState
      icon="folder"
      title="Pasta vazia"
      description="Arraste arquivos aqui ou clique para enviar"
      actionLabel={onAction ? "Enviar Arquivos" : undefined}
      onAction={onAction}
    />
  ),
  
  noNotifications: () => (
    <EmptyState
      icon="notifications"
      title="Tudo limpo!"
      description="Nenhuma notificação por enquanto"
    />
  ),
  
  noResults: (query?: string) => (
    <EmptyState
      icon="search"
      title="Nenhum resultado"
      description={query ? `Nenhum resultado para "${query}"` : "Tente uma busca diferente"}
    />
  ),
  
  noMessages: () => (
    <EmptyState
      emoji="💬"
      title="Nenhuma mensagem"
      description="Inicie uma conversa"
    />
  ),
}

export default EmptyState
