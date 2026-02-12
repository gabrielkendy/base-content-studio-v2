'use client'

import { cn } from '@/lib/utils'
import { CAMPANHA_STATUS, type PlanejamentoAnualStats } from '@/types/campanha'
import { 
  Target, 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react'

interface ResumoAnoProps {
  stats: PlanejamentoAnualStats | null
  ano: number
  loading?: boolean
  className?: string
}

export function ResumoAno({ stats, ano, loading = false, className }: ResumoAnoProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Total de Campanhas',
      value: stats?.total_campanhas ?? 0,
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Em Andamento',
      value: stats?.em_andamento ?? 0,
      icon: Play,
      color: 'bg-emerald-50 text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Concluídas',
      value: stats?.concluidas ?? 0,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Progresso Médio',
      value: `${stats?.progresso_medio ?? 0}%`,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Resumo {ano}
        </h2>
        {stats && stats.orcamento_total > 0 && (
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <DollarSign className="w-4 h-4" />
            <span>
              Orçamento: {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(stats.orcamento_total)}
            </span>
          </div>
        )}
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              'rounded-xl p-4 transition-all hover:shadow-md',
              card.color
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={cn('p-2 rounded-lg', card.iconBg)}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detalhamento por status */}
      {stats && stats.total_campanhas > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <StatusPill 
            label="Planejadas" 
            value={stats.planejadas} 
            status="planejada" 
          />
          <StatusPill 
            label="Em Andamento" 
            value={stats.em_andamento} 
            status="em_andamento" 
          />
          <StatusPill 
            label="Pausadas" 
            value={stats.pausadas} 
            status="pausada" 
          />
          <StatusPill 
            label="Concluídas" 
            value={stats.concluidas} 
            status="concluida" 
          />
          <StatusPill 
            label="Canceladas" 
            value={stats.canceladas} 
            status="cancelada" 
          />
        </div>
      )}
    </div>
  )
}

// Pill de status individual
function StatusPill({ 
  label, 
  value, 
  status 
}: { 
  label: string
  value: number
  status: keyof typeof CAMPANHA_STATUS 
}) {
  const info = CAMPANHA_STATUS[status]
  
  if (value === 0) return null

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `${info.cor}15`,
        color: info.cor
      }}
    >
      <span>{info.icone}</span>
      <span>{value} {label.toLowerCase()}</span>
    </div>
  )
}

// Versão compacta para sidebar ou header
interface ResumoAnoCompactProps {
  stats: PlanejamentoAnualStats | null
  className?: string
}

export function ResumoAnoCompact({ stats, className }: ResumoAnoCompactProps) {
  if (!stats) return null

  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-400">📊</span>
        <span className="font-medium">{stats.total_campanhas}</span>
        <span className="text-zinc-500">campanhas</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-500">●</span>
        <span>{stats.em_andamento} em andamento</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-green-500">✓</span>
        <span>{stats.concluidas} concluídas</span>
      </div>
    </div>
  )
}
