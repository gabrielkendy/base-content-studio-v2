'use client'

import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/api'
import { useEffect, useState } from 'react'
import type { Notification } from '@/types/database'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    // Fetch initial via proxy
    async function fetch() {
      const { data } = await db.select('notifications', {
        filters: [{ op: 'eq', col: 'user_id', val: userId }],
        order: [{ col: 'created_at', asc: false }],
        limit: 20,
      })

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.read).length)
      }
    }
    fetch()

    // Realtime subscription - keep using supabase client
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAsRead = async (id: string) => {
    await db.update('notifications', { read: true }, { id })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!userId) return
    // For markAllRead, we need to update multiple rows matching user_id + read=false
    // The proxy matches on all keys in the match object
    await db.update('notifications', { read: true }, { user_id: userId, read: false })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAsRead, markAllRead }
}
