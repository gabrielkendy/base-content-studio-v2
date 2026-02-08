'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Clock, Play, CheckCircle, XCircle, Eye, Zap, 
  MoreVertical, Trash2, ArrowRight, Instagram
} from 'lucide-react'
import { CreationQueueItem, BrandsDecodedFramework } from '@/types/database'
import { Button } from '@/components/ui/button'

interface CreationQueueProps {
  items: CreationQueueItem[]
  onStartGeneration: (item: CreationQueueItem) => void
  onDelete: (id: string) => void
  isGenerating?: string | null
}

const STATUS_CONFIG = {
  pending: { label: 'Aguardando', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  generating: { label: 'Gerando...', color: 'bg-blue-500/20 text-blue-400', icon: Zap },
  review: { label: 'Pronto', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  approved: { label: 'Aprovado', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  published: { label: 'Publicado', color: 'bg-purple-500/20 text-purple-400', icon: Instagram },
  discarded: { label: 'Descartado', color: 'bg-red-500/20 text-red-400', icon: XCircle },
}

const FRAMEWORK_LABELS: Record<BrandsDecodedFramework, string> = {
  curiosidade: '🔮 Curiosidade',
  autoridade: '👑 Autoridade',
  beneficio: '🎯 Benefício',
  pergunta: '❓ Pergunta',
  testemunho: '💬 Testemunho',
  lista: '📋 Lista',
  problema_solucao: '💡 Problema/Solução',
  passo_a_passo: '📝 Passo a Passo',
  segredo: '🤫 Segredo',
}

export function CreationQueue({ items, onStartGeneration, onDelete, isGenerating }: CreationQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400 mb-2">Nenhum conteúdo na fila</p>
        <p className="text-sm text-zinc-500">Use o Discovery para encontrar conteúdos e adicionar aqui</p>
        <Link href="/discovery">
          <Button variant="outline" className="mt-4 gap-2">
            Ir para Discovery
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = STATUS_CONFIG[item.status]
        const StatusIcon = status.icon
        const isExpanded = expandedId === item.id
        const isCurrentlyGenerating = isGenerating === item.id

        return (
          <div
            key={item.id}
            className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors"
          >
            {/* Main row */}
            <div className="p-4 flex items-center gap-4">
              {/* Status */}
              <div className={`p-2 rounded-lg ${status.color}`}>
                {isCurrentlyGenerating ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <StatusIcon className="w-5 h-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">
                  {item.title}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                  {item.source_handle && (
                    <span>@{item.source_handle}</span>
                  )}
                  {item.framework && (
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs">
                      {FRAMEWORK_LABELS[item.framework]}
                    </span>
                  )}
                  <span>{item.target_slides} slides</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {item.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => onStartGeneration(item)}
                    disabled={!!isGenerating}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Gerar
                  </Button>
                )}

                {item.status === 'review' && (
                  <Link href={`/factory/${item.id}`}>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Eye className="w-4 h-4" />
                      Revisar
                    </Button>
                  </Link>
                )}

                {item.status === 'generating' && (
                  <span className="text-sm text-blue-400 animate-pulse">
                    Gerando com IA...
                  </span>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-zinc-700 space-y-3">
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-400 hover:text-violet-300"
                  >
                    Ver fonte original →
                  </a>
                )}

                {item.custom_instructions && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Instruções:</p>
                    <p className="text-sm text-zinc-300">{item.custom_instructions}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remover da fila
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
