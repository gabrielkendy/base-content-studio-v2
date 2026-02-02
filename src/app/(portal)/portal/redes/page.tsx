'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Instagram, Youtube, Facebook, Linkedin, Twitter, Hash, Zap, ExternalLink, RefreshCw } from 'lucide-react'

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

interface Cliente {
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

export default function PortalRedesSociaisPage() {
  const searchParams = useSearchParams()
  const { org, member } = useAuth()
  const { toast } = useToast()
  
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingClientId, setConnectingClientId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  const fetchAllStatuses = useCallback(async (clientesList: Cliente[], showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    
    const allAccounts: SocialAccount[] = []
    
    for (const cliente of clientesList) {
      try {
        const res = await fetch(`/api/social/status?clienteSlug=${cliente.slug}`)
        const data = await res.json()
        if (data.success && data.accounts) {
          allAccounts.push(...data.accounts)
        }
      } catch (err) {
        console.error(`Error fetching status for ${cliente.slug}:`, err)
      }
    }
    
    setSocialAccounts(allAccounts)
    if (showRefresh) {
      setRefreshing(false)
      toast('Status atualizado!', 'success')
    }
  }, [toast])

  useEffect(() => {
    if (!org || !member) return
    loadData()
  }, [org, member])

  // Handle redirect back from Upload-Post
  useEffect(() => {
    if (searchParams.get('connected') === 'true' && clientes.length > 0) {
      toast('Redes sociais atualizadas! Sincronizando...', 'success')
      fetchAllStatuses(clientes, true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, clientes])

  async function loadData() {
    setLoading(true)
    
    try {
      const { data: clientesData } = await db.select('clientes', {
        filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      })
      
      const clientesList = clientesData || []
      setClientes(clientesList)
      
      if (clientesList.length > 0) {
        await fetchAllStatuses(clientesList)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect(clienteSlug: string, clienteId: string, platforms?: string[]) {
    setConnectingClientId(clienteId)
    
    try {
      const res = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteSlug, platforms }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.access_url) {
        toast(data.error || 'Erro ao gerar link de conexão', 'error')
        return
      }

      window.open(data.access_url, '_blank')
      toast('Janela de conexão aberta. Complete o processo e volte aqui.', 'success')
    } catch (error) {
      toast('Erro ao conectar. Tente novamente.', 'error')
    } finally {
      setConnectingClientId(null)
    }
  }

  async function handleDisconnect(accountId: string, platformName: string) {
    if (!confirm(`Desconectar ${platformName}? Você poderá reconectar depois.`)) return
    
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

  if (clientes.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Redes Sociais</h1>
            <p className="text-sm text-zinc-500">Gerencie suas conexões sociais</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold text-zinc-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-sm text-zinc-500">
              Você não tem acesso a nenhum cliente no momento.
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
            <h1 className="text-2xl font-bold text-zinc-900">Redes Sociais</h1>
            <p className="text-sm text-zinc-500">Conecte e gerencie suas redes sociais</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => fetchAllStatuses(clientes, true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Client sections */}
      {clientes.map(cliente => {
        const clienteAccounts = socialAccounts.filter(acc => acc.cliente_id === cliente.id)
        const isConnecting = connectingClientId === cliente.id
        
        return (
          <div key={cliente.id} className="space-y-4">
            {/* Client Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={cliente.nome} 
                  src={cliente.logo_url} 
                  color={cliente.cores?.primaria || '#6366F1'}
                  size="md"
                />
                <div>
                  <h2 className="font-bold text-lg text-zinc-900">{cliente.nome}</h2>
                  <p className="text-sm text-zinc-500">
                    {clienteAccounts.length} conta{clienteAccounts.length !== 1 ? 's' : ''} conectada{clienteAccounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleConnect(cliente.slug, cliente.id)}
                disabled={isConnecting}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {isConnecting ? 'Abrindo...' : 'Conectar Redes'}
              </Button>
            </div>

            {/* Platforms Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SOCIAL_PLATFORMS.map(platform => {
                const Icon = platform.icon
                const connectedAccount = clienteAccounts.find(acc => acc.platform === platform.id)
                const isConnected = !!connectedAccount
                const isDisconnecting = disconnectingId === connectedAccount?.id

                return (
                  <Card key={platform.id} className="hover:shadow-lg transition-all duration-200 group">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div 
                          className="p-3 rounded-xl shadow-sm group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: `${platform.color}15` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: platform.color }} />
                        </div>

                        <div>
                          <h3 className="font-medium text-zinc-900 text-sm">{platform.name}</h3>
                          <p className="text-xs text-zinc-500">{platform.description}</p>
                        </div>

                        {isConnected ? (
                          <div className="w-full space-y-2">
                            <Badge variant="success" className="w-full justify-center text-xs">
                              ✓ Conectado
                            </Badge>
                            
                            {connectedAccount.profile_avatar && (
                              <Avatar 
                                src={connectedAccount.profile_avatar}
                                name={connectedAccount.profile_name || platform.name}
                                size="sm"
                              />
                            )}
                            
                            <div className="text-xs text-zinc-600 font-medium line-clamp-2">
                              {connectedAccount.profile_name}
                            </div>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
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
                            className="w-full text-xs"
                            onClick={() => handleConnect(cliente.slug, cliente.id, [platform.id])}
                            disabled={isConnecting}
                            style={{
                              borderColor: isConnecting ? '#ccc' : platform.color,
                              color: isConnecting ? '#666' : platform.color
                            }}
                          >
                            {isConnecting ? 'Abrindo...' : 'Conectar'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Connected Accounts Summary */}
            {clienteAccounts.length > 0 && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-medium text-zinc-900 mb-3 text-sm">Contas Conectadas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clienteAccounts.map(account => {
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
                          {account.profile_avatar && (
                            <Avatar src={account.profile_avatar} name={account.profile_name || ''} size="sm" />
                          )}
                          <Badge variant="success" className="text-xs">Ativo</Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      })}

      {/* Overall Empty State */}
      {socialAccounts.length === 0 && (
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="font-semibold text-zinc-900 mb-2">Nenhuma conta conectada</h3>
            <p className="text-sm text-zinc-500">
              Conecte suas redes sociais para começar a agendar publicações.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
