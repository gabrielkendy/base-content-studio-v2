'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download, Image as ImageIcon, Video, File, ExternalLink,
  Calendar, Hash, CheckCircle, Package
} from 'lucide-react'
import type { Conteudo, Cliente } from '@/types/database'

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

function EntregaContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return }
    loadData()
  }, [token])

  async function loadData() {
    try {
      const res = await fetch(`/api/public/entrega?token=${encodeURIComponent(token!)}`)
      
      if (!res.ok) {
        setInvalid(true)
        setLoading(false)
        return
      }

      const { data: link } = await res.json()

      if (!link || !link.conteudo) {
        setInvalid(true)
        setLoading(false)
        return
      }

      setConteudo(link.conteudo as any)
      setCliente((link.conteudo as any).empresa)
      setLoading(false)
    } catch {
      setInvalid(true)
      setLoading(false)
    }
  }

  async function downloadAll() {
    if (!conteudo) return
    const urls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
    if (urls.length === 0) return

    setDownloading(true)
    try {
      for (let i = 0; i < urls.length; i++) {
        const response = await fetch(urls[i])
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const ext = urls[i].split('.').pop()?.split('?')[0] || 'jpg'
        a.download = `${cliente?.nome || 'entrega'}-${conteudo.titulo || 'arquivo'}-${i + 1}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 500))
      }
    } catch {
      alert('Erro ao baixar. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  async function downloadSingle(url: string, index: number) {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
      a.download = `${cliente?.nome || 'arquivo'}-${index + 1}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(dlUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (invalid || !conteudo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-xl font-bold text-gray-900">Link inválido</h2>
          <p className="text-gray-500 max-w-md">
            Este link pode ter expirado ou ser inválido. Entre em contato com a equipe.
          </p>
        </div>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const mediaUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
  const slides = Array.isArray(conteudo.slides) ? conteudo.slides : []
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center py-8 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: primaria }}
          >
            {cliente?.nome?.charAt(0) || 'B'}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{cliente?.nome}</h1>
          <p className="text-gray-500">Entrega de Material</p>
        </div>

        {/* Content info */}
        <Card className="mb-6">
          <CardContent className="py-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-800">
                    {TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}
                  </Badge>
                  {conteudo.badge && (
                    <Badge className="bg-purple-100 text-purple-800">
                      <Hash className="w-3 h-3 mr-0.5" />{conteudo.badge}
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Entregue
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{conteudo.titulo || 'Sem título'}</h2>
                {conteudo.data_publicacao && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    Publicação: {new Date(conteudo.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>

              {mediaUrls.length > 0 && (
                <Button
                  onClick={downloadAll}
                  disabled={downloading}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloading ? 'Baixando...' : `Baixar Tudo (${mediaUrls.length})`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legenda */}
        {conteudo.legenda && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                📱 Legenda para Publicação
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 relative group">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{conteudo.legenda}</pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(conteudo.legenda || ''); alert('Legenda copiada!') }}
                  className="absolute top-2 right-2 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  📋 Copiar
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Slides */}
        {slides.length > 0 && slides.some((s: string) => s?.trim()) && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📑 Textos dos Slides</h3>
              <div className="space-y-2">
                {slides.filter((s: string) => s?.trim()).map((slide: string, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <span className="text-[10px] font-medium text-blue-500 uppercase">Slide {i + 1}</span>
                    <p className="text-sm text-gray-700 mt-1">{slide}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mídia — principal */}
        {mediaUrls.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Arquivos ({mediaUrls.length})
                </h3>
                <Button size="sm" variant="outline" onClick={downloadAll} disabled={downloading}>
                  <Download className="w-4 h-4" /> {downloading ? 'Baixando...' : 'Baixar Todos'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaUrls.map((url: string, i: number) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    {isImage(url) ? (
                      <img src={url} alt={`Arquivo ${i + 1}`} className="w-full h-48 object-cover" />
                    ) : isVideo(url) ? (
                      <video src={url} controls className="w-full h-48 object-cover bg-black" />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center">
                        <File className="w-10 h-10 text-gray-300 mb-2" />
                        <span className="text-xs text-gray-400">Arquivo</span>
                      </div>
                    )}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {isImage(url) ? <ImageIcon className="w-4 h-4" /> : isVideo(url) ? <Video className="w-4 h-4" /> : <File className="w-4 h-4" />}
                        <span>Arquivo {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadSingle(url, i)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {mediaUrls.length === 0 && (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">Nenhum arquivo ainda</h3>
              <p className="text-sm text-gray-400 mt-1">Os arquivos serão adicionados pela equipe</p>
            </CardContent>
          </Card>
        )}

        {/* Descrição */}
        {conteudo.descricao && (
          <Card className="mb-6">
            <CardContent className="py-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 Briefing</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans bg-gray-50 rounded-lg p-4">{conteudo.descricao}</pre>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">
            BASE Content Studio · Material exclusivo
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )
}

export default function EntregaPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EntregaContent />
    </Suspense>
  )
}
