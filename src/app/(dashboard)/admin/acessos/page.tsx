'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Lock,
  Check,
} from 'lucide-react'

interface AccessEntry {
  id: string
  email: string
  granted_by: string
  created_at: string
  active: boolean
  via_env?: boolean
}

export default function AcessosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [entries, setEntries] = useState<AccessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/acessos')
      if (res.status === 403) { router.replace('/'); return }
      if (!res.ok) throw new Error('Falha ao carregar dados')
      const json = await res.json()
      setEntries(json.entries || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetchData()
  }, [authLoading, user, router, fetchData])

  async function handleAdd() {
    if (!newEmail.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/acessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), grantedBy: user?.email }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error || 'Erro ao adicionar')
      }
      setNewEmail('')
      await fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setAdding(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch('/api/admin/acessos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: false }),
      })
      if (!res.ok) throw new Error('Erro ao revogar')
      await fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-purple-500" />
          Acessos Admin
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Gerencie quem tem acesso ao painel admin</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Add new admin */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5">
        <h2 className="font-semibold text-sm text-zinc-700 mb-4">Adicionar Admin</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="email@exemplo.com"
            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEmail.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Entries list */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-700">Admins Ativos</h2>
        </div>
        <table className="w-full">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Email</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Concedido por</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Data</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((entry) => (
              <tr key={entry.id} className={!entry.active ? 'opacity-50' : ''}>
                <td className="py-3 px-4 text-sm font-medium text-zinc-900">{entry.email}</td>
                <td className="py-3 px-4 text-sm text-zinc-500">
                  {entry.via_env ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Lock className="w-3.5 h-3.5" /> via env
                    </span>
                  ) : (
                    entry.granted_by
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-zinc-500">
                  {entry.via_env
                    ? '—'
                    : new Date(entry.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-center">
                  {entry.active ? (
                    <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" /> Ativo
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">Inativo</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {!entry.via_env && entry.active && (
                    <button
                      onClick={() => handleRevoke(entry.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revogar acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Nenhum admin cadastrado na tabela
          </div>
        )}
      </div>
    </div>
  )
}
