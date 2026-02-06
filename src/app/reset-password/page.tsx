'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Validação de senha
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
    
    // Redirecionar após 3 segundos
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Senha atualizada!</h2>
            <p className="text-zinc-500">
              Sua nova senha foi salva com sucesso.<br />
              Você será redirecionado para o login...
            </p>
          </div>
          <div className="pt-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          </div>
          <Link 
            href="/login" 
            className="text-blue-600 font-medium hover:underline text-sm"
          >
            Ir para login agora
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-200/50">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Criar nova senha</h1>
          <p className="text-zinc-500 mt-2">
            Digite sua nova senha abaixo
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
            <Label htmlFor="password" className="text-zinc-700 font-medium">Nova senha</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-11 pr-11 h-12"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div 
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength 
                          ? passwordStrength >= 4 ? 'bg-green-500' 
                            : passwordStrength >= 3 ? 'bg-yellow-500' 
                            : 'bg-red-500'
                          : 'bg-zinc-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs space-y-1">
                  <div className={`flex items-center gap-2 ${passwordChecks.length ? 'text-green-600' : 'text-zinc-400'}`}>
                    {passwordChecks.length ? '✓' : '○'} Pelo menos 8 caracteres
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.hasLetter ? 'text-green-600' : 'text-zinc-400'}`}>
                    {passwordChecks.hasLetter ? '✓' : '○'} Contém letras
                  </div>
                  <div className={`flex items-center gap-2 ${passwordChecks.hasNumber ? 'text-green-600' : 'text-zinc-400'}`}>
                    {passwordChecks.hasNumber ? '✓' : '○'} Contém números
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirm" className="text-zinc-700 font-medium">Confirmar senha</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`pl-11 h-12 ${
                  confirmPassword && !passwordChecks.match ? 'border-red-300 focus:border-red-500' : ''
                }`}
                required
              />
            </div>
            {confirmPassword && !passwordChecks.match && (
              <p className="text-xs text-red-500 mt-1.5">As senhas não coincidem</p>
            )}
            {confirmPassword && passwordChecks.match && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Senhas coincidem
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-12 text-base font-semibold shadow-lg shadow-blue-200/50" 
            disabled={loading || !passwordChecks.length || !passwordChecks.match}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 mr-2" />
                Salvar nova senha
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link 
            href="/login" 
            className="text-zinc-500 hover:text-zinc-700 font-medium text-sm"
          >
            ← Cancelar e voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
