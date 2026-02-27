'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, ArrowRight, Phone, Mail, MessageCircle, Bell, Edit2 } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, MemberClient } from '@/types/database'

export default function ClientesPage() {
  const { org, member: currentMember, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [clientes, setClientes] = useState<(Cliente & { _count: number; _hasAccess: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  // Form state - campos novos estilo Aprova Aí
  const [form, setForm] = useState({
    nome: '',
    slug: '',
    primaria: '#6366F1',
    secundaria: '#818CF8',
    contato: '',
    notas: '',
    email_cliente: '',
    // Novos campos
    email: '',
    whatsapp: '',
    status: 'ativo' as 'ativo' | 'inativo',
    bloquear_edicao_legenda: false,
    whatsapp_grupo: '',
    notificar_email: true,
    notificar_whatsapp: true,
  })

  useEffect(() => {
    if (!org) return
    loadClientes()
  }, [org])

  async function loadClientes() {
    try {
      const res = await fetch('/api/clientes/list')
      if (!res.ok) {
        throw new Error('Failed to fetch clientes')
      }
      const { data } = await res.json()
      setClientes(data || [])
    } catch (err) {
      console.error('Error loading clientes:', err)
      await loadClientesFallback()
    } finally {
      setLoading(false)
    }
  }

  async function loadClientesFallback() {
    const { data: cls } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })

    const { data: memberClients } = await db.select('member_clients', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })

    const clienteIdsWithAccess = new Set((memberClients || []).map((mc: any) => mc.cliente_id))

    const withCounts = await Promise.all(
      (cls || []).map(async (c: any) => {
        const { data: countData } = await db.select('conteudos', {
          select: 'id',
          filters: [{ op: 'eq', col: 'empresa_id', val: c.id }],
        })
        return { ...c, _count: countData?.length || 0, _hasAccess: clienteIdsWithAccess.has(c.id) }
      })
    )

    setClientes(withCounts)
  }

  function openNew() {
    setEditingCliente(null)
    setForm({
      nome: '',
      slug: '',
      primaria: '#6366F1',
      secundaria: '#818CF8',
      contato: '',
      notas: '',
      email_cliente: '',
      email: '',
      whatsapp: '',
      status: 'ativo',
      bloquear_edicao_legenda: false,
      whatsapp_grupo: '',
      notificar_email: true,
      notificar_whatsapp: true,
    })
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
      email_cliente: '',
      // Novos campos
      email: (c as any).email || '',
      whatsapp: (c as any).whatsapp || '',
      status: (c as any).status || 'ativo',
      bloquear_edicao_legenda: (c as any).bloquear_edicao_legenda || false,
      whatsapp_grupo: (c as any).whatsapp_grupo || '',
      notificar_email: (c as any).notificar_email ?? true,
      notificar_whatsapp: (c as any).notificar_whatsapp ?? true,
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
      // Novos campos
      email: form.email || null,
      whatsapp: form.whatsapp ? form.whatsapp.replace(/\D/g, '') : null,
      status: form.status,
      bloquear_edicao_legenda: form.bloquear_edicao_legenda,
      whatsapp_grupo: form.whatsapp_grupo || null,
      notificar_email: form.notificar_email,
      notificar_whatsapp: form.notificar_whatsapp,
    }

    if (editingCliente) {
      const { error } = await db.update('clientes', payload, { id: editingCliente.id })
      if (error) { toast('Erro ao salvar', 'error'); return }
      toast('Cliente atualizado!', 'success')
    } else {
      try {
        const res = await fetch('/api/clientes/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            email_cliente: form.email_cliente || null,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          toast(data.error || 'Erro ao criar cliente', 'error')
          return
        }

        if (data.invite_sent) {
          toast('Cliente criado + convite enviado! ✅', 'success')
        } else if (data.upload_post_created) {
          toast('Cliente criado + Upload-Post configurado! 🚀', 'success')
        } else {
          toast('Cliente criado!', 'success')
        }
      } catch (err) {
        toast('Erro ao criar cliente', 'error')
        return
      }
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
      <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Clientes</h1>
          <p className="text-sm text-zinc-500 max-sm:text-xs">{clientes.length} clientes cadastrados</p>
        </div>
        <Button variant="primary" onClick={openNew} className="max-sm:w-full max-sm:justify-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-sm:gap-3">
          {clientes.map(c => {
            const primaria = c.cores?.primaria || '#6366F1'
            const secundaria = c.cores?.secundaria || '#818CF8'
            const isInativo = (c as any).status === 'inativo'
            return (
              <Link key={c.id} href={`/clientes/${c.slug}`}>
                <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group h-full border-0 shadow-md ${isInativo ? 'opacity-60' : ''}`}>
                  {/* Banner Header com gradiente */}
                  <div 
                    className="h-20 max-sm:h-16 relative"
                    style={{ background: `linear-gradient(135deg, ${primaria} 0%, ${secundaria} 100%)` }}
                  >
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23fff" fill-opacity="1" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E")' }} />
                    
                    {/* Status badge */}
                    {isInativo && (
                      <span className="absolute top-2 left-2 text-[10px] font-medium text-white/90 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        Inativo
                      </span>
                    )}
                    
                    {/* Edit button */}
                    <button
                      onClick={(e) => { e.preventDefault(); openEdit(c) }}
                      className="absolute top-2 right-2 w-7 h-7 max-sm:w-6 max-sm:h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white/80 hover:text-white transition-all backdrop-blur-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Avatar posicionado no banner */}
                    <div className="absolute -bottom-5 left-4 max-sm:left-3 max-sm:-bottom-4">
                      <div className="ring-4 ring-white rounded-xl shadow-lg">
                        <Avatar name={c.nome} src={c.logo_url} color={primaria} size="md" className="w-12 h-12 max-sm:w-10 max-sm:h-10 text-sm" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <CardContent className="pt-8 pb-4 px-4 max-sm:pt-7 max-sm:pb-3 max-sm:px-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors truncate max-sm:text-sm">
                          {c.nome}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate">@{c.slug}</p>
                      </div>
                      {c._hasAccess ? (
                        <span className="flex-shrink-0 inline-flex items-center text-[9px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                          ✓ Ativo
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center text-[9px] font-medium text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
                          Pendente
                        </span>
                      )}
                    </div>
                    
                    {/* Info de contato (novos campos) */}
                    {((c as any).whatsapp || (c as any).email) && (
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                        {(c as any).whatsapp && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                          </span>
                        )}
                        {(c as any).email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                          </span>
                        )}
                        {(c as any).notificar_whatsapp && (
                          <span className="flex items-center gap-1" title="Notificações WhatsApp ativas">
                            <MessageCircle className="w-3 h-3 text-green-500" />
                          </span>
                        )}
                        {(c as any).notificar_email && (
                          <span className="flex items-center gap-1" title="Notificações Email ativas">
                            <Bell className="w-3 h-3 text-blue-500" />
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-2">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <span className="text-sm max-sm:text-xs font-medium">{c._count}</span>
                        <span className="text-xs text-zinc-400">conteúdos</span>
                      </div>
                      <div className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-full bg-zinc-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar - ESTILO APROVA AÍ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCliente ? '✏️ Editar Cliente' : '➕ Novo Cliente'} size="lg">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Seção: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 border-b pb-2">📋 Informações Básicas</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Cliente *</Label>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do cliente" required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="auto-gerado se vazio" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>E-mail do Cliente</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@empresa.com" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-zinc-100 text-zinc-500 text-sm rounded-lg border border-zinc-200">+55</span>
                  <Input 
                    value={form.whatsapp} 
                    onChange={e => setForm({ ...form, whatsapp: e.target.value })} 
                    placeholder="31999999999" 
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.primaria} onChange={e => setForm({ ...form, primaria: e.target.value })} className="w-10 h-10 rounded border cursor-pointer touch-manipulation" />
                  <Input value={form.primaria} onChange={e => setForm({ ...form, primaria: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.secundaria} onChange={e => setForm({ ...form, secundaria: e.target.value })} className="w-10 h-10 rounded border cursor-pointer touch-manipulation" />
                  <Input value={form.secundaria} onChange={e => setForm({ ...form, secundaria: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Configurações */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 border-b pb-2">⚙️ Configurações</h3>
            
            {/* Status Ativo/Inativo */}
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div>
                <Label className="mb-0">Status</Label>
                <p className="text-xs text-zinc-400">Cliente ativo ou inativo</p>
              </div>
              <div className="flex gap-1 bg-white rounded-lg p-1 border">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'ativo' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    form.status === 'ativo' 
                      ? 'bg-green-500 text-white' 
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: 'inativo' })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    form.status === 'inativo' 
                      ? 'bg-zinc-500 text-white' 
                      : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Inativo
                </button>
              </div>
            </div>

            {/* Bloquear edição de legenda */}
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div>
                <Label className="mb-0">Bloquear edição de legenda</Label>
                <p className="text-xs text-zinc-400">Impedir que cliente edite legendas</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, bloquear_edicao_legenda: !form.bloquear_edicao_legenda })}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  form.bloquear_edicao_legenda ? 'bg-blue-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  form.bloquear_edicao_legenda ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Seção: Notificações */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 border-b pb-2">🔔 Notificações</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Notificar por WhatsApp */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">WhatsApp</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, notificar_whatsapp: !form.notificar_whatsapp })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    form.notificar_whatsapp ? 'bg-green-500' : 'bg-zinc-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    form.notificar_whatsapp ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Notificar por Email */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">E-mail</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, notificar_email: !form.notificar_email })}
                  className={`relative w-12 h-6 rounded-full transition-all ${
                    form.notificar_email ? 'bg-blue-500' : 'bg-zinc-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    form.notificar_email ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* WhatsApp de grupo */}
            <div>
              <Label>WhatsApp de Grupo (opcional)</Label>
              <Input 
                value={form.whatsapp_grupo} 
                onChange={e => setForm({ ...form, whatsapp_grupo: e.target.value })} 
                placeholder="ID do grupo para notificações" 
              />
              <p className="text-xs text-zinc-400 mt-1">Notificar em um grupo de WhatsApp específico</p>
            </div>
          </div>

          {/* Seção: Notas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-700 border-b pb-2">📝 Observações</h3>
            <div>
              <Label>Contato</Label>
              <Input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} placeholder="Informações de contato adicionais..." />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Observações sobre o cliente..." rows={3} />
            </div>
          </div>

          {/* Email para convite (apenas novo cliente) */}
          {!editingCliente && (
            <div className="border-t border-zinc-200 pt-4">
              <Label>📧 Email para convite de acesso (opcional)</Label>
              <Input
                type="email"
                value={form.email_cliente}
                onChange={e => setForm({ ...form, email_cliente: e.target.value })}
                placeholder="cliente@empresa.com"
              />
              <p className="text-xs text-zinc-400 mt-1">Se preenchido, um convite de acesso à plataforma será enviado</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">💾 Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
