'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  Heart, MessageCircle, Share2, Bookmark, Eye, Play, 
  ExternalLink, Plus, Sparkles, Instagram, Youtube, Twitter,
  ChevronRight, Zap
} from 'lucide-react'
import { DiscoveredContent, BrandsDecodedFramework } from '@/types/database'

// TikTok icon
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

interface ContentCardProps {
  content: DiscoveredContent
  onAddToQueue: (content: DiscoveredContent) => void
  isAdding?: boolean
}

const FRAMEWORK_LABELS: Record<BrandsDecodedFramework, string> = {
  curiosidade: 'Curiosidade',
  autoridade: 'Autoridade',
  beneficio: 'Benefício Direto',
  pergunta: 'Pergunta Impactante',
  testemunho: 'Testemunho Real',
  lista: 'Lista Valiosa',
  problema_solucao: 'Problema → Solução',
  passo_a_passo: 'Passo a Passo',
  segredo: 'Segredo Revelado',
}

const FRAMEWORK_COLORS: Record<BrandsDecodedFramework, string> = {
  curiosidade: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
  autoridade: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  beneficio: 'bg-green-500/20 text-green-300 border-green-500/50',
  pergunta: 'bg-red-500/20 text-red-300 border-red-500/50',
  testemunho: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
  lista: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
  problema_solucao: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
  passo_a_passo: 'bg-pink-500/20 text-pink-300 border-pink-500/50',
  segredo: 'bg-violet-500/20 text-violet-300 border-violet-500/50',
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className="w-4 h-4" />
    case 'tiktok':
      return <TikTokIcon />
    case 'youtube':
      return <Youtube className="w-4 h-4" />
    case 'twitter':
      return <Twitter className="w-4 h-4" />
    default:
      return null
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 75) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500/20 border-emerald-500/50'
  if (score >= 75) return 'bg-green-500/20 border-green-500/50'
  if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50'
  if (score >= 40) return 'bg-orange-500/20 border-orange-500/50'
  return 'bg-red-500/20 border-red-500/50'
}

export function ContentCard({ content, onAddToQueue, isAdding }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const isVideo = content.content_type === 'reels' || content.content_type === 'video'

  return (
    <div
      className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-zinc-800">
        {content.thumbnail_url ? (
          <Image
            src={content.thumbnail_url}
            alt={content.ai_summary || 'Content thumbnail'}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <Sparkles className="w-12 h-12" />
          </div>
        )}

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        )}

        {/* Slide count */}
        {content.content_type === 'carrossel' && content.slide_count > 1 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded-full text-xs text-white font-medium">
            {content.slide_count} slides
          </div>
        )}

        {/* Platform badge */}
        <div className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-full text-white">
          <PlatformIcon platform={content.platform} />
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-3 left-3 right-3">
            {/* Metrics */}
            <div className="flex items-center gap-3 text-white text-sm mb-2">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {formatNumber(content.likes_count)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {formatNumber(content.comments_count)}
              </span>
              {content.views_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatNumber(content.views_count)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score badge */}
        <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-lg border text-sm font-bold ${getScoreBg(content.overall_score)}`}>
          <span className={getScoreColor(content.overall_score)}>
            {content.overall_score}
          </span>
        </div>
      </div>

      {/* Content info */}
      <div className="p-4 space-y-3">
        {/* Source */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {content.source?.avatar_url && (
              <Image
                src={content.source.avatar_url}
                alt={content.source.name || ''}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-zinc-400">
              @{content.source?.handle || 'unknown'}
            </span>
          </div>
          {content.external_url && (
            <a
              href={content.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* AI Summary */}
        {content.ai_summary && (
          <p className="text-sm text-zinc-300 line-clamp-2">
            {content.ai_summary}
          </p>
        )}

        {/* Topics */}
        {content.ai_topics && content.ai_topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {content.ai_topics.slice(0, 3).map(topic => (
              <span
                key={topic}
                className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full text-xs"
              >
                {topic}
              </span>
            ))}
            {content.ai_topics.length > 3 && (
              <span className="px-2 py-0.5 text-zinc-500 text-xs">
                +{content.ai_topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Suggested framework */}
        {content.ai_suggested_framework && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${FRAMEWORK_COLORS[content.ai_suggested_framework]}`}>
            <Zap className="w-3 h-3" />
            {FRAMEWORK_LABELS[content.ai_suggested_framework]}
          </div>
        )}

        {/* Scores breakdown (expandable) */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Ver detalhes
          <ChevronRight className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
        </button>

        {showDetails && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800">
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(content.virality_score)}`}>
                {content.virality_score}
              </div>
              <div className="text-xs text-zinc-500">Viralidade</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(content.relevance_score)}`}>
                {content.relevance_score}
              </div>
              <div className="text-xs text-zinc-500">Relevância</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(content.adaptability_score)}`}>
                {content.adaptability_score}
              </div>
              <div className="text-xs text-zinc-500">Adaptabilidade</div>
            </div>
          </div>
        )}

        {/* Add to queue button */}
        <button
          onClick={() => onAddToQueue(content)}
          disabled={isAdding || content.status === 'queued'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
            content.status === 'queued'
              ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
              : 'bg-violet-600 text-white hover:bg-violet-500'
          } disabled:opacity-50`}
        >
          {content.status === 'queued' ? (
            <>Na fila</>
          ) : isAdding ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adicionando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Adicionar à Criação
            </>
          )}
        </button>
      </div>
    </div>
  )
}
