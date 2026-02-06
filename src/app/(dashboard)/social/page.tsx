'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { 
  Share2, Check, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Instagram, Youtube, Facebook, Linkedin, Twitter, Music2, Hash, Pin
} from 'lucide-react'

interface Conta {
  plataforma: string
  conectada: boolean
  nome?: string
  avatar?: string
}

interface Cliente {
  id: string
  nome: string
  slug: string
  logo_url?: string
  cores?: { primaria?: string }
  contas: Conta[]
  loading: boolean
  expanded: boolean
}

const PLATAFORMAS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', bgColor: 'bg-[#1877F2]' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', bgColor: 'bg-[#0A66C2]' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#000000', bgColor: 'bg-black' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: 'bg-[#FF0000]' },
  { id: 'x', name: 'X', icon: Twitter, color: '#000000', bgColor: 'bg-black' },
  { id: 'threads', name: 'Threads', icon: Hash, color: '#000000', bgColor: 'bg-black' },
  { id: 'pinterest', name: 'Pinterest', icon: Pin, color: '#BD081C', bgColor: 'bg-[#BD081C]' },
]

export default function SocialPage() {
  const { org } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null)

  // Detectar retorno do Upload-Post
  useEffect(() => {
    const conectado = searchParams.get('conectado')
    if (conectado) {
      toast(`✅ Redes atualizadas para ${conectado}!`, 'success')
      setClienteSelecionado(conectado)
      window.history.replaceState({}, '', '/social')
    }
  }, [searchParams, toast])

  // Carregar clientes
  useEffect(() => {
    if (!org) return
    
    setLoading(true)
    db.select('clientes', { 
      select: 'id,nome,slug,logo_url,cores', 
      order: { col: 'nome', asc: true } 
    })
      .then(async (result) => {
        const data = result.data || []
        const clientesList: Cliente[] = data.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          slug: c.slug,
          logo_url: c.logo_url,
          cores: c.cores,
          contas: [],
          loading: true,
          expanded: false,
        }))
        setClientes(clientesList)
        setLoading(false)

        // Buscar conexões de cada cliente
        for (const cliente of clientesList) {
          await carregarConexoes(cliente.slug)
        }
      })
      .catch(() => {
        toast('Erro ao carregar', 'error')
        setLoading(false)
      })
  }, [org])

  // Auto-expand cliente que acabou de conectar
  useEffect(() => {
    if (clienteSelecionado) {
      setClientes(prev => prev.map(c => ({
        ...c,
        expanded: c.slug === clienteSelecionado
      })))
      // Atualizar conexões do cliente
      carregarConexoes(clienteSelecionado)
    }
  }, [clienteSelecionado])

  async function carregarConexoes(slug: string) {
    try {
      const res = await fetch(`/api/v2/social?action=conexoes&cliente=${slug}`)
      const data = await res.json()
      
      setClientes(prev => prev.map(c => 
        c.slug === slug 
          ? { ...c, contas: data.contas || [], loading: false }
          : c
      ))
    } catch {
      setClientes(prev => prev.map(c => 
        c.slug === slug ? { ...c, loading: false } : c
      ))
    }
  }

  async function abrirConexao(cliente: Cliente) {
    try {
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: true } : c
      ))

      const res = await fetch('/api/v2/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          clienteSlug: cliente.slug,
          clienteNome: cliente.nome,
        })
      })
      
      const data = await res.json()
      
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast(data.error || 'Erro ao gerar link', 'error')
        setClientes(prev => prev.map(c => 
          c.id === cliente.id ? { ...c, loading: false } : c
        ))
      }
    } catch (err) {
      toast('Erro', 'error')
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: false } : c
      ))
    }
  }

  function toggleExpand(clienteId: string) {
    setClientes(prev => prev.map(c => 
      c.id === clienteId ? { ...c, expanded: !c.expanded } : c
    ))
  }

  async function atualizar(cliente: Cliente) {
    setClientes(prev => prev.map(c => 
      c.id === cliente.id ? { ...c, loading: true } : c
    ))
    await carregarConexoes(cliente.slug)
    toast('Atualizado!', 'success')
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Redes Sociais</h1>
            <p className="text-sm text-zinc-500">Conecte as redes de cada cliente</p>
          </div>
        </div>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            <div className="text-4xl mb-4">📱</div>
            <p>Nenhum cliente cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {clientes.map(cliente => {
            const conectadas = cliente.contas.filter(c => c.conectada).length
            const total = PLATAFORMAS.length

            return (
              <Card key={cliente.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header do Cliente - Clicável */}
                <button
                  onClick={() => toggleExpand(cliente.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar 
                      name={cliente.nome} 
                      src={cliente.logo_url} 
                      color={cliente.cores?.primaria || '#6366F1'}
                      size="lg"
                    />
                    <div className="text-left">
                      <h2 className="font-bold text-lg text-zinc-900">{cliente.nome}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        {conectadas > 0 ? (
                          <Badge variant="success" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            {conectadas} conectada{conectadas !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            Nenhuma conectada
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Mini preview das redes conectadas */}
                    <div className="hidden sm:flex gap-1">
                      {PLATAFORMAS.slice(0, 5).map(p => {
                        const conta = cliente.contas.find(c => c.plataforma === p.id)
                        const Icon = p.icon
                        return (
                          <div
                            key={p.id}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              conta?.conectada 
                                ? p.bgColor + ' text-white shadow-md' 
                                : 'bg-zinc-100 text-zinc-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                        )
                      })}
                    </div>
                    
                    {cliente.expanded ? (
                      <ChevronUp className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Conteúdo Expandido - Grid de Plataformas */}
                {cliente.expanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/50 p-6 animate-fade-in">
                    {/* Ações */}
                    <div className="flex gap-2 mb-6">
                      <Button
                        variant="primary"
                        onClick={(e) => { e.stopPropagation(); abrirConexao(cliente) }}
                        disabled={cliente.loading}
                        className="shadow-md"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {cliente.loading ? 'Abrindo...' : 'Conectar Redes'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); atualizar(cliente) }}
                        disabled={cliente.loading}
                      >
                        <RefreshCw className={`w-4 h-4 ${cliente.loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {/* Grid de Plataformas - Estilo mLabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {cliente.loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-32 rounded-xl bg-zinc-200 animate-pulse" />
                        ))
                      ) : (
                        PLATAFORMAS.map(plat => {
                          const conta = cliente.contas.find(c => c.plataforma === plat.id)
                          const isConnected = conta?.conectada
                          const Icon = plat.icon

                          return (
                            <div
                              key={plat.id}
                              className={`relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                                isConnected 
                                  ? plat.bgColor + ' text-white shadow-lg' 
                                  : 'bg-white border-2 border-dashed border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="p-4 h-32 flex flex-col justify-between">
                                {/* Header com ícone e nome */}
                                <div className="flex items-start justify-between">
                                  <div className={`p-2 rounded-lg ${isConnected ? 'bg-white/20' : 'bg-zinc-100'}`}>
                                    <Icon className={`w-5 h-5 ${isConnected ? 'text-white' : 'text-zinc-400'}`} />
                                  </div>
                                  {isConnected && (
                                    <Badge className="bg-white/20 text-white text-[10px] border-0">
                                      CONECTADO
                                    </Badge>
                                  )}
                                </div>

                                {/* Info da conta */}
                                <div>
                                  <h3 className={`font-semibold text-sm ${isConnected ? 'text-white' : 'text-zinc-700'}`}>
                                    {plat.name}
                                  </h3>
                                  {isConnected && conta?.nome ? (
                                    <p className="text-xs text-white/80 truncate mt-0.5">
                                      {conta.nome}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                      Não conectado
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Botão de conectar se não conectado */}
                              {!isConnected && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); abrirConexao(cliente) }}
                                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 transition-colors group"
                                >
                                  <span className="text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Conectar
                                  </span>
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
