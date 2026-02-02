'use client'

import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/api'
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
      const filters: any[] = [
        { op: 'eq', col: 'org_id', val: orgId },
        { op: 'eq', col: 'channel_type', val: channelType },
      ]

      if (conteudoId) filters.push({ op: 'eq', col: 'conteudo_id', val: conteudoId })
      if (clienteId) filters.push({ op: 'eq', col: 'cliente_id', val: clienteId })

      const { data } = await db.select('messages', {
        select: '*',
        filters,
        order: [{ col: 'created_at', asc: true }],
        limit: 100,
      })
      setMessages(data || [])
      setLoading(false)
    }
    fetch()

    // Realtime - keep using supabase client for subscriptions
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
        // Fetch sender info via proxy
        const { data: sender } = await db.select('members', {
          select: 'display_name, avatar_url, role',
          filters: [{ op: 'eq', col: 'user_id', val: newMsg.sender_id }],
          single: true,
        })
        setMessages(prev => [...prev, { ...newMsg, sender: sender as any }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, conteudoId, clienteId, channelType])

  const sendMessage = useCallback(async (text: string, attachments: string[] = []) => {
    // Keep using supabase.auth for getting the user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await db.insert('messages', {
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
