'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  CAMPANHA_TIPOS, 
  CAMPANHA_STATUS,
  getMesLabel,
  getPeriodoLabel,
  type CampanhaComStats 
} from '@/types/campanha'
import { Target, ChevronRight, Calendar } from 'lucide-react'

interface CampanhaWithCliente extends CampanhaComStats {
  cliente?: {
    id: string
    nome: string
    slug: string
    logo_url?: string
  }
}

interface DashboardCampanhasProps {
  className?: string
}

export function DashboardCampanhas({ className }: DashboardCampanhasProps) {
  const [campanhasAtivas, setCampanhasAtivas] = useState<CampanhaWithCliente[]>([])
  const [campanhasProximas, setCampanhasProximas] = useState<CampanhaWithCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampanhas() {
      try {
        const [ativasRes, proximasRes] = await Promise.all([
          fetch('/api/campanhas/ativas?tipo=ativas&limit=5'),
          fetch('/api/campanhas/ativas?tipo=proximas&limit=3')
        ])

        const ativasData = await ativasRes.json()
        const proximasData = await proximasRes.json()

        setCampanhasAtivas(ativasData.data || [])
        setCampanhasProximas(proximasData.data || [])
      } catch (err) {
        console.error('Erro ao buscar campanhas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCampanhas()
  }, [])

  if (loading) {
    return (
      <Card className={cn('border-0 shadow-lg', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  const temCampanhas = campanhasAtivas.length > 0 || campanhasProximas.length > 0

  if (!temCampanhas) {
    return (
      <Card className={cn('border-0 shadow-lg', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-blue-500" />
            Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma campanha ativa</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-0 shadow-lg', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-blue-500" />
          Campanhas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campanhas Ativas */}
        {campanhasAtivas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Em andamento
            </h4>
            <div className="space-y-2">
              {campanhasAtivas.map((campanha) => (
                <CampanhaItem key={campanha.id} campanha={campanha} />
              ))}
            </div>
          </div>
        )}

        {/* Próximas Campanhas */}
        {campanhasProximas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Próximo mês
            </h4>
            <div className="space-y-2">
              {campanhasProximas.map((campanha) => (
                <CampanhaItem key={campanha.id} campanha={campanha} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Item individual de campanha
function CampanhaItem({ campanha }: { campanha: CampanhaWithCliente }) {
  const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
  const statusInfo = CAMPANHA_STATUS[campanha.status]

  return (
    <Link
      href={`/clientes/${campanha.cliente?.slug}/planejamento`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-all group"
    >
      {/* Barra de cor */}
      <div 
        className="w-1 h-12 rounded-full flex-shrink-0"
        style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
      />

      {/* Avatar do cliente */}
      {campanha.cliente && (
        <Avatar 
          name={campanha.cliente.nome} 
          src={campanha.cliente.logo_url}
          size="sm"
          className="flex-shrink-0"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{tipoInfo.icone}</span>
          <p className="font-medium text-zinc-900 truncate text-sm">
            {campanha.nome}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{campanha.cliente?.nome}</span>
          <span>•</span>
          <span>{getPeriodoLabel(campanha.mes_inicio, campanha.mes_fim)}</span>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16">
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${campanha.progresso}%`,
                backgroundColor: campanha.cor || tipoInfo.cor
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 text-right mt-0.5">
            {campanha.progresso}%
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
      </div>
    </Link>
  )
}

// Versão compacta para sidebar
export function DashboardCampanhasCompact({ className }: { className?: string }) {
  const [campanhas, setCampanhas] = useState<CampanhaWithCliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampanhas() {
      try {
        const res = await fetch('/api/campanhas/ativas?tipo=ativas&limit=3')
        const data = await res.json()
        setCampanhas(data.data || [])
      } catch (err) {
        console.error('Erro ao buscar campanhas:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCampanhas()
  }, [])

  if (loading) {
    return <Skeleton className="h-20 w-full" />
  }

  if (campanhas.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Campanhas Ativas
      </h4>
      {campanhas.map((campanha) => {
        const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
        return (
          <Link
            key={campanha.id}
            href={`/clientes/${campanha.cliente?.slug}/planejamento`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 transition-all"
          >
            <div 
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-700 truncate">
                {campanha.nome}
              </p>
              <p className="text-[10px] text-zinc-400">
                {campanha.progresso}%
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
