'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, ExternalLink, RefreshCw, Instagram, Youtube, Facebook, Linkedin, Twitter, Music2, Hash, Pin } from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

interface Conta {
  plataforma: string
  conectada: boolean
  nome?: string
  avatar?: string
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

export default function ClienteRedesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const { org } = useAuth()
  const { toast } = useToast()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingConexao, setLoadingConexao] = useState(false)

  // Detectar retorno do Upload-Post
  useEffect(() => {
    const connected = searchParams.get('connected')
    if (connected === 'true') {
      toast('✅ Redes atualizadas!', 'success')
      window.history.replaceState({}, '', `/clientes/${slug}/redes`)
      carregarConexoes()
    }
  }, [searchParams])

  useEffect(() => {
    if (org) loadData()
  }, [org])

  async function loadData() {
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })
    if (!c) { setLoading(false); return }
    setCliente(c)
    await carregarConexoes()
    setLoading(false)
  }

  async function carregarConexoes() {
    try {
      const res = await fetch(`/api/v2/social?action=conexoes&cliente=${slug}`)
      const data = await res.json()
      setContas(data.contas || [])
    } catch {
      setContas([])
    }
  }

  async function abrirConexao() {
    setLoadingConexao(true)
    try {
      const res = await fetch('/api/v2/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          clienteSlug: slug,
          clienteNome: cliente?.nome,
        })
      })
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast(data.error || 'Erro', 'error')
        setLoadingConexao(false)
      }
    } catch {
      toast('Erro', 'error')
      setLoadingConexao(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'
  const conectadas = contas.filter(c => c.conectada).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/clientes/${slug}`} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-500" />
          </Link>
          <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Redes Sociais</h1>
            <p className="text-sm text-zinc-500">
              {conectadas > 0 ? (
                <span className="text-emerald-600 font-medium">✓ {conectadas} conectada{conectadas !== 1 ? 's' : ''}</span>
              ) : (
                <span>Nenhuma rede conectada</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={abrirConexao} disabled={loadingConexao}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {loadingConexao ? 'Abrindo...' : 'Conectar Redes'}
          </Button>
          <Button variant="ghost" onClick={carregarConexoes}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid de Plataformas - Visual rico */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {PLATAFORMAS.map(plat => {
          const conta = contas.find(c => c.plataforma === plat.id)
          const isConnected = conta?.conectada
          const Icon = plat.icon

          return (
            <Card
              key={plat.id}
              className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${
                isConnected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
              }`}
            >
              <div className={`h-24 flex items-center justify-center relative ${isConnected ? plat.bgColor : 'bg-zinc-100'}`}>
                <Icon className={`w-10 h-10 ${isConnected ? 'text-white' : 'text-zinc-300'}`} />
                {isConnected && (
                  <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] border-0">
                    CONECTADO
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900">{plat.name}</h3>
                {isConnected && conta?.nome ? (
                  <p className="text-sm text-zinc-500 truncate">{conta.nome}</p>
                ) : (
                  <p className="text-sm text-zinc-400">Não conectado</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state */}
      {conectadas === 0 && (
        <Card className="border-dashed border-2 border-zinc-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-2">Conecte suas redes</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Conecte as redes sociais de {cliente.nome} para publicar conteúdo.
            </p>
            <Button onClick={abrirConexao} disabled={loadingConexao}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {loadingConexao ? 'Abrindo...' : 'Conectar Redes'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
