'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  MessageSquare,
  User,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { Approval, Conteudo } from '@/types/database'

interface ApprovalTimelineProps {
  conteudoId: string
  conteudo?: Conteudo
  className?: string
  compact?: boolean
}

interface TimelineEvent {
  id: string
  type: 'created' | 'internal_submit' | 'internal_approved' | 'internal_rejected' | 'external_sent' | 'external_approved' | 'external_rejected' | 'status_change'
  title: string
  description?: string
  actor?: string
  actorAvatar?: string
  comment?: string
  timestamp: string
  status?: 'success' | 'warning' | 'error' | 'info' | 'pending'
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  created: { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  internal_submit: { icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  internal_approved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  internal_rejected: { icon: XCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  external_sent: { icon: Building2, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  external_approved: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  external_rejected: { icon: MessageSquare, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  status_change: { icon: Clock, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
}

export function ApprovalTimeline({ conteudoId, conteudo, className = '', compact = false }: ApprovalTimelineProps) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    loadApprovals()
  }, [conteudoId])

  async function loadApprovals() {
    try {
      const res = await fetch(`/api/approvals?conteudo_id=${conteudoId}`)
      const json = await res.json()
      if (json.data) {
        setApprovals(json.data)
      }
    } catch (err) {
      console.error('Error loading approvals:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build timeline events
  const events: TimelineEvent[] = []

  // Add creation event
  if (conteudo) {
    events.push({
      id: 'created',
      type: 'created',
      title: 'Conteúdo criado',
      timestamp: conteudo.created_at,
      status: 'info',
    })
  }

  // Add approval events
  approvals.forEach(approval => {
    let type: TimelineEvent['type'] = 'status_change'
    let title = ''
    let status: TimelineEvent['status'] = 'info'

    if (approval.type === 'internal') {
      if (approval.status === 'pending') {
        type = 'internal_submit'
        title = 'Enviado para aprovação interna'
        status = 'pending'
      } else if (approval.status === 'approved') {
        type = 'internal_approved'
        title = 'Aprovado internamente'
        status = 'success'
      } else if (approval.status === 'adjustment' || approval.status === 'rejected') {
        type = 'internal_rejected'
        title = 'Ajuste interno solicitado'
        status = 'warning'
      }
    } else if (approval.type === 'external') {
      if (approval.status === 'pending') {
        type = 'external_sent'
        title = 'Enviado para aprovação do cliente'
        status = 'pending'
      } else if (approval.status === 'approved') {
        type = 'external_approved'
        title = 'Aprovado pelo cliente'
        status = 'success'
      } else if (approval.status === 'adjustment' || approval.status === 'rejected') {
        type = 'external_rejected'
        title = 'Cliente pediu ajuste'
        status = 'warning'
      }
    }

    events.push({
      id: approval.id,
      type,
      title,
      actor: approval.reviewer_name || (approval.reviewer as any)?.display_name,
      actorAvatar: (approval.reviewer as any)?.avatar_url,
      comment: approval.comment || undefined,
      timestamp: approval.reviewed_at || approval.created_at,
      status,
    })
  })

  // Sort by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // For compact mode, show only last 3
  const displayEvents = compact && !expanded ? events.slice(0, 3) : events

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={`text-center py-6 text-gray-400 ${className}`}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum histórico de aprovação</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with toggle for compact mode */}
      {compact && events.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Mostrar menos' : `Ver todos (${events.length})`}
        </button>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

        {/* Events */}
        <div className="space-y-4">
          {displayEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.status_change
            const Icon = config.icon

            return (
              <div key={event.id} className="relative flex gap-4 pl-0">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      {event.actor && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          por {event.actor}
                        </p>
                      )}
                    </div>
                    <time className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(event.timestamp)}
                    </time>
                  </div>

                  {/* Comment */}
                  {event.comment && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Helper function for relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default ApprovalTimeline
