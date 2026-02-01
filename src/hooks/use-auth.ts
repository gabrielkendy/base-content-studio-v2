'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Member, Organization } from '@/types/database'

interface AuthState {
  user: User | null
  member: Member | null
  org: Organization | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    member: null,
    org: null,
    loading: true,
  })

  const supabase = createClient()

  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get member + org
        const { data: member } = await supabase
          .from('members')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        setState({
          user,
          member: member || null,
          org: (member as any)?.organizations || null,
          loading: false,
        })
      } else {
        setState({ user: null, member: null, org: null, loading: false })
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: member } = await supabase
          .from('members')
          .select('*, organizations(*)')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single()

        setState({
          user: session.user,
          member: member || null,
          org: (member as any)?.organizations || null,
          loading: false,
        })
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, member: null, org: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { ...state, signOut, supabase }
}
