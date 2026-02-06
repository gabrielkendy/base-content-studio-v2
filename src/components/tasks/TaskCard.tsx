'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  CheckCheck,
  X,
  Building2,
  FileText,
  Flag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Task } from '@/types/database'

const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  normal: { label: 'Normal', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  alta: { label: 'Alta', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  urgente: { label: 'Urgente', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Circle },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Play },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: X },
}

interface TaskCardProps {
  task: Task
  onStatusChange: (taskId: string, status: string) => void
  onDelete: (taskId: string) => void
  compact?: boolean
}

export function TaskCard({ task, onStatusChange, onDelete, compact = false }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const priorityConfig = PRIORITY_CONFIG[task.prioridade]
  const statusConfig = STATUS_CONFIG[task.status]
  const StatusIcon = statusConfig.icon

  const isOverdue = task.due_date && 
    new Date(task.due_date) < new Date() && 
    !['concluida', 'cancelada'].includes(task.status)

  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Hoje'
    if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const quickComplete = () => {
    if (task.status === 'concluida') {
      onStatusChange(task.id, 'pendente')
    } else {
      onStatusChange(task.id, 'concluida')
    }
  }

  if (compact) {
    return (
      <Card className={`p-3 hover:shadow-md transition-all cursor-pointer ${
        task.status === 'concluida' ? 'opacity-60' : ''
      } ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={quickComplete}
            className={`mt-0.5 flex-shrink-0 transition-colors ${
              task.status === 'concluida' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'
            }`}
          >
            {task.status === 'concluida' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              task.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.titulo}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`w-2 h-2 rounded-full ${priorityConfig.dot}`} />
              {task.due_date && (
                <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {formatDate(task.due_date)}
                </span>
              )}
              {task.assignee && (
                <span className="text-xs text-gray-400">
                  {task.assignee.display_name?.split(' ')[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${
      task.status === 'concluida' ? 'opacity-70 bg-gray-50' : ''
    } ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={quickComplete}
          className={`mt-1 flex-shrink-0 transition-all ${
            task.status === 'concluida' 
              ? 'text-green-500 scale-110' 
              : 'text-gray-300 hover:text-green-500 hover:scale-110'
          }`}
        >
          {task.status === 'concluida' ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <Circle className="w-6 h-6" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`font-medium ${
                task.status === 'concluida' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}>
                {task.titulo}
              </h3>
              {task.descricao && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {task.descricao}
                </p>
              )}
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-20 py-1 min-w-[150px]">
                    {task.status === 'pendente' && (
                      <button
                        onClick={() => { onStatusChange(task.id, 'em_andamento'); setShowMenu(false) }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 text-blue-500" /> Iniciar
                      </button>
                    )}
                    {task.status === 'em_andamento' && (
                      <button
                        onClick={() => { onStatusChange(task.id, 'concluida'); setShowMenu(false) }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <CheckCheck className="w-4 h-4 text-green-500" /> Concluir
                      </button>
                    )}
                    <button
                      onClick={() => { onDelete(task.id); setShowMenu(false) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {/* Priority */}
            <Badge variant="outline" className={`text-xs ${priorityConfig.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot} mr-1.5`} />
              {priorityConfig.label}
            </Badge>

            {/* Status (se não for pendente) */}
            {task.status !== 'pendente' && (
              <Badge className={`text-xs ${statusConfig.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            )}

            {/* Due Date */}
            {task.due_date && (
              <span className={`text-xs flex items-center gap-1 ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
                {isOverdue && <AlertTriangle className="w-3 h-3" />}
              </span>
            )}

            {/* Assignee */}
            {task.assignee && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignee.display_name}
              </span>
            )}

            {/* Cliente */}
            {task.cliente && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {task.cliente.nome}
              </span>
            )}

            {/* Conteúdo vinculado */}
            {task.conteudo && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {task.conteudo.titulo || 'Conteúdo'}
              </span>
            )}
          </div>

          {/* Checklist (se houver) */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Checklist ({task.checklist.filter(i => i.done).length}/{task.checklist.length})
              </button>
              {expanded && (
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">
                  {task.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={item.done ? 'line-through text-gray-400' : 'text-gray-700'}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
