'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      render: (container: string | HTMLElement, options: any) => number
      reset: (widgetId?: number) => void
      getResponse: (widgetId?: number) => string
    }
    onRecaptchaLoad?: () => void
  }
}

// reCAPTCHA Site Key (v2 checkbox - usar a mesma do Google test ou criar em https://www.google.com/recaptcha/admin)
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const redirectTo = searchParams.get('redirect') || '/'
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [errorParam])

  // Callback quando reCAPTCHA é resolvido
  useEffect(() => {
    window.onRecaptchaLoad = () => {
      setRecaptchaLoaded(true)
    }
  }, [])

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token || '')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    // Verificar reCAPTCHA
    if (recaptchaLoaded) {
      const token = window.grecaptcha?.getResponse()
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
        // Reset reCAPTCHA
        if (window.grecaptcha) window.grecaptcha.reset()
        return
      }

      // Verificar role pra redirecionar
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.member?.role === 'cliente') {
        router.push('/portal')
      } else {
        router.push(redirectTo)
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Verifique seu email</h2>
            <p className="text-zinc-500">
              Enviamos um link de acesso para<br />
              <strong className="text-zinc-700">{email}</strong>
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p>💡 Não recebeu? Verifique a pasta de spam.</p>
          </div>
          <Button variant="ghost" onClick={() => setMagicLinkSent(false)} className="text-zinc-500">
            ← Voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* reCAPTCHA Script */}
      <Script 
        src="https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit"
        strategy="lazyOnload"
      />
      
      <div className="min-h-screen flex bg-gradient-to-br from-zinc-50 to-zinc-100">
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md animate-fade-in">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-xl shadow-blue-200/50 transform hover:scale-105 transition-transform">
                B
              </div>
              <h1 className="text-2xl font-bold text-zinc-900">Bem-vindo de volta</h1>
              <p className="text-zinc-500 mt-1">Entre na sua conta para continuar</p>
            </div>

            {/* Social Login */}
            <div className="space-y-3 mb-6">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 text-sm font-medium border-zinc-200 hover:bg-zinc-50"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 text-zinc-400 font-medium">
                  ou entre com email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-zinc-700 font-medium">Email</Label>
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
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="text-zinc-700 font-medium mb-0">Senha</Label>
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="flex justify-center">
                <div 
                  className="g-recaptcha" 
                  data-sitekey={RECAPTCHA_SITE_KEY}
                  data-theme="light"
                  data-callback="handleRecaptchaChange"
                />
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-200/50" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full h-11 text-zinc-500 hover:text-zinc-700" 
                onClick={handleMagicLink} 
                disabled={loading}
              >
                <Mail className="w-4 h-4 mr-2" />
                Entrar com Magic Link (sem senha)
              </Button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-8">
              Não tem uma conta?{' '}
              <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Branding (desktop only) */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12 relative overflow-hidden">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23fff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          
          <div className="relative z-10 text-center text-white max-w-lg">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center text-5xl font-bold mx-auto mb-8 shadow-2xl">
              B
            </div>
            <h2 className="text-4xl font-bold mb-4">BASE Content Studio</h2>
            <p className="text-xl text-blue-100 mb-8">
              Gerencie todo o conteúdo dos seus clientes em um só lugar
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold mb-1">📋</div>
                <div className="font-medium">Workflow</div>
                <div className="text-blue-200 text-xs">Kanban inteligente</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold mb-1">✅</div>
                <div className="font-medium">Aprovações</div>
                <div className="text-blue-200 text-xs">Links de aprovação</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold mb-1">📅</div>
                <div className="font-medium">Calendário</div>
                <div className="text-blue-200 text-xs">Visão mensal/anual</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-3xl font-bold mb-1">📊</div>
                <div className="font-medium">Analytics</div>
                <div className="text-blue-200 text-xs">Métricas em tempo real</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
