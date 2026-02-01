'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to dashboard in demo mode
    router.push('/dashboard')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🏢</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">BASE Content Studio</h1>
        <p className="text-zinc-500">Redirecionando para o dashboard...</p>
      </div>
    </div>
  )
}
