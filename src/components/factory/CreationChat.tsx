'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreationMessage, GeneratedContent } from '@/types/database'

interface CreationChatProps {
  creationId: string
  messages: CreationMessage[]
  currentContent: GeneratedContent | null
  onSendMessage: (message: string) => Promise<void>
  onContentUpdate: (content: GeneratedContent) => void
  isLoading?: boolean
}

export function CreationChat({
  creationId,
  messages,
  currentContent,
  onSendMessage,
  onContentUpdate,
  isLoading,
}: CreationChatProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [copiedSlide, setCopiedSlide] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const message = input.trim()
    setInput('')
    setSending(true)

    try {
      await onSendMessage(message)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const copySlideText = (slideNumber: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSlide(slideNumber)
    setTimeout(() => setCopiedSlide(null), 2000)
  }

  const quickActions = [
    'Muda o hook pra algo mais provocativo',
    'Adiciona mais emojis',
    'Deixa o CTA mais direto',
    'Simplifica a linguagem',
    'Adiciona dados/estatísticas',
  ]

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-400" />
          <span className="font-medium text-white">Chat de Criação</span>
        </div>
        <span className="text-xs text-zinc-500">
          Powered by Claude
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Current content preview */}
        {currentContent && currentContent.slides && (
          <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-300">
                📑 Conteúdo Gerado ({currentContent.slides.length} slides)
              </span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentContent.slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-zinc-900 rounded-lg group"
                >
                  <span className="text-xs text-zinc-500 font-mono w-6 shrink-0">
                    {slide.number || idx + 1}.
                  </span>
                  <p className="text-sm text-zinc-300 flex-1">
                    {slide.text}
                  </p>
                  <button
                    onClick={() => copySlideText(idx + 1, slide.text)}
                    className="p-1 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedSlide === idx + 1 ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {currentContent.cta && (
              <div className="pt-2 border-t border-zinc-700">
                <span className="text-xs text-zinc-500">CTA:</span>
                <p className="text-sm text-violet-300">{currentContent.cta}</p>
              </div>
            )}

            {currentContent.hashtags && currentContent.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentContent.hashtags.map((tag, idx) => (
                  <span key={idx} className="text-xs text-blue-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-violet-400" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-50 mt-1 block">
                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {(sending || isLoading) && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
            </div>
            <div className="bg-zinc-800 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 py-2 border-t border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => setInput(action)}
              className="px-3 py-1 text-xs bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Peça ajustes no conteúdo..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
