'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Member, Organization } from '@/types/database'

interface AuthState {
  user: User | null
  member: Member | null
  org: Organization | null
  loading: boolean
}

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback', '/auth/confirm', '/auth/invite', '/aprovacao', '/entrega', '/repo']

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) _supabase = createClient()
  return _supabase
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    member: null,
    org: null,
    loading: true,
  })

  const supabase = useMemo(() => getSupabase(), [])
  const router = useRouter()
  const pathname = usePathname()
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        return { user: null, member: null, org: null }
      }
      const data = await res.json()
      return {
        user: data.user || null,
        member: data.member || null,
        org: data.org || null,
      }
    } catch {
      return { user: null, member: null, org: null }
    }
  }, [])

  useEffect(() => {
    let active = true

    async function init() {
      const result = await fetchMe()
      if (!active) return

      setState({ ...result, loading: false })

      if (!result.user && !isPublicPath) {
        router.push('/login')
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!active) return

      if (event === 'SIGNED_IN') {
        // Re-fetch after login
        const result = await fetchMe()
        if (!active) return
        setState({ ...result, loading: false })
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, member: null, org: null, loading: false })
        router.push('/login')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  return { ...state, signOut, supabase }
}
