'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { ChatPanel } from '@/components/chat/chat-panel'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import type { Cliente } from '@/types/database'

export default function ChatPage() {
  const { org, supabase } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    async function load() {
      const { data } = await supabase.from('clientes').select('*').eq('org_id', org!.id).order('nome')
      setClientes(data || [])
      setLoading(false)
    }
    load()
  }, [org])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Chat</h1>
        <p className="text-sm text-zinc-500">Comunicação interna por cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '70vh' }}>
        {/* Client list */}
        <Card className="lg:col-span-1">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Canais</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {/* General channel */}
            <button
              onClick={() => setSelectedCliente(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left ${
                !selectedCliente ? 'bg-blue-50 border-r-2 border-blue-500' : ''
              }`}
            >
              <div className="w-9 h-9 bg-zinc-200 rounded-full flex items-center justify-center text-lg">💬</div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Geral</div>
                <div className="text-xs text-zinc-400">Equipe toda</div>
              </div>
            </button>
            {clientes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCliente(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left ${
                  selectedCliente?.id === c.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <Avatar name={c.nome} src={c.logo_url} color={c.cores?.primaria} size="sm" />
                <div>
                  <div className="text-sm font-medium text-zinc-900">{c.nome}</div>
                  <div className="text-xs text-zinc-400">@{c.slug}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat panel */}
        <div className="lg:col-span-2">
          {org && (
            <ChatPanel
              key={selectedCliente?.id || 'geral'}
              orgId={org.id}
              clienteId={selectedCliente?.id}
              channelType={selectedCliente ? 'cliente' : 'geral'}
              title={selectedCliente ? selectedCliente.nome : 'Chat Geral'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
