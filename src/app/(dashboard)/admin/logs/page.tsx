'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { ScrollText, Search, RefreshCw, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

interface LogEntry {
  id: string
  created_at: string
  ip_address: string
  user_agent: string
  action: string
  actor_name: string
}

export default function LogsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const [emailInput, setEmailInput] = useState('')

  const pageSize = 25

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (typeFilter) params.set('type', typeFilter)
      if (emailFilter) params.set('email', emailFilter)
      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.status === 403) { router.replace('/'); return }
      if (!res.ok) throw new Error('Falha ao carregar logs')
      const json = await res.json()
      setLogs(json.logs || [])
      setTotal(json.total || 0)
      setPage(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [router, typeFilter, emailFilter])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetchData(0)
  }, [authLoading, user, router, fetchData])

  const totalPages = Math.ceil(total / pageSize)

  const EVENT_TYPES = [
    { value: '', label: 'Todos os eventos' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'signup', label: 'Signup' },
    { value: 'password_recovery', label: 'Recuperação de senha' },
    { value: 'token_refreshed', label: 'Token renovado' },
  ]

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-purple-500" />
            Logs de Autenticação
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Eventos do Supabase Auth</p>
        </div>
        <button
          onClick={() => fetchData(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm text-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setEmailFilter(emailInput); fetchData(0) }
            }}
            placeholder="Filtrar por email..."
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <button
          onClick={() => { setEmailFilter(emailInput); fetchData(0) }}
          className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Filtrar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Logs table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Timestamp</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Usuário</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Evento</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">IP</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-3 bg-zinc-100 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-800 max-w-[200px] truncate">
                        {log.actor_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <EventBadge action={log.action} />
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500 font-mono">
                        {log.ip_address || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400 max-w-[220px] truncate">
                        {log.user_agent || '—'}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && logs.length === 0 && (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Nenhum log encontrado
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <span className="text-sm text-zinc-500">
              Página {page + 1} de {totalPages} · {total} eventos
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={page === 0 || loading}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="p-2 rounded-lg hover:bg-zinc-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EventBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    login: 'bg-green-100 text-green-700',
    logout: 'bg-zinc-100 text-zinc-600',
    signup: 'bg-blue-100 text-blue-700',
    password_recovery: 'bg-amber-100 text-amber-700',
    token_refreshed: 'bg-purple-100 text-purple-700',
  }
  const key = Object.keys(styles).find((k) => action?.includes(k)) || ''
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[key] || 'bg-zinc-100 text-zinc-600'}`}>
      {action || '—'}
    </span>
  )
}
