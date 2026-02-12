'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TimelineAnual, ResumoAno } from '@/components/planejamento'
import type { CampanhaComStats, PlanejamentoAnualStats } from '@/types/campanha'
import { 
  ChevronLeft, 
  ChevronRight, 
  Target,
  Calendar,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalPlanejamentoPage() {
  const { org, member } = useAuth()
  const [ano, setAno] = useState(new Date().getFullYear())
  const [campanhas, setCampanhas] = useState<CampanhaComStats[]>([])
  const [stats, setStats] = useState<PlanejamentoAnualStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clienteId, setClienteId] = useState<string | null>(null)

  // Buscar cliente vinculado ao membro
  useEffect(() => {
    async function fetchCliente() {
      if (!member?.id || !org?.id) return

      try {
        // Buscar cliente vinculado ao membro
        const res = await fetch(`/api/portal/cliente`)
        const data = await res.json()
        
        if (data.cliente) {
          setClienteId(data.cliente.id)
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err)
      }
    }

    fetchCliente()
  }, [member, org])

  // Buscar campanhas quando tiver clienteId
  useEffect(() => {
    async function fetchData() {
      if (!clienteId) {
        setLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({
          cliente_id: clienteId,
          ano: ano.toString()
        })

        const [campanhasRes, statsRes] = await Promise.all([
          fetch(`/api/campanhas?${params}`),
          fetch(`/api/campanhas/stats?${params}`)
        ])

        const campanhasData = await campanhasRes.json()
        const statsData = await statsRes.json()

        setCampanhas(campanhasData.data || [])
        setStats(statsData.data || null)
      } catch (err) {
        console.error('Erro ao buscar campanhas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clienteId, ano])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!clienteId) {
    return (
      <div className="text-center py-12">
        <Info className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
        <h2 className="text-lg font-semibold text-zinc-700">Acesso não configurado</h2>
        <p className="text-zinc-500 mt-2">
          Entre em contato com a agência para vincular seu acesso.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Planejamento Anual
            </h1>
            <p className="text-sm text-zinc-500">
              Acompanhe as campanhas planejadas
            </p>
          </div>
        </div>

        {/* Seletor de ano */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setAno(a => a - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg min-w-[60px] text-center">
            {ano}
          </span>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setAno(a => a + 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Resumo do ano */}
      <ResumoAno 
        stats={stats} 
        ano={ano} 
        loading={loading}
      />

      {/* Timeline */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-zinc-400" />
            Campanhas de {ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {campanhas.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma campanha planejada para {ano}</p>
            </div>
          ) : (
            <TimelineAnual
              campanhas={campanhas}
              ano={ano}
              onCampanhaClick={(c) => {
                // No portal, apenas mostra um tooltip/modal com detalhes
                // Não permite edição
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Lista de campanhas (versão read-only) */}
      {campanhas.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="text-lg">Detalhes das Campanhas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {campanhas.map((campanha) => (
                <CampanhaReadOnlyItem key={campanha.id} campanha={campanha} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente read-only para exibir campanha no portal
import { 
  CAMPANHA_TIPOS, 
  CAMPANHA_STATUS,
  getMesLabel 
} from '@/types/campanha'

function CampanhaReadOnlyItem({ campanha }: { campanha: CampanhaComStats }) {
  const tipoInfo = CAMPANHA_TIPOS[campanha.tipo]
  const statusInfo = CAMPANHA_STATUS[campanha.status]

  return (
    <div className="p-4 hover:bg-zinc-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Barra de cor */}
        <div 
          className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
          style={{ backgroundColor: campanha.cor || tipoInfo.cor }}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{tipoInfo.icone}</span>
            <h3 className="font-semibold text-zinc-900">{campanha.nome}</h3>
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

          {/* Período */}
          <p className="text-sm text-zinc-500 mb-2">
            📅 {getMesLabel(campanha.mes_inicio)} - {getMesLabel(campanha.mes_fim)} {campanha.ano}
          </p>

          {/* Descrição */}
          {campanha.descricao && (
            <p className="text-sm text-zinc-600 mb-2">
              {campanha.descricao}
            </p>
          )}

          {/* Meta */}
          {campanha.meta_principal && (
            <p className="text-sm text-zinc-700">
              🎯 <strong>Meta:</strong> {campanha.meta_principal}
            </p>
          )}

          {/* Barra de progresso */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-zinc-500">Progresso</span>
              <span className="font-medium text-zinc-700">{campanha.progresso}%</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
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
    </div>
  )
}
