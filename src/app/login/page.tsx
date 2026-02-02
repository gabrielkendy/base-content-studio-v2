'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError('Email ou senha incorretos')
      setLoading(false)
      return
    }

    // Verificar role pra redirecionar
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (data.member?.role === 'cliente') {
        router.push('/portal')
      } else {
        router.push('/')
      }
    } catch {
      router.push('/')
    }
    router.refresh()
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError('Erro ao enviar link. Tente novamente.')
      setLoading(false)
      return
    }

    setMagicLinkSent(true)
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h2 className="text-xl font-bold text-zinc-900">Verifique seu email</h2>
          <p className="text-sm text-zinc-500">
            Enviamos um link de acesso para <strong>{email}</strong>
          </p>
          <Button variant="ghost" onClick={() => setMagicLinkSent(false)}>
            ← Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-blue-200">
            B
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">BASE Content Studio</h1>
          <p className="text-sm text-zinc-500 mt-1">Entre na sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="password" className="mb-0">Senha</Label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Esqueceu?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-50 px-2 text-zinc-400">ou</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleMagicLink} disabled={loading}>
            ✉️ Entrar com Magic Link
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Não tem conta?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
