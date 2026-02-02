'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input, Label, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { Cliente } from '@/types/database'

// ─── Platform Config ────────────────────────────────────────────────
interface PlatformConfig {
  id: string
  name: string
  color: string
  bgColor: string
  maxChars: number
  icon: string
  formats: FormatConfig[]
}

interface FormatConfig {
  id: string
  name: string
  aspectRatio: string
  width: number
  height: number
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram', name: 'Instagram', color: '#E4405F', bgColor: '#E4405F15',
    maxChars: 2200, icon: '📸',
    formats: [
      { id: 'feed-1:1', name: 'Feed 1:1', aspectRatio: '1:1', width: 1, height: 1 },
      { id: 'feed-4:5', name: 'Feed 4:5', aspectRatio: '4:5', width: 4, height: 5 },
      { id: 'feed-1.91:1', name: 'Feed 1.91:1', aspectRatio: '1.91:1', width: 1.91, height: 1 },
      { id: 'stories', name: 'Stories', aspectRatio: '9:16', width: 9, height: 16 },
      { id: 'reels', name: 'Reels', aspectRatio: '9:16', width: 9, height: 16 },
      { id: 'carrossel', name: 'Carrossel', aspectRatio: '1:1', width: 1, height: 1 },
    ]
  },
  {
    id: 'tiktok', name: 'TikTok', color: '#010101', bgColor: '#01010115',
    maxChars: 2200, icon: '🎵',
    formats: [
      { id: 'video', name: 'Vídeo', aspectRatio: '9:16', width: 9, height: 16 },
    ]
  },
  {
    id: 'youtube', name: 'YouTube', color: '#FF0000', bgColor: '#FF000015',
    maxChars: 5000, icon: '▶️',
    formats: [
      { id: 'video', name: 'Vídeo', aspectRatio: '16:9', width: 16, height: 9 },
      { id: 'shorts', name: 'Shorts', aspectRatio: '9:16', width: 9, height: 16 },
    ]
  },
  {
    id: 'facebook', name: 'Facebook', color: '#1877F2', bgColor: '#1877F215',
    maxChars: 63206, icon: '👤',
    formats: [
      { id: 'post', name: 'Post', aspectRatio: 'livre', width: 1, height: 1 },
      { id: 'stories', name: 'Stories', aspectRatio: '9:16', width: 9, height: 16 },
      { id: 'reels', name: 'Reels', aspectRatio: '9:16', width: 9, height: 16 },
    ]
  },
  {
    id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', bgColor: '#0A66C215',
    maxChars: 3000, icon: '💼',
    formats: [
      { id: 'post', name: 'Post', aspectRatio: 'livre', width: 1, height: 1 },
      { id: 'artigo', name: 'Artigo', aspectRatio: 'livre', width: 16, height: 9 },
    ]
  },
  {
    id: 'twitter', name: 'X / Twitter', color: '#000000', bgColor: '#00000010',
    maxChars: 280, icon: '𝕏',
    formats: [
      { id: 'post', name: 'Post', aspectRatio: 'livre', width: 16, height: 9 },
    ]
  },
  {
    id: 'threads', name: 'Threads', color: '#000000', bgColor: '#00000010',
    maxChars: 500, icon: '🧵',
    formats: [
      { id: 'post', name: 'Post', aspectRatio: 'livre', width: 1, height: 1 },
    ]
  },
  {
    id: 'pinterest', name: 'Pinterest', color: '#BD081C', bgColor: '#BD081C15',
    maxChars: 500, icon: '📌',
    formats: [
      { id: 'pin', name: 'Pin', aspectRatio: '2:3', width: 2, height: 3 },
    ]
  },
]

// ─── Types ──────────────────────────────────────────────────────────
interface SocialAccount {
  id: string
  platform: string
  profile_id?: string
  profile_name?: string
  profile_avatar?: string
  status: string
}

interface UploadedMedia {
  url: string
  filename: string
  size: number
  type: string
  isVideo: boolean
  preview?: string
}

interface PlatformFormat {
  platform: string
  format: string
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AgendarPage() {
  const { org } = useAuth()
  const { toast } = useToast()
  
  // State
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())
  const [platformFormats, setPlatformFormats] = useState<Map<string, string>>(new Map())
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [customCaptions, setCustomCaptions] = useState(false)
  const [captionByPlatform, setCaptionByPlatform] = useState<Record<string, string>>({})
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  // ─── Load Clientes ──────────────────────────────────────────────
  useEffect(() => {
    if (!org) return
    ;(async () => {
      setLoading(true)
      const { data } = await db.select('clientes', {
        filters: [{ op: 'eq', col: 'org_id', val: org.id }],
        order: [{ col: 'nome', asc: true }],
      })
      setClientes(data || [])
      setLoading(false)
    })()
  }, [org])

  // ─── Load Social Accounts via API ─────────────────────────────
  useEffect(() => {
    if (!selectedCliente) {
      setSocialAccounts([])
      setSelectedProfiles(new Set())
      setPlatformFormats(new Map())
      return
    }
    ;(async () => {
      setLoadingAccounts(true)
      try {
        const res = await fetch(`/api/social/status?clienteSlug=${selectedCliente.slug}`)
        const json = await res.json()
        if (json.success && json.accounts) {
          setSocialAccounts(json.accounts)
        } else {
          setSocialAccounts([])
        }
      } catch {
        setSocialAccounts([])
      }
      setLoadingAccounts(false)
    })()
  }, [selectedCliente])

  // ─── Profile Selection ────────────────────────────────────────
  const toggleProfile = useCallback((accountId: string, platform: string) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
        setPlatformFormats(pf => {
          const n = new Map(pf)
          n.delete(platform)
          return n
        })
      } else {
        next.add(accountId)
        // Auto-select first format
        const platformConfig = PLATFORMS.find(p => p.id === platform)
        if (platformConfig && platformConfig.formats.length > 0) {
          setPlatformFormats(pf => {
            const n = new Map(pf)
            n.set(platform, platformConfig.formats[0].id)
            return n
          })
        }
      }
      return next
    })
  }, [])

  // ─── Selected platforms helper ────────────────────────────────
  const selectedPlatforms = socialAccounts.filter(acc => selectedProfiles.has(acc.id))
  const selectedPlatformIds = [...new Set(selectedPlatforms.map(acc => acc.platform))]
  const activePlatformConfigs = PLATFORMS.filter(p => selectedPlatformIds.includes(p.id))

  // ─── Character counting ───────────────────────────────────────
  const minMaxChars = activePlatformConfigs.length > 0
    ? Math.min(...activePlatformConfigs.map(p => p.maxChars))
    : null

  // ─── Media Upload ─────────────────────────────────────────────
  async function uploadFile(file: File) {
    if (!selectedCliente || !org) return

    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast(`${file.name} excede o limite de ${isVideo ? '500MB' : '10MB'}`, 'error')
      return
    }

    setUploading(true)
    try {
      let result: any

      // Files > 4MB: use presigned URL (direct upload to storage, bypasses Vercel body limit)
      if (file.size > 4 * 1024 * 1024) {
        // Step 1: Get presigned URL
        const presignRes = await fetch('/api/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            clienteId: selectedCliente.id,
          }),
        })
        const presign = await presignRes.json()
        if (!presignRes.ok) throw new Error(presign.error || 'Erro ao gerar URL de upload')

        // Step 2: Upload directly to Supabase Storage
        const uploadRes = await fetch(presign.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!uploadRes.ok) throw new Error('Erro no upload direto')

        result = {
          url: presign.publicUrl,
          filename: file.name,
          size: file.size,
          type: file.type,
          path: presign.path,
          isVideo,
        }
      } else {
        // Small files: use regular API route
        const formData = new FormData()
        formData.append('file', file)
        formData.append('clienteId', selectedCliente.id)

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        })
        result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Erro no upload')
      }

      // Create preview for images
      let preview: string | undefined
      if (!isVideo) {
        preview = URL.createObjectURL(file)
      }

      setUploadedMedia(prev => [...prev, { ...result, preview }])
      toast(`${file.name} enviado com sucesso!`, 'success')
    } catch (error: any) {
      toast(error.message || 'Erro ao enviar arquivo', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      await uploadFile(file)
    }
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    for (const file of Array.from(files)) {
      uploadFile(file)
    }
  }

  function removeMedia(index: number) {
    setUploadedMedia(prev => {
      const next = [...prev]
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!)
      next.splice(index, 1)
      return next
    })
  }

  // ─── Get current aspect ratio ─────────────────────────────────
  function getCurrentAspectRatio(): FormatConfig | null {
    for (const [platform, formatId] of platformFormats.entries()) {
      const pConfig = PLATFORMS.find(p => p.id === platform)
      const fConfig = pConfig?.formats.find(f => f.id === formatId)
      if (fConfig) return fConfig
    }
    return null
  }

  // ─── Submit Handlers ──────────────────────────────────────────
  function getPlatformFormatsArray(): PlatformFormat[] {
    return selectedPlatformIds.map(pid => ({
      platform: pid,
      format: platformFormats.get(pid) || 'post',
    }))
  }

  function validate(requireDateTime = true): boolean {
    if (!selectedCliente) { toast('Selecione um cliente', 'error'); return false }
    if (selectedProfiles.size === 0) { toast('Selecione pelo menos um perfil', 'error'); return false }
    if (!caption.trim() && !customCaptions) { toast('Digite a legenda do post', 'error'); return false }
    if (requireDateTime) {
      if (!scheduledDate || !scheduledTime) { toast('Defina data e hora', 'error'); return false }
      if (new Date(`${scheduledDate}T${scheduledTime}`) <= new Date()) { toast('Data deve ser no futuro', 'error'); return false }
    }
    return true
  }

  async function handleSchedulePost() {
    if (!validate()) return
    setScheduling(true)
    try {
      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: selectedCliente!.id,
          platforms: getPlatformFormatsArray(),
          caption: caption,
          hashtags: hashtags.split(/\s+/).filter(t => t.startsWith('#')),
          media_urls: uploadedMedia.map(m => m.url),
          scheduled_at: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('Post agendado com sucesso! 📅', 'success')
      resetForm()
    } catch (error: any) {
      toast(error.message || 'Erro ao agendar', 'error')
    } finally {
      setScheduling(false)
    }
  }

  async function handlePublishNow() {
    if (!validate(false)) return
    setPublishing(true)
    try {
      const res = await fetch('/api/posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: selectedCliente!.id,
          platforms: getPlatformFormatsArray(),
          caption: caption,
          hashtags: hashtags.split(/\s+/).filter(t => t.startsWith('#')),
          media_urls: uploadedMedia.map(m => m.url),
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast('Post publicado com sucesso! 🚀', 'success')
      resetForm()
    } catch (error: any) {
      toast(error.message || 'Erro ao publicar', 'error')
    } finally {
      setPublishing(false)
    }
  }

  function resetForm() {
    setCaption('')
    setHashtags('')
    setUploadedMedia([])
    setScheduledDate('')
    setScheduledTime('')
    setSelectedProfiles(new Set())
    setPlatformFormats(new Map())
    setCustomCaptions(false)
    setCaptionByPlatform({})
  }

  // ─── Aspect Ratio Preview ─────────────────────────────────────
  const currentFormat = getCurrentAspectRatio()

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agendar Post</h1>
          <p className="text-sm text-zinc-500">Crie e agende publicações para suas redes sociais</p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-[320px_1fr_340px] gap-6">

        {/* ════════ COLUNA 1: Perfis + Formato ════════ */}
        <div className="space-y-5">

          {/* Cliente Selection */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                👤 Cliente
              </h2>
              <select
                value={selectedCliente?.id || ''}
                onChange={e => {
                  const c = clientes.find(c => c.id === e.target.value) || null
                  setSelectedCliente(c)
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Perfis Conectados */}
          {selectedCliente && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                  🌐 Perfis Conectados
                </h2>

                {loadingAccounts ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : socialAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🔗</div>
                    <p className="text-sm text-zinc-500 mb-3">Nenhuma conta conectada</p>
                    <a
                      href={`/clientes/${selectedCliente.slug}/redes`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Conectar redes →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {socialAccounts.map(account => {
                      const platform = PLATFORMS.find(p => p.id === account.platform)
                      if (!platform) return null
                      const isSelected = selectedProfiles.has(account.id)

                      return (
                        <button
                          key={account.id}
                          onClick={() => toggleProfile(account.id, account.platform)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/10'
                              : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Platform Icon */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                              style={{ backgroundColor: platform.bgColor }}
                            >
                              {account.profile_avatar ? (
                                <img
                                  src={account.profile_avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                              ) : (
                                <span>{platform.icon}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-zinc-900 truncate">
                                {account.profile_name || platform.name}
                              </div>
                              <div className="text-xs text-zinc-400">{platform.name}</div>
                            </div>
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-zinc-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Formato por Plataforma */}
          {activePlatformConfigs.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                  📐 Formato
                </h2>
                <div className="space-y-4">
                  {activePlatformConfigs.map(platform => {
                    const selectedFormat = platformFormats.get(platform.id)
                    return (
                      <div key={platform.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{platform.icon}</span>
                          <span className="text-xs font-semibold text-zinc-700">{platform.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {platform.formats.map(format => {
                            const isActive = selectedFormat === format.id
                            return (
                              <button
                                key={format.id}
                                onClick={() => setPlatformFormats(prev => {
                                  const n = new Map(prev)
                                  n.set(platform.id, format.id)
                                  return n
                                })}
                                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                                  isActive
                                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                    : 'bg-zinc-50 text-zinc-600 border-zinc-100 hover:bg-zinc-100'
                                }`}
                              >
                                <div>{format.name}</div>
                                <div className={`text-[10px] mt-0.5 ${isActive ? 'text-blue-100' : 'text-zinc-400'}`}>
                                  {format.aspectRatio}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ════════ COLUNA 2: Legenda + Hashtags + Mídia ════════ */}
        <div className="space-y-5">

          {/* Legenda */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-zinc-900 text-sm uppercase tracking-wide">
                  ✏️ Legenda
                </h2>
                {minMaxChars && (
                  <span className={`text-xs font-mono ${
                    caption.length > minMaxChars ? 'text-red-500 font-bold' : 'text-zinc-400'
                  }`}>
                    {caption.length}/{minMaxChars}
                  </span>
                )}
              </div>

              {/* Personalizar toggle */}
              {activePlatformConfigs.length > 1 && (
                <label className="flex items-center gap-2 mb-3 cursor-pointer group">
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      customCaptions ? 'bg-blue-500' : 'bg-zinc-200'
                    }`}
                    onClick={() => setCustomCaptions(!customCaptions)}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      customCaptions ? 'translate-x-4' : ''
                    }`} />
                  </div>
                  <span className="text-xs text-zinc-500 group-hover:text-zinc-700">
                    Personalizar por rede
                  </span>
                </label>
              )}

              {customCaptions ? (
                <div className="space-y-3">
                  {activePlatformConfigs.map(platform => (
                    <div key={platform.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{platform.icon}</span>
                          <span className="text-xs font-medium text-zinc-700">{platform.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${
                          (captionByPlatform[platform.id] || '').length > platform.maxChars ? 'text-red-500' : 'text-zinc-400'
                        }`}>
                          {(captionByPlatform[platform.id] || '').length}/{platform.maxChars}
                        </span>
                      </div>
                      <Textarea
                        value={captionByPlatform[platform.id] || ''}
                        onChange={e => setCaptionByPlatform(prev => ({ ...prev, [platform.id]: e.target.value }))}
                        placeholder={`Legenda para ${platform.name}...`}
                        className="min-h-[80px]"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Escreva a legenda do seu post..."
                  className="min-h-[140px]"
                />
              )}

              {/* Char limits info */}
              {activePlatformConfigs.length > 0 && !customCaptions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activePlatformConfigs.map(p => (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                        caption.length > p.maxChars
                          ? 'bg-red-50 text-red-600'
                          : 'bg-zinc-50 text-zinc-400'
                      }`}
                    >
                      {p.icon} {p.maxChars}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                # Hashtags
              </h2>
              <Input
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                placeholder="#marketing #socialmedia #conteudo"
              />
              <p className="text-[11px] text-zinc-400 mt-1.5">Separe as hashtags com espaços</p>
            </CardContent>
          </Card>

          {/* Upload de Mídia */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                📎 Mídia
              </h2>

              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className={`text-4xl mb-2 transition-transform ${dragOver ? 'scale-110' : ''}`}>
                  {uploading ? '⏳' : '📂'}
                </div>
                <p className="text-sm text-zinc-600 font-medium">
                  {uploading ? 'Enviando...' : 'Arraste arquivos ou clique para selecionar'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Imagens até 10MB • Vídeos até 500MB • JPG, PNG, WebP, GIF, MP4
                </p>
              </div>

              {/* Uploaded Files */}
              {uploadedMedia.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedMedia.map((media, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-200 flex-shrink-0">
                        {media.isVideo ? (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white text-lg">
                            🎬
                          </div>
                        ) : media.preview ? (
                          <img src={media.preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🖼️</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-700 truncate">{media.filename}</p>
                        <p className="text-xs text-zinc-400">
                          {formatFileSize(media.size)} • {media.isVideo ? 'Vídeo' : 'Imagem'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeMedia(index)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ════════ COLUNA 3: Preview + Agendamento ════════ */}
        <div className="space-y-5">

          {/* Preview — Instagram-style realistic */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {selectedPlatforms.length === 0 ? (
                <div className="text-center py-14 px-5">
                  <div className="text-4xl mb-3 opacity-20">📱</div>
                  <p className="text-xs text-zinc-400">Selecione perfis para ver o preview</p>
                </div>
              ) : (
                <div>
                  {selectedPlatforms.map(account => {
                    const platform = PLATFORMS.find(p => p.id === account.platform)
                    if (!platform) return null
                    const formatId = platformFormats.get(platform.id)
                    const format = platform.formats.find(f => f.id === formatId)
                    const idx = Math.min(previewIndex, Math.max(uploadedMedia.length - 1, 0))
                    const currentMedia = uploadedMedia[idx]
                    const captionText = (customCaptions ? captionByPlatform[platform.id] : caption) || ''

                    return (
                      <div key={account.id} className="bg-white">
                        {/* ── Instagram-style header ── */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-zinc-100">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white p-[1px]">
                              {account.profile_avatar ? (
                                <img src={account.profile_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                  {(account.profile_name || platform.name).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-zinc-900 truncate">
                              {account.profile_name || platform.name}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              {format ? `${format.name} • ${format.aspectRatio}` : platform.name}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="18" r="1.5" />
                          </svg>
                        </div>

                        {/* ── Media area — adapts to format aspect ratio ── */}
                        {uploadedMedia.length > 0 && format ? (
                          <div
                            className="relative bg-black overflow-hidden group"
                            style={{ aspectRatio: `${format.width}/${format.height}` }}
                          >
                            {currentMedia?.isVideo ? (
                              <video
                                src={currentMedia.url}
                                className="w-full h-full object-contain bg-black"
                                muted
                                playsInline
                              />
                            ) : currentMedia ? (
                              <img
                                src={currentMedia.preview || currentMedia.url}
                                alt=""
                                className="w-full h-full object-contain bg-black"
                              />
                            ) : null}

                            {/* Carousel arrows */}
                            {uploadedMedia.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => i <= 0 ? uploadedMedia.length - 1 : i - 1) }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-zinc-700 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPreviewIndex(i => i >= uploadedMedia.length - 1 ? 0 : i + 1) }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-zinc-700 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                                {/* Dots */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                  {uploadedMedia.map((_, i) => (
                                    <button
                                      key={i}
                                      onClick={(e) => { e.stopPropagation(); setPreviewIndex(i) }}
                                      className={`rounded-full transition-all ${
                                        i === idx ? 'w-2 h-2 bg-blue-500' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                                      }`}
                                    />
                                  ))}
                                </div>
                                {/* Counter */}
                                <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                                  {idx + 1}/{uploadedMedia.length}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div
                            className="bg-zinc-100 flex items-center justify-center"
                            style={{ aspectRatio: format ? `${format.width}/${format.height}` : '1/1' }}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2 opacity-20">🖼️</div>
                              <p className="text-[10px] text-zinc-300">Adicione mídia</p>
                            </div>
                          </div>
                        )}

                        {/* ── Instagram action bar ── */}
                        <div className="flex items-center justify-between px-3.5 py-2.5">
                          <div className="flex items-center gap-4">
                            <svg className="w-6 h-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <svg className="w-6 h-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <svg className="w-6 h-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </div>
                          <svg className="w-6 h-6 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </div>

                        {/* ── Caption ── */}
                        <div className="px-3.5 pb-3">
                          {captionText ? (
                            <p className="text-[13px] text-zinc-900 leading-[1.4]">
                              <span className="font-semibold mr-1">{account.profile_name || platform.name}</span>
                              <span className="whitespace-pre-wrap">{captionText}</span>
                            </p>
                          ) : (
                            <p className="text-[13px] text-zinc-300 italic">Sua legenda aparecerá aqui...</p>
                          )}
                          {hashtags && (
                            <p className="text-[13px] text-blue-500 mt-0.5">{hashtags}</p>
                          )}
                          {scheduledDate && scheduledTime && (
                            <p className="text-[10px] text-zinc-300 mt-2 uppercase">
                              Agendado para {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('pt-BR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agendamento */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-zinc-900 mb-3 text-sm uppercase tracking-wide">
                ⏰ Agendamento
              </h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button
              onClick={handleSchedulePost}
              disabled={scheduling || selectedProfiles.size === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 py-3"
              size="lg"
            >
              {scheduling ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Agendando...
                </span>
              ) : '📅 Agendar Post'}
            </Button>
            
            <Button
              onClick={handlePublishNow}
              disabled={publishing || selectedProfiles.size === 0}
              variant="outline"
              className="w-full py-3"
              size="lg"
            >
              {publishing ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Publicando...
                </span>
              ) : '🚀 Publicar Agora'}
            </Button>
          </div>

          {/* Resumo */}
          {selectedProfiles.size > 0 && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">Resumo</h3>
              <div className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between">
                  <span>Perfis</span>
                  <span className="font-medium">{selectedProfiles.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mídias</span>
                  <span className="font-medium">{uploadedMedia.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caracteres</span>
                  <span className={`font-medium ${minMaxChars && caption.length > minMaxChars ? 'text-red-500' : ''}`}>
                    {caption.length}
                  </span>
                </div>
                {scheduledDate && scheduledTime && (
                  <div className="flex justify-between">
                    <span>Agendado para</span>
                    <span className="font-medium">
                      {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
