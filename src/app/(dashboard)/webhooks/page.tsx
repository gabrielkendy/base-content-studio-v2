'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, Trash2, Webhook, ToggleLeft, ToggleRight } from 'lucide-react'
import type { WebhookConfig } from '@/types/database'

const EVENTS = [
  'content.created', 'content.status_changed', 'content.approved',
  'content.comment', 'member.invited', 'deadline.approaching'
]

export default function WebhooksPage() {
  const { org, supabase } = useAuth()
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ url: '', events: [] as string[] })

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data } = await supabase.from('webhook_configs').select('*').eq('org_id', org!.id)
    setWebhooks(data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('webhook_configs').insert({
      org_id: org!.id, url: form.url, events: form.events, active: true,
    })
    if (error) { toast('Erro ao salvar', 'error'); return }
    toast('Webhook criado!', 'success')
    setModalOpen(false)
    setForm({ url: '', events: [] })
    loadData()
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('webhook_configs').update({ active: !active }).eq('id', id)
    toast(active ? 'Webhook desativado' : 'Webhook ativado', 'success')
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este webhook?')) return
    await supabase.from('webhook_configs').delete().eq('id', id)
    toast('Webhook excluído', 'success')
    loadData()
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Webhooks</h1>
          <p className="text-sm text-zinc-500">Integre com n8n, Zapier ou qualquer ferramenta</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Novo Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400">Nenhum webhook</h3>
            <p className="text-sm text-zinc-400 mb-4">Configure webhooks para receber eventos no n8n</p>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> Configurar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map(w => (
            <Card key={w.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <button onClick={() => toggleActive(w.id, w.active)}>
                  {w.active
                    ? <ToggleRight className="w-8 h-8 text-green-500" />
                    : <ToggleLeft className="w-8 h-8 text-zinc-300" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-mono text-zinc-900 truncate">{w.url}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(w.events as string[]).map(ev => (
                      <Badge key={ev} variant="info">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={w.active ? 'success' : 'default'}>
                  {w.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(w.id)}>
                  <Trash2 className="w-4 h-4 text-zinc-400" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="🔗 Novo Webhook" size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>URL do Webhook (n8n, Zapier, etc)</Label>
            <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://n8n.seudominio.com/webhook/..." required />
          </div>
          <div>
            <Label>Eventos</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EVENTS.map(ev => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev]
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    form.events.includes(ev)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">💾 Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
