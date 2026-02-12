'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  ArrowLeft, Home, MapPin, Bed, Bath, Car, Square, 
  DollarSign, Copy, Check, Mail, Video, Send, 
  FileText, Image, Trash2, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Imovel {
  id: string
  codigo?: string
  titulo: string
  tipo: string
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  area_construida?: number
  quartos?: number
  suites?: number
  banheiros?: number
  vagas?: number
  preco?: number
  preco_condominio?: number
  tipo_negocio?: string
  descricao?: string
  diferenciais?: string[]
  fotos?: string[]
  carrossel_gerado?: any[]
  legenda_gerada?: string
  roteiro_video?: string
  status: string
  email_kendy_enviado?: boolean
  email_equipe_enviado?: boolean
  resposta_gravacao?: string
  respondido_por?: string
  respondido_em?: string
  solicitacao_id?: string
  created_at: string
  cliente?: { id: string; nome: string; slug: string; cores?: any }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  novo: { label: 'Novo', color: '#8B5CF6', emoji: '🆕' },
  conteudo_criado: { label: 'Conteúdo Criado', color: '#3B82F6', emoji: '📝' },
  aguardando_gravacao: { label: 'Aguardando Gravação', color: '#F59E0B', emoji: '🎬' },
  em_producao: { label: 'Em Produção', color: '#6366F1', emoji: '🔨' },
  publicado: { label: 'Publicado', color: '#22C55E', emoji: '✅' },
}

function formatPreco(valor?: number): string {
  if (!valor) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ImovelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'carrossel' | 'legenda' | 'roteiro'>('carrossel')

  const id = params.id as string

  useEffect(() => {
    if (org && id) loadImovel()
  }, [org, id])

  async function loadImovel() {
    try {
      const res = await fetch(`/api/imoveis/${id}`)
      const data = await res.json()
      
      if (!res.ok) {
        toast('Imóvel não encontrado', 'error')
        router.push('/imoveis')
        return
      }
      
      setImovel(data.data)
    } catch (e) {
      console.error('Error loading imovel:', e)
      toast('Erro ao carregar imóvel', 'error')
    }
    setLoading(false)
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast('Copiado!', 'success')
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return
    
    try {
      const res = await fetch(`/api/imoveis/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast('Imóvel excluído', 'success')
        router.push('/imoveis')
      } else {
        toast('Erro ao excluir', 'error')
      }
    } catch (e) {
      toast('Erro ao excluir', 'error')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!imovel) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Imóvel não encontrado</p>
        <Link href="/imoveis">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
      </div>
    )
  }

  const status = STATUS_CONFIG[imovel.status] || STATUS_CONFIG.novo

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div className="flex items-start gap-4">
          <Link href="/imoveis">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            {imovel.cliente && (
              <p className="text-sm text-indigo-600 font-medium mb-1">{imovel.cliente.nome}</p>
            )}
            <h1 className="text-2xl font-bold text-zinc-900">{imovel.titulo}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge style={{ background: status.color }} className="text-white">
                {status.emoji} {status.label}
              </Badge>
              {imovel.codigo && (
                <span className="text-sm text-zinc-500">Cód: {imovel.codigo}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {imovel.solicitacao_id && (
            <Link href={`/workflow?conteudo=${imovel.solicitacao_id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" /> Ver no Workflow
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Dados do imóvel */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-zinc-900 border-b pb-2">📋 Dados do Imóvel</h3>
            
            {/* Localização */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
              <div>
                {imovel.endereco && <p>{imovel.endereco}</p>}
                <p className="text-zinc-600">{[imovel.bairro, imovel.cidade, imovel.estado].filter(Boolean).join(' - ')}</p>
              </div>
            </div>

            {/* Características */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {imovel.area_construida && (
                <div className="flex items-center gap-2">
                  <Square className="w-4 h-4 text-zinc-400" />
                  <span>{imovel.area_construida}m²</span>
                </div>
              )}
              {imovel.quartos && (
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-zinc-400" />
                  <span>{imovel.quartos} quartos</span>
                </div>
              )}
              {imovel.suites && (
                <div className="flex items-center gap-2">
                  <Bath className="w-4 h-4 text-zinc-400" />
                  <span>{imovel.suites} suítes</span>
                </div>
              )}
              {imovel.vagas && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-zinc-400" />
                  <span>{imovel.vagas} vagas</span>
                </div>
              )}
            </div>

            {/* Preço */}
            <div className="pt-3 border-t">
              <p className="text-2xl font-bold text-green-600">{formatPreco(imovel.preco)}</p>
              {imovel.preco_condominio && (
                <p className="text-sm text-zinc-500">+ {formatPreco(imovel.preco_condominio)}/mês de condomínio</p>
              )}
            </div>

            {/* Diferenciais */}
            {imovel.diferenciais && imovel.diferenciais.length > 0 && (
              <div className="pt-3 border-t">
                <p className="font-medium text-zinc-700 mb-2">✨ Diferenciais</p>
                <div className="flex flex-wrap gap-1.5">
                  {imovel.diferenciais.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Status dos emails */}
            <div className="pt-3 border-t space-y-2">
              <p className="font-medium text-zinc-700 mb-2">📧 Emails</p>
              <div className="flex items-center gap-2 text-sm">
                {imovel.email_kendy_enviado ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Email gestor enviado
                  </span>
                ) : (
                  <span className="text-zinc-400">Email gestor pendente</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                {imovel.email_equipe_enviado ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Email equipe enviado
                  </span>
                ) : (
                  <span className="text-zinc-400">Email equipe pendente</span>
                )}
              </div>
              
              {/* Resposta da gravação */}
              {imovel.resposta_gravacao && (
                <div className="pt-2 mt-2 border-t">
                  <p className="text-sm">
                    <span className="font-medium">Resposta gravação:</span>{' '}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${imovel.resposta_gravacao === 'sim' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {imovel.resposta_gravacao === 'sim' ? '✅ Vai gravar' : '❌ Não vai gravar'}
                    </span>
                  </p>
                  {imovel.respondido_por && (
                    <p className="text-xs text-zinc-500 mt-1">por {imovel.respondido_por}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coluna 2-3: Conteúdo gerado */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-zinc-200">
            <button
              onClick={() => setActiveTab('carrossel')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'carrossel' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              📑 Carrossel
            </button>
            <button
              onClick={() => setActiveTab('legenda')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'legenda' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              📝 Legenda
            </button>
            <button
              onClick={() => setActiveTab('roteiro')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'roteiro' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              🎬 Roteiro
            </button>
          </div>

          {/* Conteúdo da tab */}
          <Card>
            <CardContent className="p-6">
              {activeTab === 'carrossel' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Estrutura do Carrossel</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(imovel.carrossel_gerado, null, 2), 'carrossel')}
                    >
                      {copiedField === 'carrossel' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar JSON
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {imovel.carrossel_gerado?.map((slide: any, i: number) => (
                      <div key={i} className="border rounded-lg p-4 bg-zinc-50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">Slide {slide.numero}</Badge>
                          <span className="text-xs text-zinc-400">{slide.tipo}</span>
                        </div>
                        {slide.titulo && (
                          <p className="font-medium text-sm">{slide.titulo}</p>
                        )}
                        {slide.subtitulo && (
                          <p className="text-xs text-zinc-500">{slide.subtitulo}</p>
                        )}
                        {slide.conteudo && (
                          <ul className="text-xs text-zinc-600 mt-2 space-y-1">
                            {slide.conteudo.slice(0, 3).map((c: string, j: number) => (
                              <li key={j}>{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'legenda' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Legenda para Instagram</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(imovel.legenda_gerada || '', 'legenda')}
                    >
                      {copiedField === 'legenda' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar
                    </Button>
                  </div>
                  
                  <div className="bg-zinc-50 rounded-lg p-4 whitespace-pre-wrap text-sm font-mono">
                    {imovel.legenda_gerada}
                  </div>
                </div>
              )}

              {activeTab === 'roteiro' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Roteiro de Vídeo</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(imovel.roteiro_video || '', 'roteiro')}
                    >
                      {copiedField === 'roteiro' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copiar
                    </Button>
                  </div>
                  
                  <div className="bg-zinc-50 rounded-lg p-6 text-sm overflow-auto max-h-[500px] whitespace-pre-wrap font-mono">
                    {imovel.roteiro_video || ''}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
