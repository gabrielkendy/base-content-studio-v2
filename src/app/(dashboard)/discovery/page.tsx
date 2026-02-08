'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { SearchFilters, ContentGrid } from '@/components/discovery'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, Factory, Settings, Sparkles, TrendingUp, 
  Plus, Zap, Brain, RefreshCw, Database
} from 'lucide-react'
import Link from 'next/link'
import type { DiscoveredContent, DiscoveryFilters, ContentSource } from '@/types/database'

export default function DiscoveryPage() {
  const { org, member, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  // States
  const [activeTab, setActiveTab] = useState<'discover' | 'sources' | 'queue'>('discover')
  const [filters, setFilters] = useState<DiscoveryFilters>({
    platform: ['instagram'],
    period: '7d',
    sort_by: 'viral',
  })
  const [contents, setContents] = useState<DiscoveredContent[]>([])
  const [sources, setSources] = useState<ContentSource[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [addingIds, setAddingIds] = useState<string[]>([])
  const [queueCount, setQueueCount] = useState(0)

  // Load initial data
  useEffect(() => {
    if (!org) return
    loadSources()
    loadQueueCount()
  }, [org])

  async function loadSources() {
    try {
      const res = await fetch('/api/discovery/sources')
      const data = await res.json()
      if (data.sources) {
        setSources(data.sources)
      }
    } catch (error) {
      console.error('Error loading sources:', error)
    }
  }

  async function loadQueueCount() {
    try {
      const res = await fetch('/api/discovery/queue/count')
      const data = await res.json()
      if (data.count !== undefined) {
        setQueueCount(data.count)
      }
    } catch (error) {
      console.error('Error loading queue count:', error)
    }
  }

  async function handleSearch() {
    setIsSearching(true)
    try {
      const res = await fetch('/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      })
      const data = await res.json()
      
      if (data.error) {
        toast({
          title: 'Erro na busca',
          description: data.error,
          variant: 'destructive',
        })
        return
      }

      setContents(data.contents || [])
      
      if (data.contents?.length > 0) {
        toast({
          title: 'Busca concluída!',
          description: `${data.contents.length} conteúdos encontrados`,
        })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar conteúdos. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  async function handleAddToQueue(content: DiscoveredContent) {
    setAddingIds(prev => [...prev, content.id])
    try {
      const res = await fetch('/api/discovery/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      })
      const data = await res.json()

      if (data.error) {
        toast({
          title: 'Erro ao adicionar',
          description: data.error,
          variant: 'destructive',
        })
        return
      }

      // Update local state
      setContents(prev => prev.map(c => 
        c.id === content.id ? { ...c, status: 'queued' as const } : c
      ))
      setQueueCount(prev => prev + 1)

      toast({
        title: 'Adicionado à fila!',
        description: `"${content.ai_summary?.slice(0, 50)}..." foi adicionado`,
      })
    } catch (error) {
      console.error('Add to queue error:', error)
      toast({
        title: 'Erro ao adicionar',
        description: 'Não foi possível adicionar à fila.',
        variant: 'destructive',
      })
    } finally {
      setAddingIds(prev => prev.filter(id => id !== content.id))
    }
  }

  if (authLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            Content Discovery
          </h1>
          <p className="text-zinc-400 mt-1">
            Encontre e adapte os melhores conteúdos virais
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Queue indicator */}
          <Link href="/factory">
            <Button variant="outline" className="gap-2">
              <Factory className="w-4 h-4" />
              Fila de Criação
              {queueCount > 0 && (
                <span className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded-full">
                  {queueCount}
                </span>
              )}
            </Button>
          </Link>
          
          <Link href="/training">
            <Button variant="outline" className="gap-2">
              <Brain className="w-4 h-4" />
              Treinar IA
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Fontes ativas</p>
                <p className="text-2xl font-bold text-white">{sources.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Conteúdos hoje</p>
                <p className="text-2xl font-bold text-white">{contents.length}</p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Na fila</p>
                <p className="text-2xl font-bold text-white">{queueCount}</p>
              </div>
              <div className="p-3 bg-violet-500/20 rounded-xl">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Score médio</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {contents.length > 0 
                    ? Math.round(contents.reduce((a, b) => a + b.overall_score, 0) / contents.length)
                    : '-'
                  }
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="discover" className="gap-2">
            <Search className="w-4 h-4" />
            Descobrir
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Database className="w-4 h-4" />
            Fontes
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2">
            <Factory className="w-4 h-4" />
            Fila ({queueCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6 mt-6">
          {/* Search filters */}
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            isLoading={isSearching}
          />

          {/* Results */}
          <ContentGrid
            contents={contents}
            isLoading={isSearching}
            onAddToQueue={handleAddToQueue}
            addingIds={addingIds}
          />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Fontes de Conteúdo</h3>
                  <p className="text-sm text-zinc-400">Perfis e sites monitorados para buscar conteúdos</p>
                </div>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Fonte
                </Button>
              </div>

              {sources.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 mb-2">Nenhuma fonte cadastrada</p>
                  <p className="text-sm text-zinc-500">Adicione perfis do Instagram, TikTok ou sites para começar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map(source => (
                    <div
                      key={source.id}
                      className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {source.avatar_url ? (
                          <img
                            src={source.avatar_url}
                            alt={source.name || source.handle}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                            <Database className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{source.name || source.handle}</p>
                          <p className="text-sm text-zinc-400">@{source.handle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-zinc-700 text-zinc-300 rounded text-xs">
                          {source.platform}
                        </span>
                        {source.niche?.slice(0, 2).map(n => (
                          <span key={n} className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded text-xs">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Fila de Criação</h3>
                  <p className="text-sm text-zinc-400">Conteúdos selecionados para adaptação</p>
                </div>
                <Link href="/factory">
                  <Button className="gap-2">
                    <Factory className="w-4 h-4" />
                    Abrir Factory
                  </Button>
                </Link>
              </div>

              {queueCount === 0 ? (
                <div className="text-center py-12">
                  <Factory className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 mb-2">Fila vazia</p>
                  <p className="text-sm text-zinc-500">Use a aba "Descobrir" para encontrar conteúdos e adicionar à fila</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-400">
                    {queueCount} conteúdo(s) na fila
                  </p>
                  <Link href="/factory">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Zap className="w-4 h-4" />
                      Iniciar Criação
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
