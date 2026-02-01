'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import type { Message } from '@/types/database'

interface UseChatOptions {
  orgId: string
  conteudoId?: string
  clienteId?: string
  channelType: 'conteudo' | 'cliente' | 'geral'
}

export function useChat({ orgId, conteudoId, clienteId, channelType }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetch() {
      let query = supabase
        .from('messages')
        .select('*, sender:members!messages_sender_id_fkey(display_name, avatar_url, role)')
        .eq('org_id', orgId)
        .eq('channel_type', channelType)
        .order('created_at', { ascending: true })
        .limit(100)

      if (conteudoId) query = query.eq('conteudo_id', conteudoId)
      if (clienteId) query = query.eq('cliente_id', clienteId)

      const { data } = await query
      setMessages(data || [])
      setLoading(false)
    }
    fetch()

    // Realtime
    const filter = conteudoId 
      ? `conteudo_id=eq.${conteudoId}` 
      : clienteId 
        ? `cliente_id=eq.${clienteId}` 
        : `org_id=eq.${orgId}`

    const channel = supabase
      .channel(`chat-${conteudoId || clienteId || orgId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter,
      }, async (payload) => {
        const newMsg = payload.new as Message
        // Fetch sender info
        const { data: sender } = await supabase
          .from('members')
          .select('display_name, avatar_url, role')
          .eq('user_id', newMsg.sender_id)
          .single()
        setMessages(prev => [...prev, { ...newMsg, sender: sender as any }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, conteudoId, clienteId, channelType])

  const sendMessage = useCallback(async (text: string, attachments: string[] = []) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('messages').insert({
      org_id: orgId,
      conteudo_id: conteudoId || null,
      cliente_id: clienteId || null,
      channel_type: channelType,
      sender_id: user.id,
      text,
      attachments,
    })

    if (error) console.error('Error sending message:', error)
  }, [orgId, conteudoId, clienteId, channelType])

  return { messages, loading, sendMessage }
}
