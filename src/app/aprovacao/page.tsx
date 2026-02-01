'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  Hash
} from 'lucide-react'
import type { Conteudo, Cliente } from '@/types/database'
import { Suspense } from 'react'

const TIPO_EMOJI = {
  carrossel: '📸',
  post: '📝', 
  stories: '📖',
  reels: '🎬',
  igtv: '📺',
  feed: '🏠'
}

const CANAIS = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube', icon: '🔴' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' }
]

function AprovacaoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [status, setStatus] = useState<string>('pendente')
  const [comentario, setComentario] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [expired, setExpired] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!token) return
    async function load() {
      const { data: aprovacao, error } = await supabase
        .from('aprovacoes_links')
        .select('*, conteudo:conteudos(*), empresa:clientes(*)')
        .eq('token', token)
        .single()

      if (error || !aprovacao) { 
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
      
      if (new Date(aprovacao.expires_at) < new Date()) { 
        setExpired(true) 
        setLoading(false) 
        return 
      }

      setConteudo((aprovacao as any).conteudo)
      setCliente((aprovacao as any).empresa)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSubmit(aprovado: boolean) {
    if (!aprovado && !comentario.trim()) {
      alert('Por favor, descreva os ajustes necessários.')
      return
    }

    const newStatus = aprovado ? 'aprovado' : 'ajuste'
    
    try {
      const { error } = await supabase.from('aprovacoes_links').update({
        status: newStatus,
        comentario_cliente: comentario || null,
        cliente_nome: nomeCliente || null,
        aprovado_em: aprovado ? new Date().toISOString() : null,
      }).eq('token', token!)

      if (error) throw error

      // Update content status
      if (conteudo) {
        const { error: contentError } = await supabase.from('conteudos').update({
          status: aprovado ? 'aprovado_agendado' : 'ajustes',
          updated_at: new Date().toISOString()
        }).eq('id', conteudo.id)

        if (contentError) throw contentError
      }

      setSubmitted(true)
      setStatus(newStatus)
    } catch (error) {
      console.error('Erro ao enviar aprovação:', error)
      alert(`Erro ao enviar aprovação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const downloadAllMedia = async () => {
    if (!conteudo?.midia_urls || conteudo.midia_urls.length === 0) return

    setDownloading(true)
    
    try {
      const mediaUrls = typeof conteudo.midia_urls === 'string' 
        ? JSON.parse(conteudo.midia_urls) 
        : conteudo.midia_urls

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
        
        // Small delay between downloads
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
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getMediaIcon = (url: string) => {
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon className="w-4 h-4" />
    if (url.match(/\.(mp4|webm|mov)$/i)) return <Video className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const isImage = (url: string) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isVideo = (url: string) => url.match(/\.(mp4|webm|mov)$/i)

  if (!token) return <ErrorState msg="Link inválido ou não fornecido" />
  if (loading) return <LoadingState />
  if (expired) return <ErrorState msg="Este link expirou ou é inválido" />

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl">
            {status === 'aprovado' ? '🎉' : '📝'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'aprovado' ? 'Conteúdo Aprovado!' : 'Ajustes Solicitados'}
            </h2>
            <p className="text-gray-600">
              {status === 'aprovado'
                ? 'Obrigado pela aprovação! O conteúdo será agendado para publicação.'
                : 'Seus comentários foram enviados para a equipe e os ajustes serão feitos.'}
            </p>
          </div>
          
          {comentario && (
            <div className="bg-gray-100 p-4 rounded-lg text-left">
              <p className="text-sm font-medium text-gray-700 mb-1">Seu comentário:</p>
              <p className="text-sm text-gray-600">{comentario}</p>
            </div>
          )}
          
          <div className="pt-4">
            <p className="text-xs text-gray-400">
              Resposta enviada em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'
  const slides = typeof conteudo?.slides === 'string' 
    ? JSON.parse(conteudo.slides || '[]') 
    : conteudo?.slides || []
  const canais = typeof conteudo?.canais === 'string' 
    ? JSON.parse(conteudo.canais || '[]') 
    : conteudo?.canais || []
  const mediaUrls = typeof conteudo?.midia_urls === 'string' 
    ? JSON.parse(conteudo.midia_urls || '[]') 
    : conteudo?.midia_urls || []
  const prompts_imagem = typeof conteudo?.prompts_imagem === 'string' 
    ? JSON.parse(conteudo.prompts_imagem || '[]') 
    : conteudo?.prompts_imagem || []
  const prompts_video = typeof conteudo?.prompts_video === 'string' 
    ? JSON.parse(conteudo.prompts_video || '[]') 
    : conteudo?.prompts_video || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center py-8 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: primaria }}
          >
            {cliente?.nome?.charAt(0) || 'B'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{cliente?.nome}</h1>
          <p className="text-gray-600">Aprovação de Conteúdo</p>
        </div>

        {conteudo && (
          <div className="space-y-6">
            {/* Conteúdo Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className="bg-blue-100 text-blue-800">
                      {TIPO_EMOJI[conteudo.tipo as keyof typeof TIPO_EMOJI]} {conteudo.tipo}
                    </Badge>
                    {conteudo.badge && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Hash className="w-3 h-3 mr-1" />
                        {conteudo.badge}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {conteudo.titulo || 'Sem título'}
                  </h2>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Publicação: {formatDate(conteudo.data_publicacao)}</span>
                  </div>
                </div>

                {mediaUrls.length > 0 && (
                  <Button
                    onClick={downloadAllMedia}
                    disabled={downloading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? 'Baixando...' : `Baixar Mídia (${mediaUrls.length})`}
                  </Button>
                )}
              </div>

              {/* Canais */}
              {canais.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-gray-700">Canais:</span>
                  {canais.map((canalId: string) => {
                    const canal = CANAIS.find(c => c.id === canalId)
                    return canal ? (
                      <Badge key={canalId} className="bg-gray-100 text-gray-800">
                        {canal.icon} {canal.label}
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </Card>

            {/* Descrição */}
            {conteudo.descricao && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  📝 Descrição/Narrativa
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {conteudo.descricao}
                  </pre>
                </div>
              </Card>
            )}

            {/* Slides */}
            {slides.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  📑 Slides ({slides.length})
                </h3>
                <div className="space-y-3">
                  {slides.map((slide: string, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-600 uppercase">
                          Slide {index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{slide}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Legenda */}
            {conteudo.legenda && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  📱 Legenda para Publicação
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {conteudo.legenda}
                  </pre>
                </div>
              </Card>
            )}

            {/* Prompts AI */}
            {(prompts_imagem.length > 0 || prompts_video.length > 0) && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  🤖 Prompts de IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prompts_imagem.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Prompt de Imagem
                      </h4>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-xs text-blue-800 font-mono">
                          {prompts_imagem[0]}
                        </pre>
                      </div>
                    </div>
                  )}
                  {prompts_video.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Video className="w-4 h-4 mr-2" />
                        Prompt de Vídeo
                      </h4>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-xs text-purple-800 font-mono">
                          {prompts_video[0]}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Mídia */}
            {mediaUrls.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    📎 Arquivos de Mídia ({mediaUrls.length})
                  </h3>
                  <Button
                    onClick={downloadAllMedia}
                    disabled={downloading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading ? 'Baixando...' : 'Baixar Todos'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaUrls.map((url: string, index: number) => (
                    <div key={index} className="border rounded-lg overflow-hidden bg-white">
                      {isImage(url) ? (
                        <img 
                          src={url} 
                          alt={`Mídia ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                      ) : isVideo(url) ? (
                        <video 
                          src={url}
                          controls
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <File className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          {getMediaIcon(url)}
                          <span className="ml-2">Arquivo {index + 1}</span>
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Formulário de Aprovação */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                ✅ Sua Aprovação
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seu nome (opcional)
                  </label>
                  <Input
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Como você gostaria de ser identificado?"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentários
                    <span className="text-xs text-gray-500 ml-1">
                      (opcional para aprovação, obrigatório para ajustes)
                    </span>
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Adicione observações, sugestões de ajuste ou feedback..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => handleSubmit(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aprovar Conteúdo
                  </Button>
                  <Button
                    onClick={() => handleSubmit(false)}
                    variant="outline"
                    className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 py-3 text-lg font-medium"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Solicitar Ajustes
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
