'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  Check,
  Loader2,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/types/billing'

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form data
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (searchParams.get('plan') as PlanId) || 'pro'
  )
  const [interval, setInterval] = useState<'month' | 'year'>(
    (searchParams.get('interval') as 'month' | 'year') || 'year'
  )

  const plan = PLANS[selectedPlan]

  // Password strength
  const passwordStrength = getPasswordStrength(password)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // 1. Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            org_name: orgName,
            selected_plan: selectedPlan,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Redirect to checkout or dashboard
        // The organization and profile will be created by a Supabase trigger
        // Then we redirect to checkout
        const checkoutRes = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan, interval }),
        })

        const checkoutData = await checkoutRes.json()

        if (checkoutData.url) {
          window.location.href = checkoutData.url
        } else {
          // If no checkout URL, go to dashboard (maybe free plan or error)
          router.push('/dashboard?welcome=true')
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?plan=${selectedPlan}&interval=${interval}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
    } catch (err) {
      console.error('Google signup error:', err)
      setError('Erro ao conectar com Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">ContentStudio</span>
          </Link>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-purple-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-3xl font-bold mb-2">Crie sua conta</h1>
              <p className="text-zinc-400 mb-8">
                Comece seu teste grátis de 14 dias
              </p>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Google Signup */}
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

              {/* Email Form */}
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {/* Password strength */}
                    {password && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                              passwordStrength === 'medium' ? 'w-2/3 bg-amber-500' :
                              'w-full bg-green-500'
                            }`}
                          />
                        </div>
                        <span className={`text-xs ${
                          passwordStrength === 'weak' ? 'text-red-500' :
                          passwordStrength === 'medium' ? 'text-amber-500' :
                          'text-green-500'
                        }`}>
                          {passwordStrength === 'weak' ? 'Fraca' :
                           passwordStrength === 'medium' ? 'Média' : 'Forte'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!email || !password || password.length < 8}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-purple-400 hover:underline">
                  Entrar
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>

              <h1 className="text-3xl font-bold mb-2">Sobre você</h1>
              <p className="text-zinc-400 mb-8">
                Algumas informações para personalizar sua experiência
              </p>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Seu nome</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                        placeholder="Como quer ser chamado?"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nome da agência/empresa</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                        placeholder="Nome da sua empresa"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name || !orgName}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Criar conta e começar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-zinc-500">
                Ao criar sua conta, você concorda com nossos{' '}
                <Link href="/termos" className="text-purple-400 hover:underline">Termos</Link>
                {' '}e{' '}
                <Link href="/privacidade" className="text-purple-400 hover:underline">Privacidade</Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Plan Info */}
      <div className="hidden lg:flex flex-1 bg-zinc-900/50 border-l border-zinc-800 flex-col justify-center px-16 py-12">
        <div className="max-w-md">
          <span className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400 font-medium mb-6">
            Plano selecionado
          </span>

          <h2 className="text-4xl font-bold mb-2">{plan.name}</h2>
          <p className="text-zinc-400 mb-6">{plan.description}</p>

          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-5xl font-bold">
              R${interval === 'year' ? plan.priceAnnual : plan.priceMonthly}
            </span>
            <span className="text-zinc-400">/mês</span>
          </div>

          {/* Toggle interval */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                interval === 'month' 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                interval === 'year' 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Anual
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                -20%
              </span>
            </button>
          </div>

          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-zinc-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Change plan */}
          <Link
            href="/pricing"
            className="text-sm text-purple-400 hover:underline"
          >
            Trocar plano →
          </Link>

          {/* Trial info */}
          <div className="mt-8 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="font-medium">14 dias grátis</span>
            </div>
            <p className="text-sm text-zinc-400">
              Teste todas as funcionalidades sem compromisso. 
              Cancele a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}

function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak'
  
  let score = 0
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score >= 3) return 'strong'
  if (score >= 2) return 'medium'
  return 'weak'
}
