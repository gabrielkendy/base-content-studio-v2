'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Share2, Check, X, ExternalLink, RefreshCw } from 'lucide-react'

interface SocialAccount {
  platform: string
  display_name: string | null
  avatar_url: string | null
  connected: boolean
}

interface ClienteStatus {
  id: string
  nome: string
  slug: string
  username: string
  accounts: SocialAccount[]
  loading: boolean
  connectUrl: string | null
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  facebook: '👤',
  youtube: '📺',
  linkedin: '💼',
  x: '𝕏',
  threads: '🧵',
}

export default function RedesPage() {
  const { org } = useAuth()
  const { toast } = useToast()
  const [clientes, setClientes] = useState<ClienteStatus[]>([])
  const [loading, setLoading] = useState(true)

  // Load clientes and their social status
  useEffect(() => {
    if (!org) return

    setLoading(true)
    db.select('clientes', { select: 'id,nome,slug', order: { col: 'nome', asc: true } })
      .then(async (result) => {
        const data = result.data || []
        
        // Initialize clientes
        const clientesWithStatus: ClienteStatus[] = data.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          slug: c.slug,
          username: c.slug, // Will be updated after fetching
          accounts: [],
          loading: true,
          connectUrl: null,
        }))
        
        setClientes(clientesWithStatus)
        setLoading(false)

        // Fetch status for each cliente
        for (const cliente of clientesWithStatus) {
          try {
            const res = await fetch(`/api/social/status?clienteSlug=${cliente.slug}`)
            const statusData = await res.json()
            
            setClientes(prev => prev.map(c => 
              c.id === cliente.id 
                ? { 
                    ...c, 
                    username: statusData.username || c.slug,
                    accounts: statusData.accounts || [],
                    loading: false 
                  }
                : c
            ))
          } catch (err) {
            setClientes(prev => prev.map(c => 
              c.id === cliente.id ? { ...c, loading: false } : c
            ))
          }
        }
      })
      .catch(() => {
        toast('Erro ao carregar clientes', 'error')
        setLoading(false)
      })
  }, [org, toast])

  const handleConnect = async (cliente: ClienteStatus) => {
    try {
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: true } : c
      ))

      const res = await fetch('/api/social/connect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteSlug: cliente.slug })
      })
      
      const data = await res.json()
      
      if (data.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
      } else {
        toast('Erro ao gerar link', 'error')
      }
    } catch (err) {
      toast('Erro ao conectar', 'error')
    } finally {
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: false } : c
      ))
    }
  }

  const refreshStatus = async (cliente: ClienteStatus) => {
    try {
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: true } : c
      ))

      const res = await fetch(`/api/social/status?clienteSlug=${cliente.slug}`)
      const statusData = await res.json()
      
      setClientes(prev => prev.map(c => 
        c.id === cliente.id 
          ? { 
              ...c, 
              username: statusData.username || c.slug,
              accounts: statusData.accounts || [],
              loading: false 
            }
          : c
      ))
      
      toast('Status atualizado', 'success')
    } catch (err) {
      toast('Erro ao atualizar', 'error')
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: false } : c
      ))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Share2 className="w-6 h-6" /> Redes Sociais
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Conecte as redes de cada cliente para agendar publicações
        </p>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            Nenhum cliente cadastrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clientes.map(cliente => {
            const connectedCount = cliente.accounts.filter(a => a.connected).length
            const hasAnyConnected = connectedCount > 0

            return (
              <Card key={cliente.id} className={hasAnyConnected ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-zinc-900">{cliente.nome}</h3>
                        {hasAnyConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <Check className="w-3 h-3" /> {connectedCount} conectada{connectedCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <X className="w-3 h-3" /> Não conectado
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2">
                        {cliente.loading ? (
                          <div className="animate-pulse h-6 w-32 bg-zinc-200 rounded" />
                        ) : (
                          <div className="flex items-center gap-2">
                            {['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin'].map(platform => {
                              const account = cliente.accounts.find(a => a.platform === platform)
                              const connected = account?.connected
                              
                              return (
                                <div 
                                  key={platform}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                                    connected 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-zinc-100 text-zinc-400'
                                  }`}
                                  title={connected ? `${platform}: ${account?.display_name || 'Conectado'}` : `${platform}: Não conectado`}
                                >
                                  <span>{PLATFORM_ICONS[platform] || '📱'}</span>
                                  {connected && <Check className="w-3 h-3" />}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshStatus(cliente)}
                        disabled={cliente.loading}
                        title="Atualizar status"
                      >
                        <RefreshCw className={`w-4 h-4 ${cliente.loading ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant={hasAnyConnected ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleConnect(cliente)}
                        disabled={cliente.loading}
                        className={!hasAnyConnected ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {hasAnyConnected ? 'Gerenciar' : 'Conectar Redes'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Como funciona</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Clique em "Conectar Redes" no cliente desejado</li>
            <li>Uma nova janela abrirá para autenticar cada rede</li>
            <li>Após conectar, clique em ↻ para atualizar o status</li>
            <li>Pronto! Agora você pode agendar posts para esse cliente</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
