'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Download, 
  Image as ImageIcon,
  Video,
  File,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Hash,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'
import type { Conteudo, Cliente } from '@/types/database'
import { TIPO_EMOJI, CANAIS as CANAIS_CONFIG } from '@/lib/utils'

const CANAIS = CANAIS_CONFIG.map(c => ({ id: c.id, label: c.label, icon: c.icon }))

// --- Image Carousel Component ---
function MediaCarousel({ urls, titulo }: { urls: string[]; titulo?: string | null }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [aspectRatios, setAspectRatios] = useState<Record<number, 'landscape' | 'portrait' | 'square'>>({})
  
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

  // Detect aspect ratio when media loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    const img = e.currentTarget
    const ratio = img.naturalWidth / img.naturalHeight
    let orientation: 'landscape' | 'portrait' | 'square' = 'square'
    if (ratio > 1.2) orientation = 'landscape'
    else if (ratio < 0.8) orientation = 'portrait'
    setAspectRatios(prev => ({ ...prev, [index]: orientation }))
  }

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>, index: number) => {
    const video = e.currentTarget
    const ratio = video.videoWidth / video.videoHeight
    let orientation: 'landscape' | 'portrait' | 'square' = 'square'
    if (ratio > 1.2) orientation = 'landscape'
    else if (ratio < 0.8) orientation = 'portrait'
    setAspectRatios(prev => ({ ...prev, [index]: orientation }))
  }

  const goTo = (index: number) => {
    if (index < 0) setCurrentIndex(urls.length - 1)
    else if (index >= urls.length) setCurrentIndex(0)
    else setCurrentIndex(index)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(currentIndex + 1)
      else goTo(currentIndex - 1)
    }
    setTouchStart(null)
  }

  const downloadSingle = async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const dlUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = dlUrl
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg'
      a.download = `${titulo || 'media'}-${index + 1}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(dlUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  if (urls.length === 0) return null

  const currentUrl = urls[currentIndex]
  const currentAspect = aspectRatios[currentIndex] || 'square'
  
  // Dynamic aspect ratio classes
  const aspectClass = currentAspect === 'portrait' 
    ? 'aspect-[9/16] max-w-sm mx-auto' 
    : currentAspect === 'landscape' 
      ? 'aspect-video' 
      : 'aspect-square max-w-md mx-auto'

  return (
    <div className="space-y-4">
      {/* Main viewer */}
      <div 
        className="relative bg-gray-900 rounded-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative flex items-center justify-center transition-all duration-300 ${aspectClass}`}>
          {isImage(currentUrl) ? (
            <img
              src={currentUrl}
              alt={`Mídia ${currentIndex + 1}`}
              className="w-full h-full object-contain"
              onLoad={(e) => handleImageLoad(e, currentIndex)}
            />
          ) : isVideo(currentUrl) ? (
            <video
              key={currentUrl}
              src={currentUrl}
              controls
              className="w-full h-full object-contain"
              playsInline
              onLoadedMetadata={(e) => handleVideoLoad(e, currentIndex)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <File className="w-16 h-16 mb-2" />
              <span className="text-sm">Arquivo {currentIndex + 1}</span>
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={() => goTo(currentIndex - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {urls.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {currentIndex + 1} / {urls.length}
          </div>
        )}

        {/* Download single */}
        <button
          onClick={() => downloadSingle(currentUrl, currentIndex)}
          className="absolute bottom-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
          title="Baixar este arquivo"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Dot indicators */}
      {urls.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`transition-all rounded-full ${
                i === currentIndex 
                  ? 'w-8 h-2.5 bg-blue-600' 
                  : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 px-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === currentIndex ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 opacity-60 hover:opacity-100'
              }`}
            >
              {isImage(url) ? (
                <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
              ) : isVideo(url) ? (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <File className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Copy Legenda Button ---
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        copied 
          ? 'bg-green-100 text-green-700' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copiada!' : 'Copiar Legenda'}
    </button>
  )
}

function AprovacaoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [status, setStatus] = useState<string>('pendente')
  const [comentario, setComentario] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [expired, setExpired] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    async function load() {
      try {
        const res = await fetch(`/api/public/aprovacao?token=${encodeURIComponent(token!)}`)
        
        if (res.status === 410) {
          setExpired(true)
          setLoading(false)
          return
        }
        
        if (!res.ok) {
          setExpired(true)
          setLoading(false)
          return
        }

        const { data: aprovacao } = await res.json()

        if (!aprovacao) { 
          setExpired(true) 
          setLoading(false) 
          return 
        }
        
        if (aprovacao.status !== 'pendente') { 
          setSubmitted(true) 
          setStatus(aprovacao.status)
          setComentario(aprovacao.comentario_cliente || '')
          setNomeCliente(aprovacao.cliente_nome || '')
          setLoading(false) 
          return 
        }

        setConteudo((aprovacao as any).conteudo)
        setCliente((aprovacao as any).empresa)
        setLoading(false)
      } catch {
        setExpired(true)
        setLoading(false)
      }
    }
    load()
  }, [token])

  async function handleSubmit(aprovado: boolean) {
    // Validação para ajustes
    const comentarioTrimmed = comentario.trim()
    if (!aprovado && !comentarioTrimmed) {
      alert('Por favor, descreva os ajustes necessários no campo de comentários.')
      return
    }

    // Prevenir duplo clique
    if (submitting) return
    setSubmitting(true)

    const newStatus = aprovado ? 'aprovado' : 'ajuste'
    
    try {
      const res = await fetch('/api/public/aprovacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token!,
          status: newStatus,
          comentario: comentarioTrimmed || null,
          cliente_nome: nomeCliente.trim() || null,
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        // Mensagens de erro mais claras
        if (res.status === 409) {
          alert('Este link já foi utilizado. Se precisar fazer mais alterações, solicite um novo link.')
          setSubmitted(true)
          setStatus('usado')
          return
        }
        if (res.status === 410) {
          alert('Este link expirou. Solicite um novo link para aprovação.')
          setExpired(true)
          return
        }
        throw new Error(data.error || 'Erro ao enviar. Tente novamente.')
      }

      setSubmitted(true)
      setStatus(newStatus)
    } catch (error) {
      console.error('Erro ao enviar aprovação:', error)
      alert(`Erro ao enviar: ${error instanceof Error ? error.message : 'Erro de conexão. Verifique sua internet e tente novamente.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const downloadAllMedia = async () => {
    if (!conteudo?.midia_urls || conteudo.midia_urls.length === 0) return

    setDownloading(true)
    
    try {
      const mediaUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []

      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i]
        const filename = `${conteudo.titulo || 'media'}-${i + 1}.${url.split('.').pop()?.split('?')[0] || 'jpg'}`
        
        const response = await fetch(url)
        const blob = await response.blob()
        
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error('Erro ao baixar mídia:', error)
      alert('Erro ao baixar arquivos. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Data não definida'
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (!token) return <ErrorState msg="Link inválido ou não fornecido" />
  if (loading) return <LoadingState />
  if (expired) return <ErrorState msg="Este link expirou ou é inválido" />

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="text-7xl">
            {status === 'aprovado' ? '🎉' : '📝'}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {status === 'aprovado' ? 'Conteúdo Aprovado!' : 'Ajustes Solicitados'}
            </h2>
            <p className="text-lg text-gray-600">
              {status === 'aprovado'
                ? 'Obrigado pela aprovação! O conteúdo será agendado para publicação.'
                : 'Seus comentários foram enviados para a equipe e os ajustes serão feitos.'}
            </p>
          </div>
          
          {comentario && (
            <div className="bg-gray-100 p-5 rounded-xl text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">Seu comentário:</p>
              <p className="text-gray-600">{comentario}</p>
            </div>
          )}
          
          <div className="pt-4">
            <p className="text-sm text-gray-400">
              Resposta enviada em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const slides = Array.isArray(conteudo?.slides) ? conteudo.slides : []
  const canais = Array.isArray(conteudo?.canais) ? conteudo.canais : []
  const mediaUrls = Array.isArray(conteudo?.midia_urls) ? conteudo.midia_urls : []
  const prompts_imagem = Array.isArray(conteudo?.prompts_imagem) ? conteudo.prompts_imagem : []
  const prompts_video = Array.isArray(conteudo?.prompts_video) ? conteudo.prompts_video : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
        {/* Header with client branding */}
        <div className="text-center py-8 mb-6">
          {cliente?.logo_url ? (
            <img 
              src={cliente.logo_url} 
              alt={cliente.nome} 
              className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover shadow-lg"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: primaria }}
            >
              {cliente?.nome?.charAt(0) || 'B'}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{cliente?.nome}</h1>
          <p className="text-gray-500 text-lg">Aprovação de Conteúdo</p>
        </div>

        {conteudo && (
          <div className="space-y-6">
            {/* Content Info Card */}
            <Card className="p-6 md:p-8">
              <div className="space-y-4">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                    {TIPO_EMOJI[conteudo.tipo as keyof typeof TIPO_EMOJI]} {conteudo.tipo}
                  </Badge>
                  {conteudo.badge && (
                    <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                      <Hash className="w-3.5 h-3.5 mr-1" />
                      {conteudo.badge}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {conteudo.titulo || 'Sem título'}
                </h2>
                
                {/* Date */}
                <div className="flex items-center text-gray-500 text-base">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>Publicação: {formatDate(conteudo.data_publicacao)}</span>
                </div>

                {/* Canais */}
                {canais.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-sm font-medium text-gray-600">Canais:</span>
                    {canais.map((canalId: string) => {
                      const canal = CANAIS.find(c => c.id === canalId)
                      return canal ? (
                        <Badge key={canalId} className="bg-gray-100 text-gray-700 text-sm">
                          {canal.icon} {canal.label}
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}

                {/* Download all button */}
                {mediaUrls.length > 0 && (
                  <div className="pt-2">
                    <Button
                      onClick={downloadAllMedia}
                      disabled={downloading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloading ? 'Baixando...' : `Baixar Todas as Mídias (${mediaUrls.length})`}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Media Carousel */}
            {mediaUrls.length > 0 && (
              <Card className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📎 Mídia {mediaUrls.length > 1 && `(${mediaUrls.length} arquivos)`}
                </h3>
                <MediaCarousel urls={mediaUrls} titulo={conteudo.titulo} />
              </Card>
            )}

            {/* Descrição */}
            {conteudo.descricao && (
              <Card className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  📝 Descrição / Narrativa
                </h3>
                <div className="bg-gray-50 rounded-xl p-5">
                  <pre className="whitespace-pre-wrap text-base text-gray-700 font-sans leading-relaxed">
                    {conteudo.descricao}
                  </pre>
                </div>
              </Card>
            )}

            {/* Slides */}
            {slides.length > 0 && slides.some((s: string) => s?.trim()) && (
              <Card className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📑 Slides ({slides.filter((s: string) => s?.trim()).length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slides.filter((s: string) => s?.trim()).map((slide: string, index: number) => (
                    <div 
                      key={index} 
                      className="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: primaria }}
                        >
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Slide {index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{slide}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Legenda */}
            {conteudo.legenda && (
              <Card className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    📱 Legenda para Publicação
                  </h3>
                  <CopyButton text={conteudo.legenda} />
                </div>
                <div className="bg-gray-50 rounded-xl p-5">
                  <pre className="whitespace-pre-wrap text-base text-gray-700 font-sans leading-relaxed">
                    {conteudo.legenda}
                  </pre>
                </div>
              </Card>
            )}

            {/* Prompts AI */}
            {(prompts_imagem.length > 0 || prompts_video.length > 0) && (
              <Card className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🤖 Prompts de IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prompts_imagem.filter(Boolean).map((p: string, i: number) => (
                    <div key={`img-${i}`}>
                      <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" /> Prompt de Imagem {prompts_imagem.length > 1 ? i + 1 : ''}
                      </h4>
                      <div className="bg-blue-50 rounded-xl p-4">
                        <pre className="whitespace-pre-wrap text-xs text-blue-800 font-mono">{p}</pre>
                      </div>
                    </div>
                  ))}
                  {prompts_video.filter(Boolean).map((p: string, i: number) => (
                    <div key={`vid-${i}`}>
                      <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                        <Video className="w-4 h-4" /> Prompt de Vídeo {prompts_video.length > 1 ? i + 1 : ''}
                      </h4>
                      <div className="bg-purple-50 rounded-xl p-4">
                        <pre className="whitespace-pre-wrap text-xs text-purple-800 font-mono">{p}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Approval Form */}
            <Card className="p-6 md:p-8 border-2" style={{ borderColor: `${primaria}30` }}>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                ✅ Sua Aprovação
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Seu nome (opcional)
                  </label>
                  <Input
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Como você gostaria de ser identificado?"
                    className="w-full text-base"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Comentários
                    <span className="text-xs text-gray-400 font-normal ml-2">
                      (opcional para aprovação, obrigatório para ajustes)
                    </span>
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    onBlur={(e) => setComentario(e.target.value)}
                    placeholder="Adicione observações, sugestões de ajuste ou feedback..."
                    rows={4}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    style={{ fontSize: '16px' }}
                  />
                  {comentario.trim() && (
                    <p className="text-xs text-green-600 mt-1">✓ Comentário preenchido</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    ) : (
                      <CheckCircle className="w-6 h-6 mr-2" />
                    )}
                    {submitting ? 'Enviando...' : '✅ Aprovar Conteúdo'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    variant="outline"
                    className="flex-1 border-2 border-orange-400 text-orange-600 hover:bg-orange-50 py-4 text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400 mr-2" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 mr-2" />
                    )}
                    {submitting ? 'Enviando...' : '📝 Pedir Ajuste'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="text-center py-8">
          <p className="text-xs text-gray-400">
            BASE Content Studio · Link válido por 30 dias
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando conteúdo...</p>
      </div>
    </div>
  )
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">❌</div>
        <h2 className="text-xl font-bold text-gray-900">{msg}</h2>
        <p className="text-gray-600 max-w-md">
          Este link pode ter expirado, sido usado ou ser inválido. 
          Entre em contato com a equipe para solicitar um novo link.
        </p>
      </div>
    </div>
  )
}

export default function AprovacaoPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AprovacaoContent />
    </Suspense>
  )
}
