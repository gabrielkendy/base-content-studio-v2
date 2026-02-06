'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Filter,
  BarChart3,
  ListTodo,
  Target,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  CheckCheck,
  X,
  ChevronDown,
  Building2,
  FileText,
  Flag,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { Task, TaskStats, Member, Cliente } from '@/types/database'
import { db } from '@/lib/api'
import { NewTaskModal } from '@/components/tasks/NewTaskModal'
import { TaskCard } from '@/components/tasks/TaskCard'
import { ProductivityDashboard } from '@/components/tasks/ProductivityDashboard'

const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-700', icon: Flag },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700', icon: Flag },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: Flag },
  urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Circle },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Play },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: X },
}

type ViewMode = 'list' | 'kanban' | 'stats'
type FilterView = 'all' | 'mine' | 'created'

export default function TarefasPage() {
  const { org, member } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterView, setFilterView] = useState<FilterView>('mine')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (org?.id) {
      loadTasks()
      loadMembers()
      loadClientes()
      loadStats()
    }
  }, [org?.id, filterView, filterStatus])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        org_id: org!.id,
        view: filterView,
        user_id: member?.user_id || '',
      })
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      if (data.tasks) setTasks(data.tasks)
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    const { data } = await db.select('members', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })
    if (data) setMembers(data)
  }

  const loadClientes = async () => {
    const { data } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })
    if (data) setClientes(data)
  }

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/tasks/stats?org_id=${org!.id}&period=30`)
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, org_id: org!.id, status }),
      })
      loadTasks()
      loadStats()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      await fetch(`/api/tasks?id=${taskId}&org_id=${org!.id}`, { method: 'DELETE' })
      loadTasks()
      loadStats()
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err)
    }
  }

  // Filtrar tarefas por prioridade (client-side)
  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'all' && t.prioridade !== filterPriority) return false
    return true
  })

  // Separar por status para Kanban
  const tasksByStatus = {
    pendente: filteredTasks.filter(t => t.status === 'pendente'),
    em_andamento: filteredTasks.filter(t => t.status === 'em_andamento'),
    concluida: filteredTasks.filter(t => t.status === 'concluida'),
  }

  // Contadores rápidos
  const quickStats = {
    total: tasks.length,
    pendentes: tasks.filter(t => t.status === 'pendente').length,
    em_andamento: tasks.filter(t => t.status === 'em_andamento').length,
    concluidas: tasks.filter(t => t.status === 'concluida').length,
    atrasadas: tasks.filter(t => 
      ['pendente', 'em_andamento'].includes(t.status) &&
      t.due_date &&
      new Date(t.due_date) < new Date()
    ).length,
  }

  if (!org || !member) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-orange-500" />
            Max Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie tarefas da equipe e acompanhe a produtividade
          </p>
        </div>
        <Button onClick={() => setShowNewTaskModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ListTodo className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Circle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.pendentes}</p>
            <p className="text-xs text-gray-500">Pendentes</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Play className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.em_andamento}</p>
            <p className="text-xs text-gray-500">Em Andamento</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.concluidas}</p>
            <p className="text-xs text-gray-500">Concluídas</p>
          </div>
        </Card>
        <Card className={`p-4 flex items-center gap-3 ${quickStats.atrasadas > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`p-2 rounded-lg ${quickStats.atrasadas > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${quickStats.atrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${quickStats.atrasadas > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {quickStats.atrasadas}
            </p>
            <p className="text-xs text-gray-500">Atrasadas</p>
          </div>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterView('mine')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterView === 'mine' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4 inline mr-1" /> Minhas
            </button>
            <button
              onClick={() => setFilterView('all')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterView === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" /> Todas
            </button>
            <button
              onClick={() => setFilterView('created')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filterView === 'created' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-4 h-4 inline mr-1" /> Criadas por mim
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Todas prioridades</option>
            <option value="urgente">🔴 Urgente</option>
            <option value="alta">🟠 Alta</option>
            <option value="normal">🔵 Normal</option>
            <option value="baixa">⚪ Baixa</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListTodo className="w-4 h-4 inline mr-1" /> Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'kanban' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-4 h-4 inline mr-1" /> Kanban
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'stats' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1" /> Produtividade
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : viewMode === 'stats' ? (
        <ProductivityDashboard stats={stats} orgId={org.id} />
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['pendente', 'em_andamento', 'concluida'] as const).map((status) => (
            <div key={status} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge className={STATUS_CONFIG[status].color}>
                  {STATUS_CONFIG[status].label}
                </Badge>
                <span className="text-sm text-gray-500">({tasksByStatus[status].length})</span>
              </div>
              <div className="space-y-3">
                {tasksByStatus[status].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={updateTaskStatus}
                    onDelete={deleteTask}
                    compact
                  />
                ))}
                {tasksByStatus[status].length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Nenhuma tarefa
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
              <p className="text-sm text-gray-500 mb-4">
                {filterView === 'mine' ? 'Você não tem tarefas atribuídas' : 'Nenhuma tarefa corresponde aos filtros'}
              </p>
              <Button onClick={() => setShowNewTaskModal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Criar primeira tarefa
              </Button>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      )}

      {/* New Task Modal */}
      <NewTaskModal
        open={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        orgId={org.id}
        currentUserId={member.user_id}
        members={members}
        clientes={clientes}
        onCreated={() => {
          loadTasks()
          loadStats()
        }}
      />
    </div>
  )
}
