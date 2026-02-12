'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  MESES, 
  CAMPANHA_TIPOS,
  CAMPANHA_STATUS,
  getMesLabel,
  type CampanhaComStats 
} from '@/types/campanha'

interface TimelineAnualProps {
  campanhas: CampanhaComStats[]
  ano: number
  onCampanhaClick?: (campanha: CampanhaComStats) => void
  mesAtual?: number
  className?: string
}

export function TimelineAnual({
  campanhas,
  ano,
  onCampanhaClick,
  mesAtual = new Date().getMonth() + 1,
  className
}: TimelineAnualProps) {
  const [hoveredCampanha, setHoveredCampanha] = useState<string | null>(null)

  // Agrupar campanhas por "faixas" para evitar sobreposição visual
  const faixas = useMemo(() => {
    const result: CampanhaComStats[][] = []
    
    // Ordenar por início e duração (maiores primeiro)
    const sorted = [...campanhas].sort((a, b) => {
      if (a.mes_inicio !== b.mes_inicio) return a.mes_inicio - b.mes_inicio
      return (b.mes_fim - b.mes_inicio) - (a.mes_fim - a.mes_inicio)
    })

    for (const campanha of sorted) {
      // Encontrar primeira faixa onde não há conflito
      let faixaIndex = result.findIndex(faixa => {
        return !faixa.some(c => 
          (campanha.mes_inicio <= c.mes_fim && campanha.mes_fim >= c.mes_inicio)
        )
      })

      if (faixaIndex === -1) {
        faixaIndex = result.length
        result.push([])
      }

      result[faixaIndex].push(campanha)
    }

    return result
  }, [campanhas])

  const isAnoAtual = ano === new Date().getFullYear()

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header com meses */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[800px]">
          {/* Meses */}
          <div className="grid grid-cols-12 gap-1 mb-4">
            {MESES.map((mes) => (
              <div
                key={mes.value}
                className={cn(
                  'text-center py-2 rounded-lg text-sm font-medium',
                  isAnoAtual && mes.value === mesAtual
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-zinc-50 text-zinc-600'
                )}
              >
                {mes.short}
              </div>
            ))}
          </div>

          {/* Linha do tempo com indicador de mês atual */}
          <div className="relative">
            {/* Grid de fundo */}
            <div className="grid grid-cols-12 gap-1 absolute inset-0">
              {MESES.map((mes) => (
                <div
                  key={mes.value}
                  className={cn(
                    'border-l border-zinc-100',
                    isAnoAtual && mes.value === mesAtual && 'border-l-2 border-blue-300'
                  )}
                />
              ))}
            </div>

            {/* Faixas de campanhas */}
            <div className="relative space-y-2 py-2">
              {faixas.length === 0 ? (
                <div className="h-20 flex items-center justify-center text-zinc-400 text-sm">
                  Nenhuma campanha para {ano}
                </div>
              ) : (
                faixas.map((faixa, faixaIndex) => (
                  <div key={faixaIndex} className="relative h-12">
                    {faixa.map((campanha) => {
                      const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
                      const statusInfo = CAMPANHA_STATUS[campanha.status]
                      const startPercent = ((campanha.mes_inicio - 1) / 12) * 100
                      const widthPercent = ((campanha.mes_fim - campanha.mes_inicio + 1) / 12) * 100
                      const isHovered = hoveredCampanha === campanha.id

                      return (
                        <div
                          key={campanha.id}
                          className={cn(
                            'absolute top-1 h-10 rounded-lg cursor-pointer transition-all duration-200',
                            'flex items-center px-3 gap-2 overflow-hidden',
                            'border-2',
                            isHovered ? 'shadow-lg scale-[1.02] z-10' : 'shadow-sm'
                          )}
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: `${campanha.cor || tipoInfo.cor}15`,
                            borderColor: campanha.cor || tipoInfo.cor,
                          }}
                          onClick={() => onCampanhaClick?.(campanha)}
                          onMouseEnter={() => setHoveredCampanha(campanha.id)}
                          onMouseLeave={() => setHoveredCampanha(null)}
                        >
                          {/* Barra de progresso no fundo */}
                          <div 
                            className="absolute inset-0 opacity-20 transition-all"
                            style={{
                              width: `${campanha.progresso}%`,
                              backgroundColor: campanha.cor || tipoInfo.cor,
                            }}
                          />
                          
                          {/* Conteúdo */}
                          <span className="relative text-base">{tipoInfo.icone}</span>
                          <span 
                            className="relative text-sm font-medium truncate"
                            style={{ color: campanha.cor || tipoInfo.cor }}
                          >
                            {campanha.nome}
                          </span>
                          
                          {/* Status indicator */}
                          <span 
                            className="relative ml-auto w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusInfo.cor }}
                            title={statusInfo.label}
                          />
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip/Preview da campanha hover */}
      {hoveredCampanha && (
        <CampanhaTooltip 
          campanha={campanhas.find(c => c.id === hoveredCampanha)!}
        />
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100">
        <span className="text-xs text-zinc-500 font-medium">Status:</span>
        {Object.entries(CAMPANHA_STATUS).map(([key, info]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: info.cor }}
            />
            <span>{info.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tooltip com detalhes da campanha
function CampanhaTooltip({ campanha }: { campanha: CampanhaComStats }) {
  const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
  const statusInfo = CAMPANHA_STATUS[campanha.status]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 p-4 min-w-[300px] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{tipoInfo.icone}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-zinc-900">{campanha.nome}</h4>
            <p className="text-sm text-zinc-500">
              {getMesLabel(campanha.mes_inicio)} - {getMesLabel(campanha.mes_fim)}
            </p>
          </div>
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${statusInfo.cor}15`,
              color: statusInfo.cor
            }}
          >
            {statusInfo.label}
          </span>
        </div>

        {campanha.meta_principal && (
          <p className="mt-2 text-sm text-zinc-600">
            🎯 {campanha.meta_principal}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>{campanha.total_conteudos} conteúdos</span>
          <span>{campanha.progresso}% concluído</span>
        </div>
      </div>
    </div>
  )
}

// Versão compacta para sidebar
interface TimelineCompactaProps {
  campanhas: CampanhaComStats[]
  mesAtual: number
  onCampanhaClick?: (campanha: CampanhaComStats) => void
}

export function TimelineCompacta({ 
  campanhas, 
  mesAtual,
  onCampanhaClick 
}: TimelineCompactaProps) {
  // Campanhas do mês atual
  const campanhasDoMes = campanhas.filter(
    c => mesAtual >= c.mes_inicio && mesAtual <= c.mes_fim
  )

  if (campanhasDoMes.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-400 text-sm">
        Nenhuma campanha ativa em {getMesLabel(mesAtual)}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {campanhasDoMes.map((campanha) => {
        const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
        const statusInfo = CAMPANHA_STATUS[campanha.status]

        return (
          <button
            key={campanha.id}
            onClick={() => onCampanhaClick?.(campanha)}
            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 transition-colors text-left"
          >
            <div 
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {campanha.nome}
              </p>
              <p className="text-xs text-zinc-500">
                {campanha.progresso}% • {statusInfo.label}
              </p>
            </div>
            <span>{tipoInfo.icone}</span>
          </button>
        )
      })}
    </div>
  )
}
