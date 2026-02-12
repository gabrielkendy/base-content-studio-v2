'use client'

import { useState } from 'react'
import { Search, Filter, X, Instagram, Youtube, Twitter, Globe, Hash, Eye, Clock, Languages, ArrowUpDown } from 'lucide-react'
import { Platform, ContentType, DiscoveryFilters } from '@/types/database'

// TikTok icon (não tem no Lucide)
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

interface SearchFiltersProps {
  filters: DiscoveryFilters
  onFiltersChange: (filters: DiscoveryFilters) => void
  onSearch: () => void
  isLoading?: boolean
}

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" /> },
  { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon /> },
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" /> },
  { id: 'twitter', label: 'X/Twitter', icon: <Twitter className="w-4 h-4" /> },
]

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'reels', label: 'Reels' },
  { id: 'post', label: 'Post' },
  { id: 'video', label: 'Vídeo' },
]

const NICHES = [
  'fitness', 'saude', 'longevidade', 'nutricao', 'treino', 
  'biohacking', 'medicina', 'ciencia', 'lifestyle', 'performance'
]

const PERIODS = [
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
]

const MIN_VIEWS = [
  { id: 0, label: 'Qualquer' },
  { id: 10000, label: '10k+' },
  { id: 50000, label: '50k+' },
  { id: 100000, label: '100k+' },
  { id: 500000, label: '500k+' },
  { id: 1000000, label: '1M+' },
]

const SORT_OPTIONS = [
  { id: 'viral', label: 'Mais viral' },
  { id: 'recent', label: 'Mais recente' },
  { id: 'relevance', label: 'Mais relevante' },
]

export function SearchFilters({ filters, onFiltersChange, onSearch, isLoading }: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hashtagInput, setHashtagInput] = useState('')

  const togglePlatform = (platform: Platform) => {
    const current = filters.platform || []
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform]
    onFiltersChange({ ...filters, platform: updated })
  }

  const toggleContentType = (type: ContentType) => {
    const current = filters.content_type || []
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    onFiltersChange({ ...filters, content_type: updated })
  }

  const toggleNiche = (niche: string) => {
    const current = filters.niche || []
    const updated = current.includes(niche)
      ? current.filter(n => n !== niche)
      : [...current, niche]
    onFiltersChange({ ...filters, niche: updated })
  }

  const addHashtag = () => {
    if (!hashtagInput.trim()) return
    const tag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`
    const current = filters.hashtags || []
    if (!current.includes(tag)) {
      onFiltersChange({ ...filters, hashtags: [...current, tag] })
    }
    setHashtagInput('')
  }

  const removeHashtag = (tag: string) => {
    const updated = (filters.hashtags || []).filter(t => t !== tag)
    onFiltersChange({ ...filters, hashtags: updated })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = [
    filters.platform?.length ?? 0,
    filters.content_type?.length ?? 0,
    filters.niche?.length ?? 0,
    filters.hashtags?.length ?? 0,
    filters.min_views ? 1 : 0,
    filters.period ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Search className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Content Discovery</h2>
            <p className="text-sm text-zinc-400">Encontre conteúdos virais para adaptar</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filtros avançados
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-violet-500 text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Plataformas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Plataforma</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(platform => (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                filters.platform?.includes(platform.id)
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {platform.icon}
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de conteúdo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Tipo de conteúdo</label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => toggleContentType(type.id)}
              className={`px-3 py-2 rounded-lg border transition-all ${
                filters.content_type?.includes(type.id)
                  ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nichos */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Nicho</label>
        <div className="flex flex-wrap gap-2">
          {NICHES.map(niche => (
            <button
              key={niche}
              onClick={() => toggleNiche(niche)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                filters.niche?.includes(niche)
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {niche}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros avançados */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          {/* Hashtags */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Hash className="w-4 h-4" />
              Hashtags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                placeholder="#fitness #longevidade"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={addHashtag}
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Adicionar
              </button>
            </div>
            {filters.hashtags && filters.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.hashtags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => removeHashtag(tag)} className="hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Views mínimas */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Eye className="w-4 h-4" />
              Views mínimas
            </label>
            <div className="flex flex-wrap gap-2">
              {MIN_VIEWS.map(option => (
                <button
                  key={option.id}
                  onClick={() => onFiltersChange({ ...filters, min_views: option.id || undefined })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    (filters.min_views || 0) === option.id
                      ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Período */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Clock className="w-4 h-4" />
              Período
            </label>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map(period => (
                <button
                  key={period.id}
                  onClick={() => onFiltersChange({ ...filters, period: period.id as DiscoveryFilters['period'] })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    filters.period === period.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ordenação */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <ArrowUpDown className="w-4 h-4" />
              Ordenar por
            </label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => onFiltersChange({ ...filters, sort_by: option.id as DiscoveryFilters['sort_by'] })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    filters.sort_by === option.id
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          onClick={clearFilters}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Limpar filtros
        </button>
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Buscar Conteúdos
            </>
          )}
        </button>
      </div>
    </div>
  )
}
