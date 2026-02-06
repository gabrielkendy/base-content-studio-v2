'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck, Sparkles, Check } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const passwordChecks = {
    length: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasLetter: /[a-zA-Z]/.test(password),
    match: password === confirmPassword && password.length > 0,
  }
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message || 'Erro ao atualizar senha')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    
    setTimeout(() => {
      router.push('/login')
    }, 3000)
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

        {success ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Senha atualizada!</h2>
            <p className="text-zinc-400 mb-8">
              Sua nova senha foi salva com sucesso.<br />
              Você será redirecionado para o login...
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-6" />
            <Link href="/login" className="text-purple-400 font-medium hover:underline">
              Ir para login agora
            </Link>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-2">Criar nova senha</h1>
            <p className="text-zinc-400 mb-8">
              Digite sua nova senha abaixo
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                    required
                    autoFocus
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
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div 
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength 
                              ? passwordStrength >= 4 ? 'bg-green-500' 
                                : passwordStrength >= 3 ? 'bg-amber-500' 
                                : 'bg-red-500'
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-green-500' : 'text-zinc-500'}`}>
                        {passwordChecks.length ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current" />}
                        Pelo menos 8 caracteres
                      </div>
                      <div className={`flex items-center gap-2 ${passwordChecks.hasLetter ? 'text-green-500' : 'text-zinc-500'}`}>
                        {passwordChecks.hasLetter ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current" />}
                        Contém letras
                      </div>
                      <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-green-500' : 'text-zinc-500'}`}>
                        {passwordChecks.hasNumber ? <Check className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-current" />}
                        Contém números
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3 bg-zinc-900 border rounded-xl text-white placeholder:text-zinc-600 focus:ring-1 outline-none transition-colors ${
                      confirmPassword && !passwordChecks.match 
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                        : 'border-zinc-800 focus:border-purple-500 focus:ring-purple-500'
                    }`}
                    required
                  />
                </div>
                {confirmPassword && !passwordChecks.match && (
                  <p className="text-sm text-red-400 mt-2">As senhas não coincidem</p>
                )}
                {confirmPassword && passwordChecks.match && (
                  <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Senhas coincidem
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordChecks.length || !passwordChecks.match}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Salvar nova senha
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link 
                href="/login" 
                className="text-zinc-500 hover:text-white transition-colors"
              >
                ← Cancelar e voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
