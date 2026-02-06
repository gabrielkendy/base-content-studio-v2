'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Sparkles, Check } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: any
    onRecaptchaLoad?: () => void
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const errorParam = searchParams.get('error')
  const isSignup = searchParams.get('signup') === 'true'

  useEffect(() => {
    if (errorParam) setError(decodeURIComponent(errorParam))
    window.onRecaptchaLoad = () => setRecaptchaLoaded(true)
  }, [errorParam])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    if (recaptchaLoaded && window.grecaptcha) {
      const token = window.grecaptcha.getResponse()
      if (!token) {
        setError('Por favor, complete o reCAPTCHA')
        return
      }
    }
    
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email ou senha incorretos')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Confirme seu email antes de fazer login')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        if (window.grecaptcha) window.grecaptcha.reset()
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Informe seu email')
      return
    }
    
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` },
    })

    if (error) {
      setError('Erro ao enviar link. Tente novamente.')
      setLoading(false)
      return
    }

    setMagicLinkSent(true)
    setLoading(false)
  }

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setError('Erro ao conectar com Google')
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Verifique seu email</h2>
          <p className="text-zinc-400 mb-6">
            Enviamos um link de acesso para<br />
            <strong className="text-white">{email}</strong>
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400 mb-6">
            💡 Não recebeu? Verifique a pasta de spam.
          </div>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            ← Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Script 
        src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit"
        strategy="lazyOnload"
      />
      
      <div className="min-h-screen bg-black flex">
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[150px] opacity-20" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[150px] opacity-20" />
        </div>

        {/* Form Side */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ContentStudio</span>
            </Link>

            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignup ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-zinc-400 mb-8">
              {isSignup ? 'Comece seu teste grátis de 14 dias' : 'Entre na sua conta para continuar'}
            </p>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-zinc-500">ou</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-zinc-300">Senha</label>
                  <Link href="/forgot-password" className="text-sm text-purple-400 hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="flex justify-center [&_.g-recaptcha]:!mx-auto" style={{ colorScheme: 'dark' }}>
                <div 
                  className="g-recaptcha" 
                  data-sitekey={RECAPTCHA_SITE_KEY}
                  data-theme="dark"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 font-medium hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Entrar com Magic Link
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-8">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-purple-400 font-semibold hover:underline">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-l border-zinc-800 items-center justify-center p-12 relative">
          <div className="max-w-md text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">ContentStudio</h2>
            <p className="text-zinc-400 mb-8">
              Gerencie todo o conteúdo dos seus clientes em um só lugar
            </p>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: '📋', title: 'Workflow', desc: 'Kanban inteligente' },
                { icon: '✅', title: 'Aprovações', desc: 'Links de aprovação' },
                { icon: '📅', title: 'Calendário', desc: 'Visão mensal/anual' },
                { icon: '📊', title: 'Analytics', desc: 'Métricas em tempo real' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-white font-medium text-sm">{item.title}</div>
                  <div className="text-zinc-500 text-xs">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
