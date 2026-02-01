'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

export default function ClientesPage() {
  const { org, supabase, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [clientes, setClientes] = useState<(Cliente & { _count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  // Form
  const [form, setForm] = useState({ nome: '', slug: '', primaria: '#6366F1', secundaria: '#818CF8', contato: '', notas: '' })

  useEffect(() => {
    if (!org) return
    loadClientes()
  }, [org])

  async function loadClientes() {
    const { data: cls } = await supabase
      .from('clientes')
      .select('*')
      .eq('org_id', org!.id)
      .order('nome')

    // Get content counts
    const withCounts = await Promise.all(
      (cls || []).map(async (c) => {
        const { count } = await supabase
          .from('conteudos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', c.id)
        return { ...c, _count: count || 0 }
      })
    )

    setClientes(withCounts)
    setLoading(false)
  }

  function openNew() {
    setEditingCliente(null)
    setForm({ nome: '', slug: '', primaria: '#6366F1', secundaria: '#818CF8', contato: '', notas: '' })
    setModalOpen(true)
  }

  function openEdit(c: Cliente) {
    setEditingCliente(c)
    setForm({
      nome: c.nome,
      slug: c.slug,
      primaria: c.cores?.primaria || '#6366F1',
      secundaria: c.cores?.secundaria || '#818CF8',
      contato: c.contato || '',
      notas: c.notas || '',
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const slug = form.slug || form.nome.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

    const payload = {
      org_id: org!.id,
      nome: form.nome,
      slug,
      cores: { primaria: form.primaria, secundaria: form.secundaria },
      contato: form.contato || null,
      notas: form.notas || null,
    }

    if (editingCliente) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editingCliente.id)
      if (error) { toast('Erro ao salvar', 'error'); return }
      toast('Cliente atualizado!', 'success')
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) { toast('Erro ao criar cliente', 'error'); return }
      toast('Cliente criado!', 'success')
    }

    setModalOpen(false)
    loadClientes()
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-sm text-zinc-500">{clientes.length} clientes cadastrados</p>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhum cliente</h3>
            <p className="text-sm text-zinc-500 mb-4">Comece adicionando seu primeiro cliente</p>
            <Button variant="primary" onClick={openNew}>
              <Plus className="w-4 h-4" /> Adicionar Cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map(c => (
            <Link key={c.id} href={`/clientes/${c.slug}`}>
              <Card className="hover:shadow-md transition-all hover:border-zinc-200 cursor-pointer group h-full">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar name={c.nome} src={c.logo_url} color={c.cores?.primaria} size="lg" />
                    <button
                      onClick={(e) => { e.preventDefault(); openEdit(c) }}
                      className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-1 rounded hover:bg-zinc-100"
                    >
                      ✏️
                    </button>
                  </div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">{c.nome}</h3>
                  <p className="text-xs text-zinc-400 mb-3">@{c.slug}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{c._count} conteúdos</span>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCliente ? '✏️ Editar Cliente' : '➕ Novo Cliente'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do cliente" required />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-gerado se vazio" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaria} onChange={e => setForm({ ...form, primaria: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.primaria} onChange={e => setForm({ ...form, primaria: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secundaria} onChange={e => setForm({ ...form, secundaria: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.secundaria} onChange={e => setForm({ ...form, secundaria: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <div>
            <Label>Contato</Label>
            <Input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} placeholder="Email, telefone..." />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observações sobre o cliente..." rows={3} />
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
