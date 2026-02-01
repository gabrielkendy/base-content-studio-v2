'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-bold text-zinc-900">Email enviado</h2>
          <p className="text-sm text-zinc-500">
            Se <strong>{email}</strong> existe, enviamos instruções para redefinir sua senha.
          </p>
          <Link href="/login">
            <Button variant="ghost">← Voltar ao login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Esqueceu a senha?</h1>
          <p className="text-sm text-zinc-500 mt-1">Informe seu email para redefinir</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
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
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
