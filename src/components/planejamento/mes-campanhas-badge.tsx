'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CampanhaBadge, CampanhaBadgeCounter } from './campanha-badge'
import type { CampanhaComStats } from '@/types/campanha'

interface MesCampanhasBadgeProps {
  clienteId: string
  ano: number
  mes: number
  onCampanhaClick?: (campanha: CampanhaComStats) => void
  maxBadges?: number
  className?: string
}

export function MesCampanhasBadge({
  clienteId,
  ano,
  mes,
  onCampanhaClick,
  maxBadges = 3,
  className
}: MesCampanhasBadgeProps) {
  const [campanhas, setCampanhas] = useState<CampanhaComStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampanhas() {
      try {
        const params = new URLSearchParams({
          cliente_id: clienteId,
          ano: ano.toString()
        })
        
        const res = await fetch(`/api/campanhas?${params}`)
        const data = await res.json()
        
        // Filtrar campanhas que incluem este mês
        const campanhasDoMes = (data.data || []).filter(
          (c: CampanhaComStats) => mes >= c.mes_inicio && mes <= c.mes_fim
        )
        
        setCampanhas(campanhasDoMes)
      } catch (err) {
        console.error('Erro ao buscar campanhas do mês:', err)
      } finally {
        setLoading(false)
      }
    }

    if (clienteId) {
      fetchCampanhas()
    }
  }, [clienteId, ano, mes])

  if (loading || campanhas.length === 0) {
    return null
  }

  const campanhasVisiveis = campanhas.slice(0, maxBadges)
  const campanhasRestantes = campanhas.length - maxBadges

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {campanhasVisiveis.map((campanha) => (
        <CampanhaBadge
          key={campanha.id}
          nome={campanha.nome}
          tipo={campanha.tipo}
          status={campanha.status}
          cor={campanha.cor}
          onClick={() => onCampanhaClick?.(campanha)}
          size="sm"
          showStatus
        />
      ))}
      {campanhasRestantes > 0 && (
        <CampanhaBadgeCounter count={campanhasRestantes} />
      )}
    </div>
  )
}

// Hook para usar em componentes existentes
export function useCampanhasDoMes(clienteId: string, ano: number, mes: number) {
  const [campanhas, setCampanhas] = useState<CampanhaComStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampanhas() {
      if (!clienteId) {
        setLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({
          cliente_id: clienteId,
          ano: ano.toString()
        })
        
        const res = await fetch(`/api/campanhas?${params}`)
        const data = await res.json()
        
        // Filtrar campanhas que incluem este mês
        const campanhasDoMes = (data.data || []).filter(
          (c: CampanhaComStats) => mes >= c.mes_inicio && mes <= c.mes_fim
        )
        
        setCampanhas(campanhasDoMes)
      } catch (err) {
        console.error('Erro ao buscar campanhas do mês:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCampanhas()
  }, [clienteId, ano, mes])

  return { campanhas, loading }
}
