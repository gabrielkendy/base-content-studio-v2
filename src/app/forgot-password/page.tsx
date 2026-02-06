'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, CheckCircle, KeyRound, Sparkles } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError('Erro ao enviar email. Verifique o endereço e tente novamente.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[150px] opacity-20" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] opacity-20" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ContentStudio</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Email enviado!</h2>
            <p className="text-zinc-400 mb-6">
              Se existe uma conta com o email<br />
              <strong className="text-white">{email}</strong><br />
              você receberá um link para redefinir sua senha.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400 mb-6">
              <p className="font-medium mb-2">📧 Próximos passos:</p>
              <ol className="text-left space-y-1">
                <li>1. Abra seu email</li>
                <li>2. Clique no link de redefinição</li>
                <li>3. Crie uma nova senha</li>
              </ol>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400 mb-8">
              💡 Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                Enviar para outro email
              </button>
              <div>
                <Link href="/login" className="text-purple-400 font-medium hover:underline">
                  ← Voltar ao login
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mb-6">
              <KeyRound className="w-8 h-8 text-amber-500" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Esqueceu sua senha?</h1>
            <p className="text-zinc-400 mb-8">
              Sem problema! Digite seu email e enviaremos um link para criar uma nova senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Seu email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Enviar link de recuperação
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center text-zinc-500 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao login
              </Link>
            </div>

            {/* Help */}
            <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <h3 className="font-semibold text-zinc-300 text-sm mb-2">Precisa de ajuda?</h3>
              <p className="text-xs text-zinc-500">
                Se você não conseguir acessar sua conta, entre em contato pelo email{' '}
                <a href="mailto:suporte@contentstudio.com" className="text-purple-400 hover:underline">
                  suporte@contentstudio.com
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
