'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Instagram, Youtube, Facebook, Linkedin, Twitter, Hash, Zap, ExternalLink, RefreshCw } from 'lucide-react'
import type { Cliente } from '@/types/database'

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

export default function RedesSociaisPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  const fetchStatus = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/v2/social?action=conexoes&cliente=${slug}`)
      const data = await res.json()
      if (data.success && data.contas) {
        // Converte formato da API v2 para o formato esperado
        const accounts: SocialAccount[] = data.contas
          .filter((c: any) => c.conectada)
          .map((c: any) => ({
            id: c.plataforma,
            cliente_id: '',
            platform: c.plataforma,
            profile_name: c.nome || c.handle,
            profile_avatar: c.avatar,
            status: 'active',
            connected_at: '',
          }))
        setSocialAccounts(accounts)
      }
    } catch (err) {
      console.error('Error fetching status:', err)
    } finally {
      if (showRefresh) setRefreshing(false)
    }
  }, [slug])

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, slug])

  // Handle redirect back from Upload-Post (detecta tanto 'connected' quanto 'success')
  useEffect(() => {
    if (searchParams.get('connected') === 'true' || searchParams.get('success') === 'true') {
      toast('Redes sociais conectadas! Sincronizando...', 'success')
      fetchStatus(true)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  // Escuta mensagem do popup quando conexão é feita
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'social-connected' && event.data?.connected) {
        toast('Rede social conectada! Sincronizando...', 'success')
        setConnecting(false)
        fetchStatus(true)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchStatus, toast])

  async function loadData() {
    setLoading(true)
    
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })

    if (!c) {
      setLoading(false)
      return
    }
    
    setCliente(c)
    
    // Fetch real status from Upload-Post via API v2
    await fetchStatus()
    
    setLoading(false)
  }

  async function handleConnect(platforms?: string[]) {
    if (!cliente) return
    setConnecting(true)
    
    try {
      const res = await fetch('/api/v2/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          clienteSlug: slug,
          clienteNome: cliente.nome,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.url) {
        toast(data.error || 'Erro ao gerar link de conexão', 'error')
        setConnecting(false)
        return
      }

      // Redirect direto (simples!)
      window.location.href = data.url

    } catch (error) {
      toast('Erro ao conectar. Tente novamente.', 'error')
      setConnecting(false)
    }
  }

  async function handleDisconnect(accountId: string, platformName: string) {
    if (!confirm(`Desconectar ${platformName}? Você poderá reconectar depois.`)) return
    
    setDisconnectingId(accountId)
    
    try {
      const res = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, clienteSlug: slug }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        toast(data.error || 'Erro ao desconectar', 'error')
        return
      }

      setSocialAccounts(prev => prev.filter(a => a.id !== accountId))
      toast(`${platformName} desconectado`, 'success')
    } catch (error) {
      toast('Erro ao desconectar', 'error')
    } finally {
      setDisconnectingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!cliente) {
    return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Redes Sociais</h1>
            <p className="text-sm text-zinc-500">Gerencie as conexões de {cliente.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleConnect()}
            disabled={connecting}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {connecting ? 'Abrindo...' : 'Conectar Redes'}
          </Button>
        </div>
      </div>

      {/* Social Platforms Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {SOCIAL_PLATFORMS.map(platform => {
          const Icon = platform.icon
          const connectedAccount = socialAccounts.find(acc => acc.platform === platform.id)
          const isConnected = !!connectedAccount
          const isDisconnecting = disconnectingId === connectedAccount?.id

          return (
            <Card key={platform.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Platform Icon */}
                  <div 
                    className="p-4 rounded-2xl shadow-sm group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${platform.color}15` }}
                  >
                    <Icon 
                      className="w-8 h-8" 
                      style={{ color: platform.color }}
                    />
                  </div>

                  {/* Platform Info */}
                  <div>
                    <h3 className="font-semibold text-zinc-900">{platform.name}</h3>
                    <p className="text-xs text-zinc-500 mb-3">{platform.description}</p>
                  </div>

                  {/* Connection Status */}
                  {isConnected ? (
                    <div className="w-full space-y-3">
                      <Badge variant="success" className="w-full justify-center">
                        ✓ Conectado
                      </Badge>
                      
                      {connectedAccount.profile_avatar && (
                        <Avatar 
                          src={connectedAccount.profile_avatar}
                          name={connectedAccount.profile_name || platform.name}
                          size="sm"
                        />
                      )}
                      
                      <div className="text-xs text-zinc-600 font-medium">
                        {connectedAccount.profile_name}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDisconnect(connectedAccount.id, platform.name)}
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleConnect([platform.id])}
                      disabled={connecting}
                      style={{
                        borderColor: connecting ? '#ccc' : platform.color,
                        color: connecting ? '#666' : platform.color
                      }}
                    >
                      {connecting ? 'Abrindo...' : 'Conectar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Connected Accounts Summary */}
      {socialAccounts.length > 0 && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Contas Conectadas</h3>
            <div className="space-y-3">
              {socialAccounts.map(account => {
                const platform = SOCIAL_PLATFORMS.find(p => p.id === account.platform)
                if (!platform) return null
                const Icon = platform.icon
                
                return (
                  <div key={account.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-50">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${platform.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: platform.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900">{platform.name}</div>
                      <div className="text-sm text-zinc-500">{account.profile_name}</div>
                    </div>
                    {account.profile_avatar && (
                      <Avatar src={account.profile_avatar} name={account.profile_name || ''} size="sm" />
                    )}
                    <Badge variant="success">Ativo</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {socialAccounts.length === 0 && !loading && (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="font-semibold text-zinc-900 mb-2">Nenhuma conta conectada</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Conecte as redes sociais do {cliente.nome} para começar a agendar publicações.
            </p>
            <Button
              variant="primary"
              onClick={() => handleConnect()}
              disabled={connecting}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {connecting ? 'Abrindo...' : 'Conectar Redes Sociais'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
