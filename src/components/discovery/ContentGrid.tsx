'use client'

import { DiscoveredContent } from '@/types/database'
import { ContentCard } from './ContentCard'
import { Loader2, SearchX, Sparkles } from 'lucide-react'

interface ContentGridProps {
  contents: DiscoveredContent[]
  isLoading?: boolean
  onAddToQueue: (content: DiscoveredContent) => void
  addingIds?: string[]
}

export function ContentGrid({ contents, isLoading, onAddToQueue, addingIds = [] }: ContentGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-lg font-medium">Buscando conteúdos virais...</p>
        <p className="text-sm text-zinc-500">Analisando com IA para encontrar os melhores</p>
      </div>
    )
  }

  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <div className="p-4 bg-zinc-800 rounded-full mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <p className="text-lg font-medium">Nenhum conteúdo encontrado</p>
        <p className="text-sm text-zinc-500">Tente ajustar os filtros ou adicionar novas fontes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>
            <strong className="text-white">{contents.length}</strong> conteúdos encontrados
          </span>
        </div>
        <div className="text-sm text-zinc-500">
          Score médio: <strong className="text-emerald-400">
            {Math.round(contents.reduce((a, b) => a + b.overall_score, 0) / contents.length)}
          </strong>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contents.map(content => (
          <ContentCard
            key={content.id}
            content={content}
            onAddToQueue={onAddToQueue}
            isAdding={addingIds.includes(content.id)}
          />
        ))}
      </div>
    </div>
  )
}
