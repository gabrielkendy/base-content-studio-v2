'use client'

import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/api'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { Notification } from '@/types/database'

const MAX_NOTIFICATIONS = 50
const RECONNECT_DELAY_MS = 5000  // 5 segundos entre tentativas de reconexão
const MAX_RECONNECT_ATTEMPTS = 5

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  // Refs para controle de reconexão
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const mountedRef = useRef(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await db.select('notifications', {
        filters: [{ op: 'eq', col: 'user_id', val: userId }],
        order: [{ col: 'created_at', asc: false }],
        limit: MAX_NOTIFICATIONS,
      })
      if (data && mountedRef.current) {
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch (err) {
      console.error('[notifications] Erro ao buscar notificações:', err)
    }
  }, [userId])

  const subscribe = useCallback(() => {
    if (!userId || !mountedRef.current) return

    // Limpar canal anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (!mountedRef.current) return
        const newNotif = payload.new as Notification
        setNotifications(prev => {
          // Deduplicar por ID
          if (prev.some(n => n.id === newNotif.id)) return prev
          return [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS)
        })
        if (!newNotif.read) {
          setUnreadCount(prev => prev + 1)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (!mountedRef.current) return
        const updated = payload.new as Notification
        setNotifications(prev =>
          prev.map(n => n.id === updated.id ? updated : n)
        )
        // Recalcular unread count a partir do state atual
        setNotifications(current => {
          setUnreadCount(current.filter(n => !n.read).length)
          return current
        })
      })
      .subscribe((status, err) => {
        if (!mountedRef.current) return
        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[notifications] Subscription error:', err?.message || status)
          scheduleReconnect()
        } else if (status === 'CLOSED') {
          scheduleReconnect()
        }
      })

    channelRef.current = channel
  }, [userId, supabase])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[notifications] Máximo de tentativas de reconexão atingido')
      return
    }

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      reconnectAttemptsRef.current += 1
      subscribe()
    }, RECONNECT_DELAY_MS * reconnectAttemptsRef.current || RECONNECT_DELAY_MS)
  }, [subscribe])

  useEffect(() => {
    mountedRef.current = true

    if (!userId) return

    fetchNotifications()
    subscribe()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = async (id: string) => {
    try {
      await db.update('notifications', { read: true }, { id })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('[notifications] Erro ao marcar como lida:', err)
    }
  }

  const markAllRead = async () => {
    if (!userId) return
    try {
      await db.update('notifications', { read: true }, { user_id: userId, read: false })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('[notifications] Erro ao marcar todas como lidas:', err)
    }
  }

  return { notifications, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications }
}
