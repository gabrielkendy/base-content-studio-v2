'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { CreationQueue } from '@/components/factory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Factory, Sparkles, Zap, CheckCircle, Clock, 
  ArrowRight, Brain, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import type { CreationQueueItem } from '@/types/database'

export default function FactoryPage() {
  const router = useRouter()
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [queueItems, setQueueItems] = useState<CreationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // Stats
  const stats = {
    pending: queueItems.filter(i => i.status === 'pending').length,
    generating: queueItems.filter(i => i.status === 'generating').length,
    review: queueItems.filter(i => i.status === 'review').length,
    approved: queueItems.filter(i => i.status === 'approved').length,
  }

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    try {
      const res = await fetch('/api/discovery/queue')
      const data = await res.json()
      setQueueItems(data.items || [])
    } catch (error) {
      console.error('Error loading queue:', error)
      toast({
        title: 'Erro ao carregar fila',
        description: 'Não foi possível carregar os itens da fila.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleStartGeneration(item: CreationQueueItem) {
    setGeneratingId(item.id)
    
    // Update local state
    setQueueItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, status: 'generating' as const } : i
    ))

    try {
      const res = await fetch('/api/factory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueItemId: item.id,
          topic: item.title,
          framework: item.framework || 'curiosidade',
          sourceCaption: item.discovered_content?.caption,
          sourceUrl: item.source_url,
          customInstructions: item.custom_instructions,
        }),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Update with generated content
      setQueueItems(prev => prev.map(i => 
        i.id === item.id 
          ? { 
              ...i, 
              status: 'review' as const, 
              generated_content: data.content,
              completed_at: new Date().toISOString(),
            } 
          : i
      ))

      toast({
        title: 'Conteúdo gerado!',
        description: 'O carrossel foi criado com sucesso. Revise e aprove.',
      })

      // Navigate to review page
      router.push(`/factory/${item.id}`)

    } catch (error) {
      console.error('Generation error:', error)
      
      // Revert status
      setQueueItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'pending' as const } : i
      ))

      toast({
        title: 'Erro na geração',
        description: 'Não foi possível gerar o conteúdo. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/discovery/queue?id=${id}`, { method: 'DELETE' })
      setQueueItems(prev => prev.filter(i => i.id !== id))
      toast({
        title: 'Removido',
        description: 'Item removido da fila.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
              <Factory className="w-6 h-6 text-white" />
            </div>
            Content Factory
          </h1>
          <p className="text-zinc-400 mt-1">
            Gere e refine carrosséis com IA usando o método BrandsDecoded
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadQueue} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Link href="/discovery">
            <Button className="gap-2">
              <Sparkles className="w-4 h-4" />
              Descobrir Conteúdos
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Aguardando</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Gerando</p>
                <p className="text-2xl font-bold text-blue-400">{stats.generating}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Para revisar</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.review}</p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Aprovados</p>
                <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Fila de Criação</h3>
              <p className="text-sm text-zinc-400">
                {queueItems.length} conteúdo(s) na fila
              </p>
            </div>
            <Link href="/training">
              <Button variant="outline" size="sm" className="gap-2">
                <Brain className="w-4 h-4" />
                Treinar IA
              </Button>
            </Link>
          </div>

          <CreationQueue
            items={queueItems}
            onStartGeneration={handleStartGeneration}
            onDelete={handleDelete}
            isGenerating={generatingId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
