'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Share2, Check, X, RefreshCw, Link } from 'lucide-react'

interface Conta {
  plataforma: string
  conectada: boolean
  nome?: string
}

interface Cliente {
  id: string
  nome: string
  slug: string
  contas: Conta[]
  loading: boolean
}

const PLATAFORMAS = ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin']
const ICONES: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  facebook: '👤',
  youtube: '📺',
  linkedin: '💼',
}

export default function SocialPage() {
  const { org } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // Detectar retorno do Upload-Post
  useEffect(() => {
    const conectado = searchParams.get('conectado')
    if (conectado) {
      toast(`✅ Redes conectadas para ${conectado}! Atualizando...`, 'success')
      // Limpa URL
      window.history.replaceState({}, '', '/social')
    }
  }, [searchParams, toast])

  // Carregar clientes
  useEffect(() => {
    if (!org) return
    
    setLoading(true)
    db.select('clientes', { select: 'id,nome,slug', order: { col: 'nome', asc: true } })
      .then(async (result) => {
        const data = result.data || []
        const clientesList: Cliente[] = data.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          slug: c.slug,
          contas: [],
          loading: true,
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

  // Carregar conexões de um cliente
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

  // Abrir popup de conexão
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
        // Redirect direto
        window.location.href = data.url
      } else {
        toast(data.error || 'Erro ao gerar link', 'error')
      }
    } catch (err) {
      toast('Erro', 'error')
    } finally {
      setClientes(prev => prev.map(c => 
        c.id === cliente.id ? { ...c, loading: false } : c
      ))
    }
  }

  // Atualizar status
  async function atualizar(cliente: Cliente) {
    setClientes(prev => prev.map(c => 
      c.id === cliente.id ? { ...c, loading: true } : c
    ))
    await carregarConexoes(cliente.slug)
    toast('Atualizado', 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="w-6 h-6" /> Redes Sociais
        </h1>
        <p className="text-sm text-zinc-500">
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
        <div className="space-y-3">
          {clientes.map(cliente => {
            const conectadas = cliente.contas.filter(c => c.conectada).length

            return (
              <Card key={cliente.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Info do cliente */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{cliente.nome}</span>
                        {conectadas > 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> {conectadas}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                            <X className="w-3 h-3" /> Nenhuma
                          </span>
                        )}
                      </div>

                      {/* Ícones das plataformas */}
                      <div className="flex gap-1 mt-2">
                        {cliente.loading ? (
                          <div className="animate-pulse h-6 w-32 bg-zinc-200 rounded" />
                        ) : (
                          PLATAFORMAS.map(p => {
                            const conta = cliente.contas.find(c => c.plataforma === p)
                            return (
                              <div
                                key={p}
                                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                                  conta?.conectada 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-zinc-100 text-zinc-400'
                                }`}
                                title={conta?.conectada ? `${p}: ${conta.nome}` : `${p}: não conectado`}
                              >
                                {ICONES[p]}
                                {conta?.conectada && <Check className="w-3 h-3" />}
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => atualizar(cliente)}
                        disabled={cliente.loading}
                      >
                        <RefreshCw className={`w-4 h-4 ${cliente.loading ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => abrirConexao(cliente)}
                        disabled={cliente.loading}
                      >
                        <Link className="w-4 h-4 mr-1" />
                        Conectar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Instruções */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4 text-sm text-blue-800">
          <strong>Como funciona:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Clique em <strong>Conectar</strong> no cliente</li>
            <li>Nova janela abre → faça login nas redes</li>
            <li>Após conectar, clique em ↻ para atualizar</li>
            <li>Pronto! Pode agendar posts</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
