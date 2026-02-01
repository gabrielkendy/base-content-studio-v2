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
        // Demo mode: provide mock data when no user is authenticated
        setState({
          user: { id: 'demo-user', email: 'kendy@agenciabase.com.br' } as any,
          member: {
            id: 'demo-member',
            user_id: 'demo-user',
            org_id: 'demo-org',
            role: 'admin',
            display_name: 'Kendy',
            avatar_url: null,
            status: 'active'
          } as any,
          org: {
            id: 'demo-org',
            name: 'Agência BASE',
            slug: 'agencia-base',
            plan: 'pro'
          } as any,
          loading: false,
        })
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
        // Demo mode: provide mock data instead of null
        setState({
          user: { id: 'demo-user', email: 'kendy@agenciabase.com.br' } as any,
          member: {
            id: 'demo-member',
            user_id: 'demo-user',
            org_id: 'demo-org',
            role: 'admin',
            display_name: 'Kendy',
            avatar_url: null,
            status: 'active'
          } as any,
          org: {
            id: 'demo-org',
            name: 'Agência BASE',
            slug: 'agencia-base',
            plan: 'pro'
          } as any,
          loading: false,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    // Demo mode: just check if we have a real user before signing out
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id !== 'demo-user') {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    // In demo mode, signing out is a no-op
  }

  return { ...state, signOut, supabase }
}
