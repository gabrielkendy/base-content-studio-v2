'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'
import { Mail, ArrowLeft, Loader2, CheckCircle, KeyRound } from 'lucide-react'

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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Email enviado!</h2>
            <p className="text-zinc-500">
              Se existe uma conta com o email<br />
              <strong className="text-zinc-700">{email}</strong><br />
              você receberá um link para redefinir sua senha.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">📧 Próximos passos:</p>
            <ol className="text-left space-y-1 text-blue-700">
              <li>1. Abra seu email</li>
              <li>2. Clique no link de redefinição</li>
              <li>3. Crie uma nova senha</li>
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p>💡 Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.</p>
          </div>
          <div className="pt-4 space-y-3">
            <Button variant="ghost" onClick={() => { setSent(false); setEmail('') }} className="text-zinc-500">
              Enviar para outro email
            </Button>
            <div>
              <Link href="/login" className="text-blue-600 font-medium hover:underline text-sm">
                ← Voltar ao login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-200/50">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Esqueceu sua senha?</h1>
          <p className="text-zinc-500 mt-2">
            Sem problema! Digite seu email e enviaremos<br />
            um link para criar uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-zinc-700 font-medium">Seu email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-11 h-12"
                required
                autoFocus
              />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-200/50" 
            disabled={loading || !email}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Enviar link de recuperação
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center text-zinc-500 hover:text-zinc-700 font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Link>
        </div>

        {/* Help box */}
        <div className="mt-8 bg-zinc-100 rounded-xl p-4">
          <h3 className="font-semibold text-zinc-700 text-sm mb-2">Precisa de ajuda?</h3>
          <p className="text-xs text-zinc-500">
            Se você não conseguir acessar sua conta, entre em contato com o administrador 
            da sua organização ou envie um email para{' '}
            <a href="mailto:suporte@agenciabase.tech" className="text-blue-600 hover:underline">
              suporte@agenciabase.tech
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
