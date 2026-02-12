'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useCampanhas } from '@/hooks/use-campanhas'
import { db } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  TimelineAnual, 
  CampanhaList,
  CampanhaModal,
  DeleteCampanhaModal,
  DuplicateCampanhaModal,
  ResumoAno 
} from '@/components/planejamento'
import type { CampanhaComStats, CampanhaInput } from '@/types/campanha'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowLeft,
  LayoutGrid,
  List,
  Target
} from 'lucide-react'
import type { Cliente } from '@/types/database'

type ViewMode = 'timeline' | 'grid' | 'list'

export default function PlanejamentoPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  // Estado
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [loading, setLoading] = useState(true)

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingCampanha, setEditingCampanha] = useState<CampanhaComStats | null>(null)
  const [deletingCampanha, setDeletingCampanha] = useState<CampanhaComStats | null>(null)
  const [duplicatingCampanha, setDuplicatingCampanha] = useState<CampanhaComStats | null>(null)

  // Hook de campanhas
  const { 
    campanhas, 
    stats, 
    loading: loadingCampanhas,
    fetchCampanhas,
    fetchStats,
    createCampanha,
    updateCampanha,
    deleteCampanha,
    duplicateCampanha
  } = useCampanhas({ 
    clienteId: cliente?.id || '', 
    ano 
  })

  // Carregar cliente
  useEffect(() => {
    async function loadCliente() {
      if (!org) return
      
      const { data } = await db.select('clientes', { 
        filters: [
          { op: 'eq', col: 'org_id', val: org.id }, 
          { op: 'eq', col: 'slug', val: slug }
        ], 
        single: true 
      })
      
      if (data) {
        setCliente(data)
      }
      setLoading(false)
    }
    
    loadCliente()
  }, [org, slug])

  // Carregar campanhas quando cliente mudar
  useEffect(() => {
    if (cliente?.id) {
      fetchCampanhas()
      fetchStats()
    }
  }, [cliente?.id, ano, fetchCampanhas, fetchStats])

  // Handlers
  const handleCreateCampanha = async (input: CampanhaInput) => {
    const result = await createCampanha(input)
    if (result.error) {
      toast(result.error, 'error')
      return { error: result.error }
    }
    toast('Campanha criada com sucesso!', 'success')
    return { error: null }
  }

  const handleUpdateCampanha = async (input: CampanhaInput) => {
    if (!editingCampanha) return { error: 'Nenhuma campanha selecionada' }
    
    const result = await updateCampanha(editingCampanha.id, input)
    if (result.error) {
      toast(result.error, 'error')
      return { error: result.error }
    }
    toast('Campanha atualizada!', 'success')
    setEditingCampanha(null)
    return { error: null }
  }

  const handleDeleteCampanha = async () => {
    if (!deletingCampanha) return
    
    const result = await deleteCampanha(deletingCampanha.id)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Campanha excluída', 'success')
    }
    setDeletingCampanha(null)
  }

  const handleDuplicateCampanha = async (novoAno: number) => {
    if (!duplicatingCampanha) return
    
    const result = await duplicateCampanha(duplicatingCampanha.id, novoAno)
    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast(`Campanha duplicada para ${novoAno}!`, 'success')
    }
    setDuplicatingCampanha(null)
  }

  const handleCampanhaClick = (campanha: CampanhaComStats) => {
    setEditingCampanha(campanha)
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="text-center py-12 text-zinc-500">
        Cliente não encontrado
      </div>
    )
  }

  const primaria = cliente.cores?.primaria || '#6366F1'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link 
            href={`/clientes/${slug}`}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: primaria }} />
              <h1 className="text-2xl font-bold text-zinc-900">
                Planejamento Anual
              </h1>
            </div>
            <p className="text-sm text-zinc-500">{cliente.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Toggle de visualização */}
          <div className="flex items-center bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'timeline' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
              }`}
              title="Timeline"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-white/50'
              }`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Botão nova campanha */}
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* Resumo do ano */}
      <ResumoAno 
        stats={stats} 
        ano={ano} 
        loading={loadingCampanhas}
      />

      {/* Conteúdo principal */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-zinc-100">
          <CardTitle className="text-lg">
            {viewMode === 'timeline' ? 'Timeline' : 'Campanhas'} de {ano}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loadingCampanhas ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : viewMode === 'timeline' ? (
            <TimelineAnual
              campanhas={campanhas}
              ano={ano}
              onCampanhaClick={handleCampanhaClick}
            />
          ) : (
            <CampanhaList
              campanhas={campanhas}
              onEdit={setEditingCampanha}
              onDuplicate={setDuplicatingCampanha}
              onDelete={setDeletingCampanha}
              onClick={handleCampanhaClick}
              compact={viewMode === 'list'}
              emptyMessage={`Nenhuma campanha planejada para ${ano}`}
            />
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <CampanhaModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateCampanha}
        clienteId={cliente.id}
        ano={ano}
      />

      <CampanhaModal
        open={!!editingCampanha}
        onClose={() => setEditingCampanha(null)}
        onSave={handleUpdateCampanha}
        campanha={editingCampanha}
        clienteId={cliente.id}
        ano={ano}
      />

      <DeleteCampanhaModal
        open={!!deletingCampanha}
        onClose={() => setDeletingCampanha(null)}
        onConfirm={handleDeleteCampanha}
        campanha={deletingCampanha}
      />

      <DuplicateCampanhaModal
        open={!!duplicatingCampanha}
        onClose={() => setDuplicatingCampanha(null)}
        onConfirm={handleDuplicateCampanha}
        campanha={duplicatingCampanha}
      />
    </div>
  )
}
