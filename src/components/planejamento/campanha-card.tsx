'use client'

import { cn } from '@/lib/utils'
import { 
  CAMPANHA_TIPOS, 
  CAMPANHA_STATUS, 
  CAMPANHA_PRIORIDADES,
  getMesLabel,
  getPeriodoLabel,
  type CampanhaComStats 
} from '@/types/campanha'
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  ChevronRight,
  FileText,
  Calendar
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface CampanhaCardProps {
  campanha: CampanhaComStats
  onEdit?: (campanha: CampanhaComStats) => void
  onDuplicate?: (campanha: CampanhaComStats) => void
  onDelete?: (campanha: CampanhaComStats) => void
  onClick?: (campanha: CampanhaComStats) => void
  compact?: boolean
  className?: string
}

export function CampanhaCard({
  campanha,
  onEdit,
  onDuplicate,
  onDelete,
  onClick,
  compact = false,
  className
}: CampanhaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
  const statusInfo = CAMPANHA_STATUS[campanha.status]
  const prioridadeInfo = CAMPANHA_PRIORIDADES[campanha.prioridade as 1 | 2 | 3]

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(campanha)}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-white',
          'hover:border-zinc-200 hover:shadow-sm transition-all cursor-pointer',
          className
        )}
      >
        <div 
          className="w-1 h-10 rounded-full"
          style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-900 truncate">{campanha.nome}</p>
          <p className="text-xs text-zinc-500">
            {getPeriodoLabel(campanha.mes_inicio, campanha.mes_fim)}
          </p>
        </div>
        <div 
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${statusInfo.cor}15`,
            color: statusInfo.cor
          }}
        >
          {statusInfo.label}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border border-zinc-100 bg-white overflow-hidden',
        'hover:border-zinc-200 hover:shadow-md transition-all',
        className
      )}
    >
      {/* Barra de cor lateral */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
      />

      <div className="pl-4">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{tipoInfo.icone}</span>
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${statusInfo.cor}15`,
                  color: statusInfo.cor
                }}
              >
                {statusInfo.label}
              </span>
              {campanha.prioridade === 3 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${prioridadeInfo.cor}15`,
                    color: prioridadeInfo.cor
                  }}
                >
                  Alta Prioridade
                </span>
              )}
            </div>
            <h3 
              className="font-semibold text-zinc-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onClick?.(campanha)}
            >
              {campanha.nome}
            </h3>
          </div>

          {/* Menu de ações */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-zinc-100 shadow-lg z-10 py-1">
                {onEdit && (
                  <button
                    onClick={() => { onEdit(campanha); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => { onDuplicate(campanha); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(campanha); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Descrição */}
        {campanha.descricao && (
          <p className="px-4 text-sm text-zinc-500 line-clamp-2">
            {campanha.descricao}
          </p>
        )}

        {/* Meta */}
        {campanha.meta_principal && (
          <p className="px-4 mt-2 text-sm text-zinc-600">
            🎯 {campanha.meta_principal}
          </p>
        )}

        {/* Info Row */}
        <div className="flex items-center gap-4 px-4 py-3 mt-2 border-t border-zinc-50 text-sm text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{getPeriodoLabel(campanha.mes_inicio, campanha.mes_fim)}</span>
          </div>
          {campanha.total_conteudos > 0 && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{campanha.total_conteudos} conteúdos</span>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Progresso</span>
            <span className="text-xs font-medium text-zinc-700">{campanha.progresso}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${campanha.progresso}%`,
                backgroundColor: campanha.progresso === 100 ? '#22C55E' : (campanha.cor || tipoInfo.cor)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Lista de campanhas
interface CampanhaListProps {
  campanhas: CampanhaComStats[]
  onEdit?: (campanha: CampanhaComStats) => void
  onDuplicate?: (campanha: CampanhaComStats) => void
  onDelete?: (campanha: CampanhaComStats) => void
  onClick?: (campanha: CampanhaComStats) => void
  compact?: boolean
  emptyMessage?: string
  className?: string
}

export function CampanhaList({
  campanhas,
  onEdit,
  onDuplicate,
  onDelete,
  onClick,
  compact = false,
  emptyMessage = 'Nenhuma campanha encontrada',
  className
}: CampanhaListProps) {
  if (campanhas.length === 0) {
    return (
      <div className={cn('text-center py-12 text-zinc-500', className)}>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn(
      compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      className
    )}>
      {campanhas.map((campanha) => (
        <CampanhaCard
          key={campanha.id}
          campanha={campanha}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onClick={onClick}
          compact={compact}
        />
      ))}
    </div>
  )
}
