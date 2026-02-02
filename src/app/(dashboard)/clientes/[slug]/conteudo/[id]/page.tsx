'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  ExternalLink,
  Image as ImageIcon,
  Video,
  File,
  Copy,
  CheckCircle,
  Clock,
  Hash,
} from 'lucide-react'
import { STATUS_CONFIG, TIPO_EMOJI, CANAIS, formatDateFull } from '@/lib/utils'
import type { Conteudo, Cliente } from '@/types/database'
import Link from 'next/link'

export default function ConteudoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const conteudoId = params.id as string
  const { org } = useAuth()

  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (org?.id) loadData()
  }, [org?.id, conteudoId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load conteudo
      const { data: c, error: cErr } = await db.select('conteudos', {
        select: '*',
        filters: [{ op: 'eq', col: 'id', val: conteudoId }],
        single: true,
      })
      if (cErr) throw new Error(cErr)
      setConteudo(c)

      // Load cliente
      if (c?.empresa_id) {
        const { data: cl, error: clErr } = await db.select('clientes', {
          filters: [{ op: 'eq', col: 'id', val: c.empresa_id }],
          single: true,
        })
        if (clErr) throw new Error(clErr)
        setCliente(cl)
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdo:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!conteudo) return
    try {
      const { error } = await db.update('conteudos', { status, updated_at: new Date().toISOString() }, { id: conteudo.id })
      if (error) throw new Error(error)
      setConteudo(prev => prev ? { ...prev, status } : null)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert('Erro ao atualizar status')
    }
  }

  const generateApprovalLink = async () => {
    if (!conteudo || !cliente) return
    try {
      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      const { error } = await db.insert('aprovacoes_links', {
        conteudo_id: conteudo.id,
        empresa_id: cliente.id,
        token,
        status: 'pendente',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      if (error) throw new Error(error)

      const link = `${window.location.origin}/aprovacao?token=${token}`
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Erro ao gerar link:', err)
      alert('Erro ao gerar link de aprovação')
    }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!conteudo) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Conteúdo não encontrado</h2>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[conteudo.status] || { emoji: '❓', label: conteudo.status, color: '#6B7280' }
  const slides = Array.isArray(conteudo.slides) ? conteudo.slides : []
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []
  const mediaUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
  const promptsImagem = Array.isArray(conteudo.prompts_imagem) ? conteudo.prompts_imagem : []
  const promptsVideo = Array.isArray(conteudo.prompts_video) ? conteudo.prompts_video : []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateApprovalLink}>
            {linkCopied ? <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
            {linkCopied ? 'Link Copiado!' : 'Gerar Link de Aprovação'}
          </Button>
          <Link href={`/clientes/${slug}/mes/${conteudo.mes}`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-blue-100 text-blue-800">
                {TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}
              </Badge>
              {conteudo.badge && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Hash className="w-3 h-3 mr-1" />
                  {conteudo.badge}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {conteudo.titulo || 'Sem título'}
            </h1>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Badge style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color, borderColor: statusCfg.color }}
              className="border">
              {statusCfg.emoji} {statusCfg.label}
            </Badge>
          </div>
          <select
            value={conteudo.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            {conteudo.data_publicacao ? formatDateFull(conteudo.data_publicacao) : 'Sem data'}
          </div>
          {(conteudo as any).assignee && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              {(conteudo as any).assignee.display_name}
            </div>
          )}
          {canais.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              {canais.map((canalId: string) => {
                const canal = CANAIS.find(c => c.id === canalId)
                return canal ? (
                  <Badge key={canalId} className="bg-gray-100 text-gray-700 text-xs">
                    {canal.icon} {canal.label}
                  </Badge>
                ) : null
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Descrição */}
      {conteudo.descricao && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Descrição</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {conteudo.descricao}
            </pre>
          </div>
        </Card>
      )}

      {/* Slides */}
      {slides.length > 0 && slides.some((s: string) => s.trim()) && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📑 Slides ({slides.length})</h3>
          <div className="space-y-3">
            {slides.map((slide: string, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <span className="text-xs font-medium text-blue-600 uppercase mb-1 block">
                  Slide {i + 1}
                </span>
                <p className="text-sm text-gray-700">{slide}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legenda */}
      {conteudo.legenda && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📱 Legenda</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {conteudo.legenda}
            </pre>
          </div>
        </Card>
      )}

      {/* Prompts AI */}
      {(promptsImagem.length > 0 || promptsVideo.length > 0) && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 Prompts de IA</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promptsImagem.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <ImageIcon className="w-4 h-4 mr-2" /> Prompt de Imagem
                </h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-blue-800 font-mono">
                    {promptsImagem[0]}
                  </pre>
                </div>
              </div>
            )}
            {promptsVideo.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2" /> Prompt de Vídeo
                </h4>
                <div className="bg-purple-50 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-purple-800 font-mono">
                    {promptsVideo[0]}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Mídia */}
      {mediaUrls.length > 0 && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📎 Mídia ({mediaUrls.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaUrls.map((url: string, i: number) => (
              <div key={i} className="border rounded-lg overflow-hidden bg-white">
                {isImage(url) ? (
                  <img src={url} alt={`Mídia ${i + 1}`} className="w-full h-48 object-cover" />
                ) : isVideo(url) ? (
                  <video src={url} controls className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <File className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Arquivo {i + 1}</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
