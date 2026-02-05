'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Calendar, Clock, Send, Instagram, Youtube, Facebook, Zap, Hash, AlertCircle } from 'lucide-react'

interface SocialAccount {
  platform: string
  profile_name?: string
  profile_avatar?: string
}

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  conteudoId: string
  conteudoTitulo?: string
  conteudoLegenda?: string
  clienteSlug: string
  onScheduled?: () => void
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: Zap, color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'linkedin', name: 'LinkedIn', icon: Hash, color: '#0A66C2' },
  { id: 'x', name: 'X', icon: Hash, color: '#1DA1F2' },
  { id: 'threads', name: 'Threads', icon: Hash, color: '#000000' },
]

export function ScheduleModal({
  open,
  onClose,
  conteudoId,
  conteudoTitulo,
  conteudoLegenda,
  clienteSlug,
  onScheduled,
}: ScheduleModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('12:00')
  const [title, setTitle] = useState('')
  const [firstComment, setFirstComment] = useState('')

  useEffect(() => {
    if (open && clienteSlug) {
      loadConnectedAccounts()
      // Set default date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setTitle(conteudoLegenda || conteudoTitulo || '')
    }
  }, [open, clienteSlug])

  async function loadConnectedAccounts() {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/social/status?clienteSlug=${clienteSlug}`)
      const data = await res.json()
      if (data.success && data.accounts) {
        setConnectedAccounts(data.accounts)
        // Auto-select all connected platforms
        const connected = data.accounts.map((a: SocialAccount) => a.platform)
        setSelectedPlatforms(connected)
      }
    } catch (err) {
      console.error('Error loading accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }

  function togglePlatform(platformId: string) {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  async function handleSchedule() {
    if (!scheduledDate || !scheduledTime) {
      toast('Selecione data e hora', 'error')
      return
    }
    if (selectedPlatforms.length === 0) {
      toast('Selecione ao menos uma rede', 'error')
      return
    }

    // Validate selected platforms are connected
    const connectedIds = connectedAccounts.map(a => a.platform)
    const notConnected = selectedPlatforms.filter(p => !connectedIds.includes(p))
    if (notConnected.length > 0) {
      toast(`Redes não conectadas: ${notConnected.join(', ')}`, 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudoId,
          platforms: selectedPlatforms,
          scheduledDate,
          scheduledTime,
          title,
          firstComment,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Erro ao agendar', 'error')
        return
      }

      toast('✅ Post agendado com sucesso!', 'success')
      onScheduled?.()
      onClose()
    } catch (err) {
      toast('Erro ao agendar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const connectedPlatformIds = connectedAccounts.map(a => a.platform)

  return (
    <Modal open={open} onClose={onClose} title="📅 Agendar Publicação" size="lg">
      <div className="space-y-6">
        {/* Connected platforms */}
        <div>
          <Label className="mb-3 block">Selecionar Redes</Label>
          {loadingAccounts ? (
            <div className="text-sm text-zinc-500">Carregando contas...</div>
          ) : connectedAccounts.length === 0 ? (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Nenhuma conta conectada</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Vá em "Redes Sociais" para conectar as contas antes de agendar.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {PLATFORMS.map(platform => {
                const Icon = platform.icon
                const isConnected = connectedPlatformIds.includes(platform.id)
                const isSelected = selectedPlatforms.includes(platform.id)
                const account = connectedAccounts.find(a => a.platform === platform.id)

                return (
                  <button
                    key={platform.id}
                    onClick={() => isConnected && togglePlatform(platform.id)}
                    disabled={!isConnected}
                    className={`
                      p-3 rounded-xl border-2 transition-all text-left
                      ${!isConnected 
                        ? 'opacity-40 cursor-not-allowed border-zinc-200 bg-zinc-50' 
                        : isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" style={{ color: isConnected ? platform.color : '#999' }} />
                      <span className={`text-sm font-medium ${isConnected ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {platform.name}
                      </span>
                    </div>
                    {isConnected && account?.profile_name && (
                      <span className="text-[10px] text-zinc-500 truncate block">
                        @{account.profile_name}
                      </span>
                    )}
                    {!isConnected && (
                      <span className="text-[10px] text-zinc-400">Não conectado</span>
                    )}
                    {isConnected && isSelected && (
                      <Badge className="mt-1 text-[9px] bg-blue-500 text-white">Selecionado</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Data
            </Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label className="mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" /> Hora
            </Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        {/* Best times suggestion */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500">Horários sugeridos:</span>
          {['09:00', '12:00', '18:00', '20:00'].map(time => (
            <button
              key={time}
              onClick={() => setScheduledTime(time)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                scheduledTime === time 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {time}
            </button>
          ))}
        </div>

        {/* Caption override */}
        <div>
          <Label className="mb-2 block">Legenda</Label>
          <Textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            rows={4}
            placeholder="Legenda que será publicada..."
          />
        </div>

        {/* First comment */}
        <div>
          <Label className="mb-2 block">Primeiro Comentário (opcional)</Label>
          <Input
            value={firstComment}
            onChange={e => setFirstComment(e.target.value)}
            placeholder="Hashtags ou complemento..."
          />
          <p className="text-xs text-zinc-400 mt-1">
            Aparece como comentário logo após a publicação (ideal para hashtags)
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSchedule}
            disabled={loading || selectedPlatforms.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              'Agendando...'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Agendar para {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'rede' : 'redes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
