'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-bold text-zinc-900">Conta criada!</h2>
          <p className="text-sm text-zinc-500">
            Verifique seu email <strong>{email}</strong> para confirmar.
          </p>
          <Link href="/login">
            <Button variant="primary">Ir para Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-blue-200">
            B
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Criar Conta</h1>
          <p className="text-sm text-zinc-500 mt-1">Comece grátis no BASE Content Studio</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
