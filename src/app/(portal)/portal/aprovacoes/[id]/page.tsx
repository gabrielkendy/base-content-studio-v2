'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Calendar, Download, CheckCircle,
  AlertTriangle, Image as ImageIcon, Video, File,
  ExternalLink, Hash
} from 'lucide-react'
import Link from 'next/link'
import { normalizeStatus } from '@/lib/utils'
import type { Conteudo, Cliente } from '@/types/database'

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

const CANAIS: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📷' },
  facebook: { label: 'Facebook', icon: '📘' },
  tiktok: { label: 'TikTok', icon: '🎵' },
  youtube: { label: 'YouTube', icon: '🔴' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
  twitter: { label: 'Twitter/X', icon: '🐦' },
}

export default function AprovacaoDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { org, member } = useAuth()
  const { toast } = useToast()

  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resultado, setResultado] = useState<'aprovado' | 'ajuste' | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, id])

  async function loadData() {
    const { data, error } = await db.select('conteudos', {
      select: '*, empresa:clientes(*)',
      filters: [{ op: 'eq', col: 'id', val: id }],
      single: true,
    })

    if (error || !data) {
      setLoading(false)
      return
    }

    const normalized = { ...data, status: normalizeStatus(data.status) }
    setConteudo(normalized)
    setCliente((data as any).empresa)
    setLoading(false)
  }

  async function handleApproval(aprovado: boolean) {
    if (!aprovado && !comentario.trim()) {
      toast('Descreva os ajustes necessários', 'error')
      return
    }

    setSubmitting(true)

    try {
      // Atualizar status do conteúdo
      const newStatus = aprovado ? 'aprovado' : 'ajuste'
      const { error } = await db.update('conteudos', {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }, { id })

      if (error) throw new Error(error)

      // Criar registro de aprovação
      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      await db.insert('aprovacoes_links', {
        conteudo_id: id,
        empresa_id: conteudo?.empresa_id,
        token,
        status: aprovado ? 'aprovado' : 'ajuste',
        comentario_cliente: comentario || null,
        cliente_nome: member?.display_name || null,
        aprovado_em: aprovado ? new Date().toISOString() : null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      // Tentar disparar webhook
      try {
        await fetch('/api/webhooks/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: org!.id,
            event_type: aprovado ? 'content.approved' : 'content.revision_requested',
            data: {
              conteudo_id: id,
              titulo: conteudo?.titulo,
              status: newStatus,
              comentario: comentario || null,
              cliente_nome: member?.display_name,
              empresa: cliente?.nome,
            }
          }),
        })
      } catch {} // Webhook é best-effort

      setResultado(aprovado ? 'aprovado' : 'ajuste')
      setSubmitted(true)
      toast(aprovado ? 'Conteúdo aprovado! 🎉' : 'Ajustes solicitados!', 'success')
    } catch (err: any) {
      toast(`Erro: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function downloadAll() {
    if (!conteudo?.midia_urls?.length) return
    setDownloading(true)

    try {
      const urls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : JSON.parse(conteudo.midia_urls as any)
      for (let i = 0; i < urls.length; i++) {
        const response = await fetch(urls[i])
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${conteudo.titulo || 'media'}-${i + 1}.${urls[i].split('.').pop()?.split('?')[0] || 'jpg'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 500))
      }
    } catch {
      toast('Erro ao baixar arquivos', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

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
        <Link href="/portal/aprovacoes" className="text-blue-600 hover:underline">← Voltar</Link>
      </div>
    )
  }

  // Success screen
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6 animate-fade-in">
        <div className="text-6xl">{resultado === 'aprovado' ? '🎉' : '📝'}</div>
        <h2 className="text-2xl font-bold text-gray-900">
          {resultado === 'aprovado' ? 'Conteúdo Aprovado!' : 'Ajustes Solicitados'}
        </h2>
        <p className="text-gray-500">
          {resultado === 'aprovado'
            ? 'O conteúdo será agendado para publicação.'
            : 'A equipe recebeu seus comentários e fará os ajustes.'}
        </p>
        {comentario && (
          <Card>
            <CardContent className="py-4 text-left">
              <p className="text-sm font-medium text-gray-700 mb-1">Seu comentário:</p>
              <p className="text-sm text-gray-600">{comentario}</p>
            </CardContent>
          </Card>
        )}
        <Button variant="primary" onClick={() => router.push('/portal/aprovacoes')}>
          ← Voltar às aprovações
        </Button>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const slides = Array.isArray(conteudo.slides) ? conteudo.slides : []
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []
  const mediaUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
  const promptsImg = Array.isArray(conteudo.prompts_imagem) ? conteudo.prompts_imagem : []
  const promptsVid = Array.isArray(conteudo.prompts_video) ? conteudo.prompts_video : []
  const jaAprovado = ['aprovado', 'agendado', 'publicado'].includes(conteudo.status)
  const pedidoAjuste = conteudo.status === 'ajuste'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/portal/aprovacoes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Voltar às aprovações
      </Link>

      {/* Header */}
      <div className="text-center pb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg"
          style={{ backgroundColor: primaria }}
        >
          {cliente?.nome?.charAt(0) || 'B'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{conteudo.titulo || 'Sem título'}</h1>
        <div className="flex items-center justify-center gap-3 mt-2 text-sm text-gray-500">
          <span>{TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}</span>
          {conteudo.data_publicacao && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(conteudo.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
            </>
          )}
          {conteudo.badge && (
            <>
              <span>·</span>
              <Badge className="bg-purple-100 text-purple-800">
                <Hash className="w-3 h-3 mr-0.5" />{conteudo.badge}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {jaAprovado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-green-800 font-medium">Este conteúdo já foi aprovado</p>
        </div>
      )}
      {pedidoAjuste && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-orange-800 font-medium">Ajustes foram solicitados para este conteúdo</p>
        </div>
      )}

      {/* Canais */}
      {canais.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
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

      {/* Descrição */}
      {conteudo.descricao && (
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 Descrição / Narrativa</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{conteudo.descricao}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slides */}
      {slides.length > 0 && slides.some(s => s?.trim()) && (
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📑 Slides ({slides.filter(s => s?.trim()).length})</h3>
            <div className="space-y-2">
              {slides.filter(s => s?.trim()).map((slide: string, i: number) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                  <span className="text-[10px] font-medium text-blue-500 uppercase">Slide {i + 1}</span>
                  <p className="text-sm text-gray-700 mt-1">{slide}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      {conteudo.legenda && (
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📱 Legenda</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{conteudo.legenda}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompts IA */}
      {(promptsImg.length > 0 || promptsVid.length > 0) && (
        <Card>
          <CardContent className="py-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🤖 Prompts de IA</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {promptsImg.filter(Boolean).map((p: string, i: number) => (
                <div key={`img-${i}`} className="bg-blue-50 rounded-lg p-3">
                  <span className="text-[10px] font-medium text-blue-600 uppercase flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Imagem
                  </span>
                  <pre className="whitespace-pre-wrap text-xs text-blue-800 font-mono mt-1">{p}</pre>
                </div>
              ))}
              {promptsVid.filter(Boolean).map((p: string, i: number) => (
                <div key={`vid-${i}`} className="bg-purple-50 rounded-lg p-3">
                  <span className="text-[10px] font-medium text-purple-600 uppercase flex items-center gap-1">
                    <Video className="w-3 h-3" /> Vídeo
                  </span>
                  <pre className="whitespace-pre-wrap text-xs text-purple-800 font-mono mt-1">{p}</pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mídia */}
      {mediaUrls.length > 0 && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">📎 Mídia ({mediaUrls.length})</h3>
              <Button size="sm" variant="outline" onClick={downloadAll} disabled={downloading}>
                <Download className="w-4 h-4" /> {downloading ? 'Baixando...' : 'Baixar tudo'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {mediaUrls.map((url: string, i: number) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {isImage(url) ? (
                    <img src={url} alt={`Mídia ${i + 1}`} className="w-full h-40 object-cover" />
                  ) : isVideo(url) ? (
                    <video src={url} controls className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center">
                      <File className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Arquivo {i + 1}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de aprovação */}
      {conteudo.status === 'aprovacao' && (
        <Card className="border-2 border-blue-200">
          <CardContent className="py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ Sua Aprovação</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentários
                <span className="text-xs text-gray-400 ml-1">(obrigatório para ajustes)</span>
              </label>
              <Textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={4}
                placeholder="Observações, sugestões, feedback..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleApproval(true)}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Enviando...' : 'Aprovar Conteúdo'}
              </Button>
              <Button
                onClick={() => handleApproval(false)}
                disabled={submitting}
                variant="outline"
                className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50 py-3 text-base font-medium"
              >
                <AlertTriangle className="w-5 h-5" />
                Solicitar Ajustes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
