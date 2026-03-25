'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { usePortalCliente } from '../../portal-context'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Instagram, Youtube, Facebook, Linkedin, Twitter, Hash, Zap, ExternalLink, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface SocialAccount {
  id: string
  cliente_id: string
  platform: string
  profile_id?: string
  profile_name?: string
  profile_avatar?: string
  status: string
  connected_at: string
}

interface ClienteInfo {
  id: string
  nome: string
  slug: string
  logo_url?: string
  cores?: { primaria?: string }
}

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', description: 'Fotos e stories' },
  { id: 'tiktok', name: 'TikTok', icon: Zap, color: '#000000', description: 'Vídeos curtos' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', description: 'Vídeos longos' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', description: 'Rede social' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', description: 'Rede profissional' },
  { id: 'x', name: 'X / Twitter', icon: Twitter, color: '#1DA1F2', description: 'Microblog' },
  { id: 'threads', name: 'Threads', icon: Hash, color: '#000000', description: 'Conversas' },
  { id: 'pinterest', name: 'Pinterest', icon: Hash, color: '#BD081C', description: 'Inspiração visual' },
]

export default function AgendamentoPage() {
  const searchParams = useSearchParams()
  const { org } = useAuth()
  const { clienteId, clienteSlug } = usePortalCliente()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<ClienteInfo | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ id: string; name: string } | null>(null)

  const fetchStatus = useCallback(async (slug: string, showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/social/status?clienteSlug=${slug}`)
      const data = await res.json()
      if (data.success && data.accounts) {
        setSocialAccounts(data.accounts)
      }
    } catch (err) {
      console.error('Error fetching social status:', err)
    }
    if (showRefresh) {
      setRefreshing(false)
      toast('Status atualizado!', 'success')
    }
  }, [toast])

  useEffect(() => {
    if (!clienteId || !clienteSlug) {
      if (!loading) return
      // Wait for context to load
      return
    }
    loadData()
  }, [clienteId, clienteSlug])

  // Handle redirect back from Upload-Post
  useEffect(() => {
    if (searchParams.get('connected') === 'true' && clienteSlug) {
      toast('Redes sociais atualizadas! Sincronizando...', 'success')
      fetchStatus(clienteSlug, true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, clienteSlug])

  async function loadData() {
    setLoading(true)
    try {
      const { data: clienteData } = await db.select('clientes', {
        filters: [{ op: 'eq', col: 'id', val: clienteId! }],
        limit: 1,
      })
      const c = (clienteData || [])[0] as ClienteInfo | undefined
      if (c) {
        setCliente(c)
        await fetchStatus(c.slug)
      }
    } catch (error) {
      toast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect(platforms?: string[]) {
    if (!cliente) return
    setConnecting(true)
    try {
      const res = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteSlug: cliente.slug, platforms }),
      })
      const data = await res.json()
      if (!res.ok || !data.access_url) {
        toast(data.error || 'Erro ao gerar link de conexão', 'error')
        return
      }
      window.open(data.access_url, '_blank')
      toast('Janela de conexão aberta. Complete o processo e volte aqui.', 'success')
    } catch {
      toast('Erro ao conectar. Tente novamente.', 'error')
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect(accountId: string, platformName: string) {
    setConfirmDisconnect({ id: accountId, name: platformName })
  }

  async function doDisconnect(accountId: string, name?: string) {
    setConfirmDisconnect(null)
    setDisconnectingId(accountId)
    try {
      const res = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error || 'Erro ao desconectar', 'error')
        return
      }
      setSocialAccounts(prev => prev.filter(a => a.id !== accountId))
      toast(`${name ?? 'Rede social'} desconectada`, 'success')
    } catch {
      toast('Erro ao desconectar', 'error')
    } finally {
      setDisconnectingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!clienteId || !cliente) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Agendamento</h1>
            <p className="text-sm text-zinc-500">Redes Sociais</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold text-zinc-900 mb-2">Conta não vinculada</h3>
            <p className="text-sm text-zinc-500">
              Sua conta não está vinculada a uma empresa. Contate o suporte.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Agendamento</h1>
            <p className="text-sm text-zinc-500">Gerencie suas redes sociais — {cliente.nome}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => fetchStatus(cliente.slug, true)} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Client section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-4">
            <Avatar name={cliente.nome} src={cliente.logo_url} color={cliente.cores?.primaria || '#6366F1'} size="md" />
            <div>
              <h2 className="font-bold text-lg text-zinc-900">{cliente.nome}</h2>
              <p className="text-sm text-zinc-500">
                {socialAccounts.length} conta{socialAccounts.length !== 1 ? 's' : ''} conectada{socialAccounts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={() => handleConnect()} disabled={connecting}>
            <ExternalLink className="w-4 h-4 mr-1" />
            {connecting ? 'Abrindo...' : 'Conectar Redes'}
          </Button>
        </div>

        {/* Platforms Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SOCIAL_PLATFORMS.map(platform => {
            const Icon = platform.icon
            const connectedAccount = socialAccounts.find(acc => acc.platform === platform.id)
            const isConnected = !!connectedAccount
            const isDisconnecting = disconnectingId === connectedAccount?.id

            return (
              <Card key={platform.id} className="hover:shadow-lg transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 rounded-xl shadow-sm group-hover:scale-105 transition-transform" style={{ backgroundColor: `${platform.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: platform.color }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 text-sm">{platform.name}</h3>
                      <p className="text-xs text-zinc-500">{platform.description}</p>
                    </div>
                    {isConnected ? (
                      <div className="w-full space-y-2">
                        <Badge variant="success" className="w-full justify-center text-xs">✓ Conectado</Badge>
                        {connectedAccount.profile_avatar && (
                          <Avatar src={connectedAccount.profile_avatar} name={connectedAccount.profile_name || platform.name} size="sm" />
                        )}
                        <div className="text-xs text-zinc-600 font-medium line-clamp-2">{connectedAccount.profile_name}</div>
                        <Button size="sm" variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs" onClick={() => handleDisconnect(connectedAccount.id, platform.name)} disabled={isDisconnecting}>
                          {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => handleConnect([platform.id])} disabled={connecting} style={{ borderColor: connecting ? '#ccc' : platform.color, color: connecting ? '#666' : platform.color }}>
                        {connecting ? 'Abrindo...' : 'Conectar'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {socialAccounts.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="font-medium text-zinc-900 mb-3 text-sm">Contas Conectadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {socialAccounts.map(account => {
                  const platform = SOCIAL_PLATFORMS.find(p => p.id === account.platform)
                  if (!platform) return null
                  const Icon = platform.icon
                  return (
                    <div key={account.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${platform.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: platform.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 text-sm">{platform.name}</div>
                        <div className="text-xs text-zinc-500 truncate">{account.profile_name}</div>
                      </div>
                      {account.profile_avatar && <Avatar src={account.profile_avatar} name={account.profile_name || ''} size="sm" />}
                      <Badge variant="success" className="text-xs">Ativo</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {socialAccounts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="font-semibold text-zinc-900 mb-2">Nenhuma conta conectada</h3>
              <p className="text-sm text-zinc-500">Conecte suas redes sociais para começar a agendar publicações.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDisconnect}
        title="Desconectar rede social"
        message={`Desconectar ${confirmDisconnect?.name}? Você poderá reconectar depois.`}
        confirmLabel="Desconectar"
        variant="danger"
        onConfirm={() => confirmDisconnect && doDisconnect(confirmDisconnect.id, confirmDisconnect.name)}
        onCancel={() => setConfirmDisconnect(null)}
      />
    </div>
  )
}
