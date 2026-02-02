'use client'

import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/types/database'

/**
 * Role guard hook — redirects unauthorized users
 * 
 * Usage:
 *   const { allowed, loading } = useRoleGuard(['admin'])
 *   const { allowed, loading } = useRoleGuard(['admin', 'gestor'])
 *   
 * Returns loading=true while checking, allowed=false if unauthorized (auto-redirects)
 */
export function useRoleGuard(allowedRoles: UserRole[]) {
  const { member, loading } = useAuth()
  const router = useRouter()

  const allowed = !loading && member !== null && allowedRoles.includes(member.role as UserRole)

  useEffect(() => {
    if (loading) return
    if (!member) return // useAuth handles redirect to login
    
    if (!allowedRoles.includes(member.role as UserRole)) {
      // Cliente → portal, others → dashboard home
      if (member.role === 'cliente') {
        router.replace('/portal')
      } else {
        router.replace('/')
      }
    }
  }, [loading, member, allowedRoles, router])

  return { allowed, loading, role: member?.role }
}
