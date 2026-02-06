'use client'

import { Card } from '@/components/ui/card'
import {
  Trophy,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Users,
  BarChart3,
  Calendar,
  Zap,
  Award,
} from 'lucide-react'

interface ProductivityDashboardProps {
  stats: {
    stats: {
      total: number
      pendentes: number
      em_andamento: number
      concluidas: number
      canceladas: number
      atrasadas: number
      concluidas_no_prazo: number
      tempo_medio_conclusao_horas: number | null
      taxa_no_prazo: number | null
      por_prioridade: {
        baixa: number
        normal: number
        alta: number
        urgente: number
      }
    }
    ranking: {
      user_id: string
      nome: string
      concluidas: number
      total: number
      taxa: number
    }[]
    historico: {
      date: string
      concluidas: number
      criadas: number
    }[]
    periodo_dias: number
  } | null
  orgId: string
}

export function ProductivityDashboard({ stats, orgId }: ProductivityDashboardProps) {
  if (!stats) {
    return (
      <Card className="p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Carregando dados de produtividade...</p>
      </Card>
    )
  }

  const { stats: s, ranking, historico, periodo_dias } = stats

  // Calcular taxa de conclusão geral
  const taxaConclusao = s.total > 0 ? Math.round((s.concluidas / s.total) * 100) : 0

  // Max para o gráfico
  const maxHistorico = Math.max(...historico.map(h => Math.max(h.concluidas, h.criadas)), 1)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-700">{taxaConclusao}%</p>
              <p className="text-sm text-green-600">Taxa de Conclusão</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-700">
                {s.tempo_medio_conclusao_horas !== null 
                  ? s.tempo_medio_conclusao_horas < 24 
                    ? `${s.tempo_medio_conclusao_horas}h`
                    : `${Math.round(s.tempo_medio_conclusao_horas / 24)}d`
                  : '-'}
              </p>
              <p className="text-sm text-blue-600">Tempo Médio</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500 rounded-xl">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-700">
                {s.taxa_no_prazo !== null ? `${s.taxa_no_prazo}%` : '-'}
              </p>
              <p className="text-sm text-purple-600">No Prazo</p>
            </div>
          </div>
        </Card>

        <Card className={`p-5 ${s.atrasadas > 0 
          ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' 
          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${s.atrasadas > 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className={`text-3xl font-bold ${s.atrasadas > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                {s.atrasadas}
              </p>
              <p className={`text-sm ${s.atrasadas > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Atrasadas
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histórico */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Últimos 14 dias
          </h3>
          <div className="h-48">
            <div className="flex items-end justify-between h-full gap-1">
              {historico.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5" style={{ height: '140px' }}>
                    {/* Criadas */}
                    <div 
                      className="w-full bg-blue-200 rounded-t"
                      style={{ height: `${(day.criadas / maxHistorico) * 100}%` }}
                      title={`${day.criadas} criadas`}
                    />
                    {/* Concluídas */}
                    <div 
                      className="w-full bg-green-500 rounded-b"
                      style={{ height: `${(day.concluidas / maxHistorico) * 100}%` }}
                      title={`${day.concluidas} concluídas`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-200 rounded" /> Criadas
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded" /> Concluídas
            </span>
          </div>
        </Card>

        {/* Ranking */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Ranking da Equipe
          </h3>
          {ranking.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Sem dados suficientes
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.slice(0, 5).map((member, i) => (
                <div key={member.user_id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.nome}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${member.taxa}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{member.taxa}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{member.concluidas}</p>
                    <p className="text-xs text-gray-400">de {member.total}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Distribuição por Prioridade */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Distribuição por Prioridade
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-600">{s.por_prioridade.baixa}</p>
            <p className="text-sm text-gray-500">⚪ Baixa</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{s.por_prioridade.normal}</p>
            <p className="text-sm text-blue-600">🔵 Normal</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-600">{s.por_prioridade.alta}</p>
            <p className="text-sm text-orange-600">🟠 Alta</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{s.por_prioridade.urgente}</p>
            <p className="text-sm text-red-600">🔴 Urgente</p>
          </div>
        </div>
      </Card>

      {/* Período info */}
      <p className="text-center text-xs text-gray-400">
        <Calendar className="w-3 h-3 inline mr-1" />
        Dados dos últimos {periodo_dias} dias
      </p>
    </div>
  )
}
