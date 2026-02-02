'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { Calendar, Clock, Send, Image, Hash, CheckSquare, Square, Instagram, Youtube, Facebook, Linkedin, Twitter, Zap, Upload } from 'lucide-react'
import type { Cliente } from '@/types/database'

interface SocialAccount {
  id: string
  platform: string
  profile_id?: string
  profile_name?: string
  profile_avatar?: string
  status: string
}

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', maxChars: 2200 },
  { id: 'tiktok', name: 'TikTok', icon: Zap, color: '#000000', maxChars: 2200 },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', maxChars: 5000 },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', maxChars: 63206 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', maxChars: 3000 },
  { id: 'twitter', name: 'X / Twitter', icon: Twitter, color: '#1DA1F2', maxChars: 280 },
  { id: 'threads', name: 'Threads', icon: Hash, color: '#000000', maxChars: 500 },
  { id: 'pinterest', name: 'Pinterest', icon: Hash, color: '#BD081C', maxChars: 500 }
]

export default function AgendarPage() {
  const { org } = useAuth()
  const { toast } = useToast()
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (!org) return
    loadClientes()
  }, [org])

  useEffect(() => {
    if (selectedCliente) {
      loadSocialAccounts(selectedCliente.id)
    } else {
      setSocialAccounts([])
      setSelectedPlatforms([])
    }
  }, [selectedCliente])

  async function loadClientes() {
    setLoading(true)
    const { data } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    setClientes(data || [])
    setLoading(false)
  }

  async function loadSocialAccounts(clienteId: string) {
    const { data } = await db.select('social_accounts', {
      filters: [
        { op: 'eq', col: 'cliente_id', val: clienteId },
        { op: 'eq', col: 'status', val: 'active' },
      ],
    })
    setSocialAccounts(data || [])
  }

  async function handleSchedulePost() {
    if (!validateForm()) return

    setScheduling(true)
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      const hashtagsArray = hashtags.split(' ').filter(tag => tag.trim().startsWith('#')).map(tag => tag.trim())

      const response = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: selectedCliente!.id,
          platforms: selectedPlatforms,
          caption,
          hashtags: hashtagsArray,
          scheduled_at: scheduledAt,
          media_urls: [] // TODO: Implement media upload
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao agendar post')
      }

      toast('Post agendado com sucesso! 📅', 'success')
      resetForm()
    } catch (error: any) {
      toast(error.message || 'Erro ao agendar post', 'error')
    } finally {
      setScheduling(false)
    }
  }

  async function handlePublishNow() {
    if (!validateForm(false)) return

    setPublishing(true)
    try {
      const hashtagsArray = hashtags.split(' ').filter(tag => tag.trim().startsWith('#')).map(tag => tag.trim())

      const response = await fetch('/api/posts/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: selectedCliente!.id,
          platforms: selectedPlatforms,
          caption,
          hashtags: hashtagsArray,
          media_urls: [] // TODO: Implement media upload
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao publicar post')
      }

      toast('Post publicado com sucesso! 🚀', 'success')
      resetForm()
    } catch (error: any) {
      toast(error.message || 'Erro ao publicar post', 'error')
    } finally {
      setPublishing(false)
    }
  }

  function validateForm(requireDateTime = true) {
    if (!selectedCliente) {
      toast('Selecione um cliente', 'error')
      return false
    }
    if (selectedPlatforms.length === 0) {
      toast('Selecione pelo menos uma plataforma', 'error')
      return false
    }
    if (!caption.trim()) {
      toast('Digite a legenda do post', 'error')
      return false
    }
    if (requireDateTime) {
      if (!scheduledDate || !scheduledTime) {
        toast('Defina a data e hora do agendamento', 'error')
        return false
      }
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
      if (scheduledAt <= new Date()) {
        toast('Data e hora devem ser no futuro', 'error')
        return false
      }
    }
    return true
  }

  function resetForm() {
    setCaption('')
    setHashtags('')
    setScheduledDate('')
    setScheduledTime('')
    setMediaFiles([])
    setSelectedPlatforms([])
  }

  function togglePlatform(platformId: string) {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  function getCharacterCount() {
    const selectedPlatformConfigs = SOCIAL_PLATFORMS.filter(p => selectedPlatforms.includes(p.id))
    if (selectedPlatformConfigs.length === 0) return null
    
    const minMaxChars = Math.min(...selectedPlatformConfigs.map(p => p.maxChars))
    return { current: caption.length, max: minMaxChars }
  }

  const charCount = getCharacterCount()
  const isOverLimit = charCount && charCount.current > charCount.max

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Agendar Post</h1>
          <p className="text-sm text-zinc-500">Crie e agende publicações para suas redes sociais</p>
        </div>
      </div>

      {/* Main Interface */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Client & Platform Selection */}
        <div className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Avatar name="Cliente" size="sm" />
                Selecionar Cliente
              </h2>
              <div className="space-y-2">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => setSelectedCliente(cliente)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedCliente?.id === cliente.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={cliente.nome} 
                        src={cliente.logo_url} 
                        color={cliente.cores?.primaria || '#6366F1'}
                        size="sm"
                      />
                      <span className="font-medium">{cliente.nome}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          {selectedCliente && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Redes Sociais
                </h2>
                <div className="space-y-3">
                  {socialAccounts.map(account => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.id === account.platform)
                    if (!platform) return null

                    const Icon = platform.icon
                    const isSelected = selectedPlatforms.includes(account.platform)

                    return (
                      <button
                        key={account.id}
                        onClick={() => togglePlatform(account.platform)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${platform.color}15` }}>
                            <Icon className="w-4 h-4" style={{ color: platform.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{platform.name}</div>
                            <div className="text-xs text-zinc-500">{account.profile_name}</div>
                          </div>
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                  
                  {socialAccounts.length === 0 && (
                    <div className="text-center py-6 text-sm text-zinc-500">
                      <Hash className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                      Nenhuma conta conectada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center Column - Content Creation */}
        <div className="space-y-6">
          {/* Caption */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-zinc-900">Legenda</h2>
                {charCount && (
                  <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
                    {charCount.current}/{charCount.max}
                  </span>
                )}
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva a legenda do seu post..."
                className={`w-full h-32 p-3 border border-zinc-200 rounded-lg resize-none focus:border-blue-500 focus:outline-none ${
                  isOverLimit ? 'border-red-500' : ''
                }`}
              />
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-zinc-900 mb-4">Hashtags</h2>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#hashtag1 #hashtag2 #hashtag3"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Separe as hashtags com espaços
              </p>
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-zinc-900 mb-4">Mídia</h2>
              <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                <p className="text-sm text-zinc-500 mb-2">Arraste arquivos aqui ou clique para selecionar</p>
                <p className="text-xs text-zinc-400">JPG, PNG, MP4 até 100MB</p>
                <Button size="sm" variant="outline" className="mt-3">
                  Escolher Arquivos
                </Button>
              </div>
              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-zinc-50 rounded">
                      <Image className="w-4 h-4" />
                      <span className="text-sm flex-1">{file.name}</span>
                      <button className="text-red-500 text-xs">Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Scheduling */}
        <div className="space-y-6">
          {/* Platform Previews */}
          {selectedPlatforms.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-zinc-900 mb-4">Preview</h2>
                <div className="space-y-4">
                  {selectedPlatforms.map(platformId => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId)
                    const account = socialAccounts.find(acc => acc.platform === platformId)
                    if (!platform || !account) return null

                    const Icon = platform.icon

                    return (
                      <div key={platformId} className="p-3 border border-zinc-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" style={{ color: platform.color }} />
                          <span className="text-sm font-medium">{platform.name}</span>
                        </div>
                        <div className="text-sm text-zinc-700 whitespace-pre-wrap">
                          {caption || 'Sua legenda aparecerá aqui...'}
                        </div>
                        {hashtags && (
                          <div className="text-sm text-blue-600 mt-2">
                            {hashtags}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scheduling */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Agendamento
              </h2>
              <div className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSchedulePost}
              disabled={scheduling || !selectedCliente || selectedPlatforms.length === 0}
              className="w-full"
            >
              {scheduling ? 'Agendando...' : '📅 Agendar Post'}
            </Button>
            
            <Button
              onClick={handlePublishNow}
              disabled={publishing || !selectedCliente || selectedPlatforms.length === 0}
              variant="outline"
              className="w-full"
            >
              {publishing ? 'Publicando...' : '🚀 Publicar Agora'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}