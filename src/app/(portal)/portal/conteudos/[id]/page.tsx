'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, ArrowRight, Calendar, Download, CheckCircle,
  AlertTriangle, Copy, ChevronLeft, ChevronRight,
  ExternalLink, Hash, MessageSquare
} from 'lucide-react'
import Link from 'next/link'
import { normalizeStatus } from '@/lib/utils'
import type { Conteudo, Cliente, AprovacaoLink } from '@/types/database'

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' | 'info' }> = {
  nova_solicitacao: { label: 'Solicitação', variant: 'default' },
  rascunho: { label: 'Rascunho', variant: 'default' },
  producao: { label: 'Produção', variant: 'info' },
  aprovacao: { label: 'Aguardando aprovação', variant: 'warning' },
  ajuste: { label: 'Ajuste solicitado', variant: 'danger' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  agendado: { label: 'Agendado', variant: 'success' },
  publicado: { label: 'Publicado', variant: 'success' },
}

const CANAIS: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📷' },
  facebook: { label: 'Facebook', icon: '📘' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  youtube: { label: 'YouTube', icon: '🔴' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
  twitter: { label: 'Twitter/X', icon: '🐦' },
}

export default function ConteudoDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { org, member } = useAuth()
  const { toast } = useToast()

  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [aprovacoes, setAprovacoes] = useState<AprovacaoLink[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [comentario, setComentario] = useState('')
  const [showAjuste, setShowAjuste] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, id])

  async function loadData() {
    const [contRes, apvRes] = await Promise.all([
      db.select('conteudos', {
        select: '*, empresa:clientes(*)',
        filters: [{ op: 'eq', col: 'id', val: id }],
        single: true,
      }),
      db.select('aprovacoes_links', {
        filters: [{ op: 'eq', col: 'conteudo_id', val: id }],
        order: [{ col: 'created_at', asc: false }],
      }),
    ])

    if (contRes.data) {
      const normalized = { ...contRes.data, status: normalizeStatus(contRes.data.status) }
      setConteudo(normalized)
      setCliente((contRes.data as any).empresa)
    }
    setAprovacoes((apvRes.data as any) || [])
    setLoading(false)
  }

  const mediaUrls = conteudo ? (Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []) : []

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

  const nextSlide = useCallback(() => {
    if (mediaUrls.length > 0) setCurrentSlide(prev => (prev + 1) % mediaUrls.length)
  }, [mediaUrls.length])

  const prevSlide = useCallback(() => {
    if (mediaUrls.length > 0) setCurrentSlide(prev => prev === 0 ? mediaUrls.length - 1 : prev - 1)
  }, [mediaUrls.length])

  async function handleAprovar() {
    setSubmitting(true)
    try {
      await db.update('conteudos', {
        status: 'aprovado',
        updated_at: new Date().toISOString(),
      }, { id })

      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      await db.insert('aprovacoes_links', {
        conteudo_id: id,
        empresa_id: conteudo?.empresa_id,
        token,
        status: 'aprovado',
        comentario_cliente: null,
        cliente_nome: member?.display_name || null,
        aprovado_em: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      toast('Conteúdo aprovado! 🎉', 'success')
      loadData()
    } catch (err: any) {
      toast(`Erro: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAjuste() {
    if (!comentario.trim()) {
      toast('Descreva os ajustes necessários', 'error')
      return
    }
    setSubmitting(true)
    try {
      await db.update('conteudos', {
        status: 'ajuste',
        updated_at: new Date().toISOString(),
      }, { id })

      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      await db.insert('aprovacoes_links', {
        conteudo_id: id,
        empresa_id: conteudo?.empresa_id,
        token,
        status: 'ajuste',
        comentario_cliente: comentario,
        cliente_nome: member?.display_name || null,
        aprovado_em: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      toast('Ajustes solicitados!', 'success')
      setShowAjuste(false)
      setComentario('')
      loadData()
    } catch (err: any) {
      toast(`Erro: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function downloadAll() {
    if (!mediaUrls.length) return
    setDownloading(true)
    try {
      for (let i = 0; i < mediaUrls.length; i++) {
        const response = await fetch(mediaUrls[i])
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${conteudo?.titulo || 'media'}-${i + 1}.${mediaUrls[i].split('.').pop()?.split('?')[0] || 'jpg'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 500))
      }
      toast('Downloads concluídos!', 'success')
    } catch {
      toast('Erro ao baixar arquivos', 'error')
    } finally {
      setDownloading(false)
    }
  }

  function copyLegenda() {
    if (conteudo?.legenda) {
      navigator.clipboard.writeText(conteudo.legenda)
      setCopied(true)
      toast('Legenda copiada!', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!conteudo) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Conteúdo não encontrado</h2>
        <Link href="/portal/conteudos" className="text-blue-600 hover:underline">← Voltar</Link>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []
  const st = STATUS_CONFIG[conteudo.status]
  const canApprove = conteudo.status === 'aprovacao'
  const ajusteHistory = aprovacoes.filter(a => a.status === 'ajuste' && a.comentario_cliente)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/portal/conteudos" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Voltar aos conteúdos
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0"
          style={{ backgroundColor: primaria }}
        >
          {cliente?.nome?.charAt(0) || 'B'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{conteudo.titulo || 'Sem título'}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant={st?.variant || 'default'}>{st?.label || conteudo.status}</Badge>
            <span className="text-sm text-gray-500">{TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}</span>
            {conteudo.data_publicacao && (
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(conteudo.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Canais */}
      {canais.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {canais.map((ch: string) => {
            const canal = CANAIS[ch]
            return canal ? (
              <Badge key={ch} className="bg-gray-100 text-gray-700">
                {canal.icon} {canal.label}
              </Badge>
            ) : null
          })}
        </div>
      )}

      {/* Media Carousel */}
      {mediaUrls.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="relative bg-gray-900">
            <div className="relative h-72 sm:h-96 flex items-center justify-center overflow-hidden">
              {isImage(mediaUrls[currentSlide]) ? (
                <img
                  src={mediaUrls[currentSlide]}
                  alt={`Mídia ${currentSlide + 1}`}
                  className="max-w-full max-h-full object-contain transition-opacity duration-300"
                />
              ) : isVideo(mediaUrls[currentSlide]) ? (
                <video
                  src={mediaUrls[currentSlide]}
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <ExternalLink className="w-12 h-12 mx-auto mb-2" />
                  <a href={mediaUrls[currentSlide]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                    Abrir arquivo
                  </a>
                </div>
              )}

              {/* Navigation arrows */}
              {mediaUrls.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Position indicators */}
            {mediaUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {mediaUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentSlide ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Counter */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
              {currentSlide + 1} / {mediaUrls.length}
            </div>
          </div>
        </Card>
      )}

      {/* Legenda */}
      {conteudo.legenda && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">📱 Legenda</h3>
              <button
                onClick={copyLegenda}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copiada!' : 'Copiar'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{conteudo.legenda}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">{TIPO_EMOJI[conteudo.tipo] || '📄'}</div>
          <div className="text-xs text-gray-500">Tipo</div>
          <div className="text-sm font-medium text-gray-900 capitalize">{conteudo.tipo}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-xs text-gray-500">Status</div>
          <div className="text-sm font-medium text-gray-900">{st?.label || conteudo.status}</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">📅</div>
          <div className="text-xs text-gray-500">Publicação</div>
          <div className="text-sm font-medium text-gray-900">
            {conteudo.data_publicacao
              ? new Date(conteudo.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              : '—'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">📎</div>
          <div className="text-xs text-gray-500">Mídias</div>
          <div className="text-sm font-medium text-gray-900">{mediaUrls.length}</div>
        </div>
      </div>

      {/* Action Buttons */}
      {(canApprove || mediaUrls.length > 0) && (
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/30 to-indigo-50/30">
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Ações</h3>
            <div className="flex flex-wrap gap-3">
              {canApprove && (
                <Button
                  onClick={handleAprovar}
                  disabled={submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Enviando...' : '✅ Aprovar'}
                </Button>
              )}
              {canApprove && (
                <Button
                  onClick={() => setShowAjuste(!showAjuste)}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  ✏️ Pedir Ajuste
                </Button>
              )}
              {mediaUrls.length > 0 && (
                <Button
                  onClick={downloadAll}
                  disabled={downloading}
                  variant="outline"
                >
                  <Download className="w-4 h-4" />
                  📥 {downloading ? 'Baixando...' : 'Baixar Tudo'}
                </Button>
              )}
            </div>

            {/* Ajuste textarea */}
            {showAjuste && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <Textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  rows={4}
                  placeholder="Descreva os ajustes necessários..."
                  className="border-orange-200 focus:border-orange-400"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAjuste}
                    disabled={submitting}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Ajustes'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowAjuste(false); setComentario('') }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {ajusteHistory.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Histórico de Ajustes
            </h3>
            <div className="space-y-3">
              {ajusteHistory.map((a, i) => (
                <div key={a.id} className="relative pl-6 pb-3 border-l-2 border-orange-200 last:border-0">
                  <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-orange-400" />
                  <div className="text-xs text-gray-400 mb-1">
                    {a.cliente_nome || 'Cliente'} · {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700 bg-orange-50 rounded-lg p-3">
                    {a.comentario_cliente}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
