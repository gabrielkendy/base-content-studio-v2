'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connected = searchParams.get('connected')
  const clienteSlug = searchParams.get('cliente')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verificando conexão...')

  useEffect(() => {
    // Validar parâmetros
    if (!clienteSlug) {
      setStatus('error')
      setMessage('Parâmetro "cliente" não encontrado')
      return
    }

    if (connected !== 'true') {
      setStatus('error')
      setMessage('Conexão cancelada ou falhou')
      return
    }

    // Conexão OK!
    setStatus('success')
    setMessage('Redes sociais conectadas!')

    // Verificar se é popup ou nova aba
    const isPopup = window.opener !== null

    if (isPopup) {
      // É popup: notifica janela pai e fecha
      try {
        window.opener.postMessage({ 
          type: 'social-connected', 
          connected: true, 
          clienteSlug 
        }, '*')
      } catch (e) {
        console.error('Erro ao notificar janela pai:', e)
      }
      
      // Fecha popup após 1.5s
      setTimeout(() => {
        window.close()
        // Fallback se não conseguir fechar (alguns browsers bloqueiam)
        setTimeout(() => {
          window.location.href = `/clientes/${clienteSlug}/redes?success=true`
        }, 500)
      }, 1500)
    } else {
      // Não é popup: redireciona direto pra página de redes do cliente
      setTimeout(() => {
        window.location.href = `/clientes/${clienteSlug}/redes?success=true`
      }, 2000)
    }

  }, [connected, clienteSlug, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        
        {status === 'loading' && (
          <>
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Verificando...</h1>
            <p className="text-zinc-500 mb-4">{message}</p>
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Conectado com sucesso!</h1>
            <p className="text-zinc-500 mb-4">{message}</p>
            <p className="text-sm text-zinc-400">Redirecionando...</p>
            <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mt-4"></div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Erro na conexão</h1>
            <p className="text-zinc-500 mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Fechar
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default function SocialCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-zinc-500 mt-4">Carregando...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
