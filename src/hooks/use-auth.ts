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

// ── Module-level auth cache ──────────────────────────────────────────
// Shared across all useAuth() instances — prevents N redundant DB calls per page
type AuthData = { user: User | null; member: Member | null; org: Organization | null }
let _cache: { data: AuthData; expiry: number } | null = null
let _inFlight: Promise<AuthData> | null = null
const CACHE_TTL = 60_000 // 60 seconds

export function invalidateAuthCache() {
  _cache = null
  _inFlight = null
}

async function fetchMeCached(): Promise<AuthData> {
  const now = Date.now()

  // Return valid cached data
  if (_cache && _cache.expiry > now) return _cache.data

  // Deduplicate concurrent calls — all callers share a single in-flight request
  if (_inFlight) return _inFlight

  _inFlight = (async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return { user: null, member: null, org: null }
      const data = await res.json()
      const result: AuthData = {
        user: data.user || null,
        member: data.member || null,
        org: data.org || null,
      }
      _cache = { data: result, expiry: Date.now() + CACHE_TTL }
      return result
    } catch {
      return { user: null, member: null, org: null }
    } finally {
      _inFlight = null
    }
  })()

  return _inFlight
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

  useEffect(() => {
    let active = true

    async function init() {
      const result = await fetchMeCached()
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
        invalidateAuthCache()
        const result = await fetchMeCached()
        if (!active) return
        setState({ ...result, loading: false })
      } else if (event === 'SIGNED_OUT') {
        invalidateAuthCache()
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
    invalidateAuthCache()
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  return { ...state, signOut, supabase }
}
