'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/use-chat'
import { useAuth } from '@/hooks/use-auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'

interface ChatPanelProps {
  orgId: string
  conteudoId?: string
  clienteId?: string
  channelType: 'conteudo' | 'cliente' | 'geral'
  title?: string
}

export function ChatPanel({ orgId, conteudoId, clienteId, channelType, title }: ChatPanelProps) {
  const { messages, loading, sendMessage } = useChat({ orgId, conteudoId, clienteId, channelType })
  const { user, member } = useAuth()
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await sendMessage(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-100">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b border-zinc-100">
          <h4 className="text-sm font-semibold text-zinc-900">💬 {title}</h4>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
        {loading ? (
          <div className="text-center py-8 text-sm text-zinc-400">Carregando...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-400">Nenhuma mensagem ainda. Comece a conversa!</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id
            const sender = msg.sender as any
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar
                  name={sender?.display_name || '?'}
                  src={sender?.avatar_url}
                  size="sm"
                  className="mt-1 shrink-0"
                />
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  <div className="text-[10px] text-zinc-400 mb-0.5">
                    {sender?.display_name || 'Usuário'} · {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={`inline-block px-3 py-2 rounded-xl text-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-zinc-100 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 text-sm bg-zinc-50 rounded-lg px-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500"
        />
        <Button type="submit" variant="primary" size="sm" disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
