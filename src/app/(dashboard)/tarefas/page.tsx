'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  BarChart3,
  ListTodo,
  Loader2,
  Play,
  X,
  Building2,
  FileText,
  Flag,
  Trophy,
  TrendingUp,
  Users,
  ExternalLink,
  MessageSquare,
  Paintbrush,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react'
import type { Conteudo, Member, Cliente } from '@/types/database'
import { db } from '@/lib/api'
import Link from 'next/link'
import { STATUS_CONFIG as WORKFLOW_STATUS, TIPO_EMOJI, formatDate } from '@/lib/utils'

// Tipos de tarefa derivados do workflow
type TaskType = 'producao' | 'ajuste' | 'revisao'

interface WorkflowTask {
  id: string
  type: TaskType
  conteudo: Conteudo
  cliente: Cliente
  titulo: string
  descricao: string
  prioridade: 'normal' | 'alta' | 'urgente'
  createdAt: string
  dueDate?: string
  ajusteComment?: string
}

type ViewMode = 'list' | 'stats'
type FilterView = 'all' | 'mine'

export default function TarefasPage() {
  const { org, member } = useAuth()
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filterView, setFilterView] = useState<FilterView>('mine')
  const [filterType, setFilterType] = useState<string>('all')
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<any>(null)

  const isGestor = member?.role === 'admin' || member?.role === 'gestor'

  useEffect(() => {
    if (org?.id) {
      loadWorkflowTasks()
      loadMembers()
    }
  }, [org?.id, filterView])

  // Carrega tarefas derivadas do workflow (conteúdos em produção/ajuste)
  const loadWorkflowTasks = async () => {
    try {
      setLoading(true)
      
      // Buscar conteúdos que geram tarefas (em produção ou com ajuste solicitado)
      const statusFilter = ['producao', 'ajuste', 'revisao']
      
      let query: any = {
        select: '*, empresa:clientes(id, nome, slug, logo_url)',
        filters: [
          { op: 'eq', col: 'org_id', val: org!.id },
          { op: 'in', col: 'status', val: statusFilter },
        ],
        order: [{ col: 'updated_at', ascending: false }],
      }
      
      // Se não é gestor, filtrar só os atribuídos ao usuário
      if (!isGestor || filterView === 'mine') {
        query.filters.push({ op: 'eq', col: 'assigned_to', val: member!.user_id })
      }

      const { data: conteudos, error } = await db.select('conteudos', query)
      
      if (error) throw new Error(error)

      // Converter conteúdos em tarefas
      const workflowTasks: WorkflowTask[] = (conteudos || []).map((c: any) => {
        const type: TaskType = c.status === 'ajuste' ? 'ajuste' : 
                               c.status === 'revisao' ? 'revisao' : 'producao'
        
        // Determinar prioridade baseado na data
        let prioridade: 'normal' | 'alta' | 'urgente' = 'normal'
        if (c.data_publicacao) {
          const daysUntil = Math.ceil((new Date(c.data_publicacao).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysUntil <= 1) prioridade = 'urgente'
          else if (daysUntil <= 3) prioridade = 'alta'
        }
        if (type === 'ajuste') prioridade = 'alta' // Ajustes sempre são prioridade alta

        return {
          id: c.id,
          type,
          conteudo: c,
          cliente: c.empresa,
          titulo: type === 'ajuste' 
            ? `Ajustar: ${c.titulo || c.tipo}`
            : type === 'revisao'
            ? `Revisar: ${c.titulo || c.tipo}`
            : `Produzir: ${c.titulo || c.tipo}`,
          descricao: type === 'ajuste' && c.sub_status 
            ? c.sub_status // Comentário do ajuste
            : c.descricao || '',
          prioridade,
          createdAt: c.updated_at || c.created_at,
          dueDate: c.data_publicacao,
          ajusteComment: type === 'ajuste' ? c.sub_status : undefined,
        }
      })

      setTasks(workflowTasks)
      
      // Calcular stats
      calculateStats(workflowTasks)
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

  const calculateStats = (taskList: WorkflowTask[]) => {
    const producao = taskList.filter(t => t.type === 'producao').length
    const ajustes = taskList.filter(t => t.type === 'ajuste').length
    const revisao = taskList.filter(t => t.type === 'revisao').length
    const urgentes = taskList.filter(t => t.prioridade === 'urgente').length
    
    setStats({
      total: taskList.length,
      producao,
      ajustes,
      revisao,
      urgentes,
    })
  }

  // Marcar tarefa como concluída (avança o status do conteúdo)
  const completeTask = async (task: WorkflowTask) => {
    try {
      // Determinar próximo status baseado no tipo de tarefa
      let newStatus = 'aprovacao' // Default: vai pra aprovação interna
      if (task.type === 'ajuste') {
        newStatus = 'aprovacao' // Ajuste feito, volta pra aprovação
      } else if (task.type === 'revisao') {
        newStatus = 'aprovacao'
      }

      const { error } = await db.update('conteudos', {
        status: newStatus,
        sub_status: null, // Limpa o comentário de ajuste
        updated_at: new Date().toISOString(),
      }, { id: task.id })

      if (error) throw new Error(error)
      
      loadWorkflowTasks()
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err)
      alert('Erro ao concluir tarefa')
    }
  }

  // Filtrar por tipo
  const filteredTasks = tasks.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    return true
  })

  // Contadores rápidos
  const quickStats = {
    total: tasks.length,
    producao: tasks.filter(t => t.type === 'producao').length,
    ajustes: tasks.filter(t => t.type === 'ajuste').length,
    revisao: tasks.filter(t => t.type === 'revisao').length,
    urgentes: tasks.filter(t => t.prioridade === 'urgente').length,
  }

  if (!org || !member) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const TASK_TYPE_CONFIG = {
    producao: { 
      label: 'Produção', 
      color: 'bg-blue-100 text-blue-700 border-blue-200', 
      icon: Paintbrush,
      description: 'Conteúdos para produzir'
    },
    ajuste: { 
      label: 'Ajuste', 
      color: 'bg-orange-100 text-orange-700 border-orange-200', 
      icon: RefreshCw,
      description: 'Ajustes solicitados pelo cliente'
    },
    revisao: { 
      label: 'Revisão', 
      color: 'bg-purple-100 text-purple-700 border-purple-200', 
      icon: Eye,
      description: 'Conteúdos para revisar'
    },
  }

  const PRIORIDADE_CONFIG = {
    normal: { label: 'Normal', dot: 'bg-blue-500' },
    alta: { label: 'Alta', dot: 'bg-orange-500' },
    urgente: { label: 'Urgente', dot: 'bg-red-500' },
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-orange-500" />
            Max Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGestor ? 'Gerencie as tarefas da equipe' : 'Suas tarefas do workflow'}
          </p>
        </div>
        <Button 
          onClick={() => loadWorkflowTasks()} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <ListTodo className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Paintbrush className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.producao}</p>
            <p className="text-xs text-gray-500">Produção</p>
          </div>
        </Card>
        <Card className={`p-4 flex items-center gap-3 ${quickStats.ajustes > 0 ? 'border-orange-200 bg-orange-50' : ''}`}>
          <div className={`p-2 rounded-lg ${quickStats.ajustes > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
            <RefreshCw className={`w-5 h-5 ${quickStats.ajustes > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${quickStats.ajustes > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {quickStats.ajustes}
            </p>
            <p className="text-xs text-gray-500">Ajustes</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Eye className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{quickStats.revisao}</p>
            <p className="text-xs text-gray-500">Revisão</p>
          </div>
        </Card>
        <Card className={`p-4 flex items-center gap-3 ${quickStats.urgentes > 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`p-2 rounded-lg ${quickStats.urgentes > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${quickStats.urgentes > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${quickStats.urgentes > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {quickStats.urgentes}
            </p>
            <p className="text-xs text-gray-500">Urgentes</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Filter (só pra gestor) */}
          {isGestor && (
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
                <Users className="w-4 h-4 inline mr-1" /> Toda Equipe
              </button>
            </div>
          )}

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="producao">🎨 Produção</option>
            <option value="ajuste">🔄 Ajustes</option>
            <option value="revisao">👁️ Revisão</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tudo em dia! 🎉</h3>
          <p className="text-sm text-gray-500">
            {filterView === 'mine' 
              ? 'Você não tem tarefas pendentes no momento' 
              : 'Nenhuma tarefa encontrada com os filtros atuais'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const typeConfig = TASK_TYPE_CONFIG[task.type]
            const TypeIcon = typeConfig.icon
            const prioConfig = PRIORIDADE_CONFIG[task.prioridade]
            
            const isUrgent = task.prioridade === 'urgente'
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

            return (
              <Card 
                key={task.id} 
                className={`p-4 hover:shadow-md transition-all ${
                  isUrgent || isOverdue ? 'border-red-200 bg-red-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox para concluir */}
                  <button
                    onClick={() => completeTask(task)}
                    className="mt-1 flex-shrink-0 text-gray-300 hover:text-green-500 hover:scale-110 transition-all"
                    title="Marcar como concluído"
                  >
                    <Circle className="w-6 h-6" />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {task.titulo}
                        </h3>
                        {task.ajusteComment && (
                          <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-800 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span className="italic">"{task.ajusteComment}"</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Link para o conteúdo */}
                      <Link 
                        href={`/clientes/${task.cliente?.slug}/conteudo/${task.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        title="Ver conteúdo"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {/* Tipo */}
                      <Badge className={`text-xs ${typeConfig.color}`}>
                        <TypeIcon className="w-3 h-3 mr-1" />
                        {typeConfig.label}
                      </Badge>

                      {/* Prioridade */}
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className={`w-2 h-2 rounded-full ${prioConfig.dot}`} />
                        {prioConfig.label}
                      </span>

                      {/* Cliente */}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {task.cliente?.nome}
                      </span>

                      {/* Tipo do conteúdo */}
                      <span className="text-xs text-gray-400">
                        {TIPO_EMOJI[task.conteudo?.tipo] || '📄'} {task.conteudo?.tipo}
                      </span>

                      {/* Data */}
                      {task.dueDate && (
                        <span className={`text-xs flex items-center gap-1 ${
                          isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Ajuda */}
      <Card className="mt-8 p-4 bg-gray-50 border-dashed">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ListTodo className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Como funciona?</h4>
            <p className="text-sm text-gray-500 mt-1">
              As tarefas são geradas automaticamente do Workflow. Quando um conteúdo entra em <strong>produção</strong> ou 
              recebe um <strong>pedido de ajuste</strong>, aparece aqui. Marque como concluído para avançar o status.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
