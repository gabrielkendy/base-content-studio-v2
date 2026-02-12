'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { CreationChat } from '@/components/factory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft, CheckCircle, XCircle, Download, Image as ImageIcon,
  Send, Calendar, Copy, ExternalLink, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import type { CreationQueueItem, CreationMessage, GeneratedContent } from '@/types/database'

export default function FactoryItemPage() {
  const params = useParams()
  const router = useRouter()
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [item, setItem] = useState<CreationQueueItem | null>(null)
  const [messages, setMessages] = useState<CreationMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const itemId = params.id as string

  useEffect(() => {
    loadItem()
  }, [itemId])

  async function loadItem() {
    setLoading(true)
    try {
      // In production, fetch from API
      // For now, create mock data
      const mockItem: CreationQueueItem = {
        id: itemId,
        tenant_id: 'mock',
        discovered_content_id: null,
        title: 'Conteúdo de exemplo - Creatina e Cognição',
        source_url: 'https://instagram.com/p/ABC123',
        source_handle: 'hubermanlab',
        source_platform: 'instagram',
        target_format: 'carrossel',
        target_slides: 10,
        framework: 'curiosidade',
        custom_instructions: null,
        cliente_id: null,
        status: 'review',
        generated_content: {
          slides: [
            { number: 1, type: 'hook', text: 'Você sabia que a creatina não é só pra músculo? 🧠' },
            { number: 2, type: 'content', text: 'Novos estudos mostram que 5g/dia pode melhorar sua função cognitiva em até 15%.' },
            { number: 3, type: 'content', text: 'Mas a indústria fitness te vendeu uma ideia incompleta sobre esse suplemento.' },
            { number: 4, type: 'content', text: 'A creatina aumenta os níveis de ATP no cérebro - a molécula de energia das suas células.' },
            { number: 5, type: 'content', text: 'Isso significa: mais foco, melhor memória, raciocínio mais rápido.' },
            { number: 6, type: 'content', text: 'E não, você não precisa fazer ciclos. O uso contínuo é seguro e recomendado.' },
            { number: 7, type: 'proof', text: 'Fonte: Journal of Neuroscience, 2026 - Estudo com 500 participantes por 12 semanas.' },
            { number: 8, type: 'content', text: 'A dose ideal: 3-5g por dia, todos os dias, sem necessidade de fase de saturação.' },
            { number: 9, type: 'content', text: 'Seu cérebro merece a mesma atenção que você dá aos seus músculos.' },
            { number: 10, type: 'cta', text: 'Salva esse post e manda pra quem precisa otimizar o cérebro! 💪🧠' },
          ],
          cta: 'Salva e compartilha!',
          hashtags: ['#creatina', '#biohacking', '#longevidade', '#cerebro', '#performance'],
          first_comment: 'Você já usa creatina? Conta nos comentários! 👇',
          source_credit: 'Baseado em estudo do @hubermanlab',
        },
        generated_images: [],
        priority: 0,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        completed_at: new Date().toISOString(),
        approved_at: null,
        published_at: null,
      }

      setItem(mockItem)

      // Add initial assistant message
      setMessages([
        {
          id: 'msg-1',
          creation_id: itemId,
          role: 'assistant',
          content: `Analisei o conteúdo original e criei um carrossel usando o Framework "Curiosidade". 

O hook abre com uma pergunta provocativa sobre creatina e cognição, algo que a maioria das pessoas não sabe.

Os slides seguintes constroem a tensão, revelam os insights científicos e fecham com um CTA claro.

Quer que eu ajuste algo específico?`,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ])

    } catch (error) {
      console.error('Error loading item:', error)
      toast('Não foi possível carregar o conteúdo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(message: string) {
    if (!item) return

    // Add user message
    const userMessage: CreationMessage = {
      id: `msg-${Date.now()}`,
      creation_id: itemId,
      role: 'user',
      content: message,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    setSending(true)
    try {
      const res = await fetch('/api/factory/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creationId: itemId,
          message,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          currentContent: item.generated_content,
        }),
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Add assistant response
      const assistantMessage: CreationMessage = {
        id: `msg-${Date.now() + 1}`,
        creation_id: itemId,
        role: 'assistant',
        content: data.response.type === 'update' 
          ? `✅ Feito! ${data.response.changes_made || 'Conteúdo atualizado.'}\n\nVeja o novo conteúdo no painel à esquerda.`
          : data.response.content || data.raw,
        metadata: { tokens: data.tokens_used },
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // If content was updated, update the item
      if (data.response.type === 'update' && data.response.slides) {
        setItem(prev => prev ? {
          ...prev,
          generated_content: {
            ...prev.generated_content!,
            slides: data.response.slides,
            cta: data.response.cta || prev.generated_content?.cta,
            hashtags: data.response.hashtags || prev.generated_content?.hashtags,
          },
        } : null)
      }

    } catch (error) {
      console.error('Chat error:', error)
      toast('Não foi possível enviar a mensagem.', 'error')
    } finally {
      setSending(false)
    }
  }

  function handleContentUpdate(content: GeneratedContent) {
    setItem(prev => prev ? { ...prev, generated_content: content } : null)
  }

  async function handleApprove() {
    if (!item) return

    try {
      // In production, update in Supabase and create workflow task
      setItem(prev => prev ? { ...prev, status: 'approved', approved_at: new Date().toISOString() } : null)
      
      toast('Conteúdo aprovado e enviado para o workflow! ✅', 'success')

      // Redirect to factory
      setTimeout(() => router.push('/factory'), 1500)

    } catch (error) {
      toast('Não foi possível aprovar o conteúdo.', 'error')
    }
  }

  async function handleDiscard() {
    if (!item) return

    try {
      setItem(prev => prev ? { ...prev, status: 'discarded' } : null)
      
      toast('Conteúdo removido da fila.', 'success')

      router.push('/factory')

    } catch (error) {
      toast('Não foi possível descartar o conteúdo.', 'error')
    }
  }

  function copyAllSlides() {
    if (!item?.generated_content?.slides) return
    
    const text = item.generated_content.slides
      .map(s => `SLIDE ${s.number}:\n${s.text}`)
      .join('\n\n')
    
    navigator.clipboard.writeText(text)
    toast('Todos os slides copiados!', 'success')
  }

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-400">Conteúdo não encontrado</p>
        <Link href="/factory">
          <Button variant="outline" className="mt-4">
            Voltar para Factory
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/factory">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{item.title}</h1>
            <p className="text-sm text-zinc-400">
              Fonte: @{item.source_handle} • {item.target_slides} slides
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyAllSlides} className="gap-2">
            <Copy className="w-4 h-4" />
            Copiar tudo
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Gerar Imagens
          </Button>
          <Button variant="outline" size="sm" onClick={handleDiscard} className="gap-2 text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
            Descartar
          </Button>
          <Button size="sm" onClick={handleApprove} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
            <CheckCircle className="w-4 h-4" />
            Aprovar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Preview */}
        <Card className="bg-zinc-900 border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Preview do Carrossel
              </h3>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  Ver fonte <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          
          <CardContent className="p-4 flex-1 overflow-y-auto">
            {item.generated_content?.slides && (
              <div className="space-y-3">
                {item.generated_content.slides.map((slide, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      slide.type === 'hook' 
                        ? 'bg-violet-500/10 border-violet-500/30' 
                        : slide.type === 'cta'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : slide.type === 'proof'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-400">
                        SLIDE {slide.number} 
                        <span className="ml-2 px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] uppercase">
                          {slide.type}
                        </span>
                      </span>
                    </div>
                    <p className="text-white">{slide.text}</p>
                  </div>
                ))}

                {/* CTA & Hashtags */}
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  {item.generated_content.first_comment && (
                    <div>
                      <span className="text-xs text-zinc-500">Primeiro comentário:</span>
                      <p className="text-sm text-zinc-300">{item.generated_content.first_comment}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1">
                    {item.generated_content.hashtags?.map((tag, idx) => (
                      <span key={idx} className="text-sm text-blue-400">{tag}</span>
                    ))}
                  </div>

                  {item.generated_content.source_credit && (
                    <p className="text-xs text-zinc-500">{item.generated_content.source_credit}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat */}
        <div className="min-h-0">
          <CreationChat
            creationId={itemId}
            messages={messages}
            currentContent={item.generated_content}
            onSendMessage={handleSendMessage}
            onContentUpdate={handleContentUpdate}
            isLoading={sending}
          />
        </div>
      </div>
    </div>
  )
}
