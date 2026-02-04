'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SocialCallbackPage() {
  const searchParams = useSearchParams()
  const connected = searchParams.get('connected')
  const clienteSlug = searchParams.get('cliente')

  useEffect(() => {
    // Notifica a janela pai que a conexão foi feita
    if (window.opener) {
      window.opener.postMessage({ type: 'social-connected', connected: true, clienteSlug }, '*')
    }
    
    // Fecha o popup após 1 segundo
    setTimeout(() => {
      window.close()
    }, 1000)
  }, [connected, clienteSlug])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Conectado com sucesso!</h1>
        <p className="text-zinc-500 mb-4">Esta janela fechará automaticamente...</p>
        <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
      </div>
    </div>
  )
}
