'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Member, Organization } from '@/types/database'

interface AuthState {
  user: User | null
  member: Member | null
  org: Organization | null
  loading: boolean
}

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback', '/auth/confirm', '/aprovacao']

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    member: null,
    org: null,
    loading: true,
  })

  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setState({ user: null, member: null, org: null, loading: false })
          if (!isPublicPath) {
            router.push('/login')
          }
          return
        }

        // Get member + org - use maybeSingle to handle 0 or 1 results
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (memberError) {
          console.error('Erro ao buscar member:', memberError.message)
        }

        if (!memberData && !isPublicPath) {
          // User exists but no member/org — might need org setup
          console.warn('Usuário sem organização. Criando automaticamente...')
          
          // Try to create org + member for this user
          const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
          const slug = userName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + user.id.slice(0, 8)
          
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({ name: userName + "'s Workspace", slug })
            .select()
            .single()

          if (orgError) {
            console.error('Erro ao criar org:', orgError.message)
            setState({ user, member: null, org: null, loading: false })
            return
          }

          const { data: newMember, error: memError } = await supabase
            .from('members')
            .insert({
              user_id: user.id,
              org_id: newOrg.id,
              role: 'admin',
              display_name: userName,
              status: 'active'
            })
            .select('*, organizations(*)')
            .single()

          if (memError) {
            console.error('Erro ao criar member:', memError.message)
            setState({ user, member: null, org: newOrg, loading: false })
            return
          }

          setState({
            user,
            member: newMember || null,
            org: (newMember as any)?.organizations || newOrg,
            loading: false,
          })
          return
        }

        setState({
          user,
          member: memberData || null,
          org: (memberData as any)?.organizations || null,
          loading: false,
        })
      } catch (err) {
        console.error('Auth error:', err)
        setState({ user: null, member: null, org: null, loading: false })
        if (!isPublicPath) {
          router.push('/login')
        }
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Re-fetch member data
        const { data: member } = await supabase
          .from('members')
          .select('*, organizations(*)')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        setState({
          user: session.user,
          member: member || null,
          org: (member as any)?.organizations || null,
          loading: false,
        })
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, member: null, org: null, loading: false })
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { ...state, signOut, supabase }
}
