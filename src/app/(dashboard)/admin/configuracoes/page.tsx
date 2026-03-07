'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Settings2, Loader2, AlertTriangle, Save } from 'lucide-react'

interface Setting {
  key: string
  value: string
  description: string
  updated_at: string
  type: 'bool' | 'int' | 'string'
}

function parseValue(value: string, type: Setting['type']): string | boolean | number {
  if (type === 'bool') return value === 'true'
  if (type === 'int') return parseInt(value, 10)
  return value
}

export default function ConfiguracoesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.status === 403) { router.replace('/'); return }
      if (!res.ok) throw new Error('Falha ao carregar configurações')
      const json = await res.json()
      setSettings(json.settings || [])
      const d: Record<string, string> = {}
      for (const s of json.settings || []) d[s.key] = s.value
      setDrafts(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetchData()
  }, [authLoading, user, router, fetchData])

  async function handleSave(key: string) {
    setSaving((s) => ({ ...s, [key]: true }))
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: drafts[key] }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSaved((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000)
      await fetchData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
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
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Settings2 className="w-6 h-6 text-purple-500" />
          Configurações do Sistema
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Parâmetros globais da plataforma</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
        {settings.map((setting) => (
          <div key={setting.key} className="p-5 flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-zinc-900">{setting.key}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{setting.description}</div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Atualizado:{' '}
                {setting.updated_at
                  ? new Date(setting.updated_at).toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {setting.type === 'bool' ? (
                <button
                  onClick={() => {
                    const next = drafts[setting.key] === 'true' ? 'false' : 'true'
                    setDrafts((d) => ({ ...d, [setting.key]: next }))
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    drafts[setting.key] === 'true' ? 'bg-purple-600' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      drafts[setting.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : setting.type === 'int' ? (
                <input
                  type="number"
                  value={drafts[setting.key] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                  className="w-24 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={drafts[setting.key] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                  className="w-40 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              )}

              <button
                onClick={() => handleSave(setting.key)}
                disabled={saving[setting.key]}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  saved[setting.key]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                } disabled:opacity-50`}
              >
                {saving[setting.key] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saved[setting.key] ? 'Salvo' : 'Salvar'}
              </button>
            </div>
          </div>
        ))}

        {settings.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-sm">
            <p className="mb-2">Nenhuma configuração encontrada.</p>
            <p className="text-xs text-zinc-300">
              Execute a migration SQL para criar a tabela <code>system_settings</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
