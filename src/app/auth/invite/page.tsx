'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

function InviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<any>(null)
  const [expired, setExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
  })

  useEffect(() => {
    if (!token) {
      setExpired(true)
      setLoading(false)
      return
    }
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    try {
      const res = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        setExpired(true)
        setLoading(false)
        return
      }

      const data = await res.json()
      setInvite(data)
      setForm(prev => ({ ...prev, email: data.email || '' }))
    } catch {
      setExpired(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invite || !token) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          nome: form.nome,
          email: form.email,
          senha: form.senha,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      setSuccess(true)
      setSuccessMessage(data.message || 'Conta criada com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setSubmitting(false)
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    designer: 'Designer',
    cliente: 'Cliente',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-xl font-bold text-gray-900">Convite inválido ou expirado</h2>
          <p className="text-gray-600 max-w-md">
            Este link de convite pode ter expirado, já sido usado ou ser inválido.
            Entre em contato com quem te convidou para solicitar um novo link.
          </p>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 mt-4">
            Ir para Login
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">Bem-vindo à equipe!</h2>
          <p className="text-gray-600">{successMessage}</p>
          <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700">
            Fazer Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📩</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aceitar Convite</h1>
          <p className="text-gray-600">
            Você foi convidado para <strong>{invite?.org_name}</strong> como{' '}
            <strong>{ROLE_LABELS[invite?.role] || invite?.role}</strong>.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <Input
              required
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="seu@email.com"
              readOnly={!!invite?.email}
              className={invite?.email ? 'bg-gray-50 cursor-not-allowed' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Criar senha</label>
            <Input
              required
              type="password"
              value={form.senha}
              onChange={(e) => setForm(prev => ({ ...prev, senha: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Criando conta...' : '✅ Criar Conta e Entrar na Equipe'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Já tem uma conta?{' '}
            <a href="/login" className="text-blue-600 hover:underline">Fazer login</a>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <InviteContent />
    </Suspense>
  )
}
