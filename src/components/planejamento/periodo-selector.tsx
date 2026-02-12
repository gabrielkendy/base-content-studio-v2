'use client'

import { cn } from '@/lib/utils'
import { MESES } from '@/types/campanha'
import { ChevronDown } from 'lucide-react'

interface PeriodoSelectorProps {
  mesInicio: number
  mesFim: number
  onChangeMesInicio: (mes: number) => void
  onChangeMesFim: (mes: number) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function PeriodoSelector({
  mesInicio,
  mesFim,
  onChangeMesInicio,
  onChangeMesFim,
  error,
  disabled = false,
  className
}: PeriodoSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-zinc-700">
        Período
      </label>
      
      <div className="flex items-center gap-3">
        {/* Mês Início */}
        <div className="relative flex-1">
          <select
            value={mesInicio}
            onChange={(e) => onChangeMesInicio(Number(e.target.value))}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white px-4 py-2.5 pr-10',
              'text-sm font-medium text-zinc-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-zinc-50 disabled:text-zinc-400',
              error ? 'border-red-300' : 'border-zinc-200'
            )}
          >
            {MESES.map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>

        <span className="text-zinc-400 font-medium">até</span>

        {/* Mês Fim */}
        <div className="relative flex-1">
          <select
            value={mesFim}
            onChange={(e) => onChangeMesFim(Number(e.target.value))}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-xl border bg-white px-4 py-2.5 pr-10',
              'text-sm font-medium text-zinc-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-zinc-50 disabled:text-zinc-400',
              error ? 'border-red-300' : 'border-zinc-200'
            )}
          >
            {MESES.filter(m => m.value >= mesInicio).map((mes) => (
              <option key={mes.value} value={mes.value}>
                {mes.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Preview do período */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>📅</span>
        <span>
          {mesFim - mesInicio + 1} {mesFim - mesInicio + 1 === 1 ? 'mês' : 'meses'} de duração
        </span>
      </div>
    </div>
  )
}

// Versão compacta para uso inline
interface PeriodoSelectorCompactProps {
  mesInicio: number
  mesFim: number
  onChange: (inicio: number, fim: number) => void
  disabled?: boolean
}

export function PeriodoSelectorCompact({
  mesInicio,
  mesFim,
  onChange,
  disabled = false
}: PeriodoSelectorCompactProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <select
        value={mesInicio}
        onChange={(e) => {
          const novoInicio = Number(e.target.value)
          onChange(novoInicio, Math.max(novoInicio, mesFim))
        }}
        disabled={disabled}
        className="appearance-none bg-transparent border-b border-zinc-300 px-1 py-0.5 focus:outline-none focus:border-blue-500"
      >
        {MESES.map((mes) => (
          <option key={mes.value} value={mes.value}>{mes.short}</option>
        ))}
      </select>
      <span className="text-zinc-400">→</span>
      <select
        value={mesFim}
        onChange={(e) => onChange(mesInicio, Number(e.target.value))}
        disabled={disabled}
        className="appearance-none bg-transparent border-b border-zinc-300 px-1 py-0.5 focus:outline-none focus:border-blue-500"
      >
        {MESES.filter(m => m.value >= mesInicio).map((mes) => (
          <option key={mes.value} value={mes.value}>{mes.short}</option>
        ))}
      </select>
    </div>
  )
}
