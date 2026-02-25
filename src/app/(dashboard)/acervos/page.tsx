'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, FolderOpen, RefreshCw, Copy, ExternalLink, Trash2, Edit2, FileImage } from 'lucide-react'
import Link from 'next/link'

interface Acervo {
  id: string
  titulo: string
  slug: string
  descricao: string | null
  icone: string
  tipo_origem: string
  drive_folder_id: string | null
  drive_folder_url: string | null
  visibilidade: string
  ordem: number
  ativo: boolean
  total_arquivos: number
  ultimo_sync: string | null
  created_at: string
  cliente: {
    id: string
    nome: string
    slug: string
  }
}

interface Cliente {
  id: string
  nome: string
  slug: string
}

const ICONES = ['📁', '📸', '✉️', '📄', '🎨', '📊', '🎬', '📦', '🏷️', '📋', '🖼️', '💼']

export default function AcervosPage() {
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [acervos, setAcervos] = useState<Acervo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAcervo, setEditingAcervo] = useState<Acervo | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [form, setForm] = useState({
    cliente_id: '',
    titulo: '',
    slug: '',
    descricao: '',
    icone: '📁',
    drive_folder_url: '',
    visibilidade: 'publico'
  })

  // Filtro
  const [filtroCliente, setFiltroCliente] = useState('')

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    try {
      // Carregar clientes
      const resClientes = await fetch('/api/clientes/list')
      if (resClientes.ok) {
        const { data } = await resClientes.json()
        setClientes(data || [])
      }

      // Carregar acervos
      const resAcervos = await fetch('/api/acervos')
      if (resAcervos.ok) {
        const { data } = await resAcervos.json()
        setAcervos(data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
      toast('Erro ao carregar dados', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditingAcervo(null)
    setForm({
      cliente_id: '',
      titulo: '',
      slug: '',
      descricao: '',
      icone: '📁',
      drive_folder_url: '',
      visibilidade: 'publico'
    })
    setModalOpen(true)
  }

  function openEdit(acervo: Acervo) {
    setEditingAcervo(acervo)
    setForm({
      cliente_id: acervo.cliente.id,
      titulo: acervo.titulo,
      slug: acervo.slug,
      descricao: acervo.descricao || '',
      icone: acervo.icone,
      drive_folder_url: acervo.drive_folder_url || '',
      visibilidade: acervo.visibilidade
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const slug = form.slug || form.titulo.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      const payload = {
        cliente_id: form.cliente_id,
        titulo: form.titulo,
        slug,
        descricao: form.descricao || null,
        icone: form.icone,
        drive_folder_url: form.drive_folder_url || null,
        visibilidade: form.visibilidade
      }

      let res: Response
      if (editingAcervo) {
        res = await fetch(`/api/acervos/${editingAcervo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/acervos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Erro ao salvar', 'error')
        return
      }

      toast(editingAcervo ? 'Acervo atualizado!' : 'Acervo criado!', 'success')
      setModalOpen(false)
      loadData()
    } catch (err) {
      toast('Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync(acervoId: string) {
    setSyncing(acervoId)
    try {
      const res = await fetch(`/api/acervos/${acervoId}/sync`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Erro ao sincronizar', 'error')
        return
      }

      toast(`Sincronizado! ${data.total_arquivos} arquivos`, 'success')
      loadData()
    } catch (err) {
      toast('Erro ao sincronizar', 'error')
    } finally {
      setSyncing(null)
    }
  }

  async function handleDelete(acervo: Acervo) {
    if (!confirm(`Excluir acervo "${acervo.titulo}"?`)) return

    try {
      const res = await fetch(`/api/acervos/${acervo.id}`, { method: 'DELETE' })
      
      if (!res.ok) {
        toast('Erro ao excluir', 'error')
        return
      }

      toast('Acervo excluído', 'success')
      loadData()
    } catch (err) {
      toast('Erro ao excluir', 'error')
    }
  }

  function copyLink(acervo: Acervo) {
    const url = `${window.location.origin}/cliente/${acervo.cliente.slug}/acervo/${acervo.slug}`
    navigator.clipboard.writeText(url)
    toast('Link copiado!', 'success')
  }

  // Filtrar acervos
  const acervosFiltrados = filtroCliente 
    ? acervos.filter(a => a.cliente.id === filtroCliente)
    : acervos

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">📁 Acervo Digital</h1>
          <p className="text-sm text-zinc-500 max-sm:text-xs">{acervos.length} categorias cadastradas</p>
        </div>
        <Button variant="primary" onClick={openNew} className="max-sm:w-full max-sm:justify-center">
          <Plus className="w-4 h-4" /> Novo Acervo
        </Button>
      </div>

      {/* Filtro */}
      {clientes.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-zinc-500">Filtrar:</Label>
          <select
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de Acervos */}
      {acervosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhum acervo</h3>
            <p className="text-sm text-zinc-500 mb-4">Crie categorias para organizar os arquivos dos seus clientes</p>
            <Button variant="primary" onClick={openNew}>
              <Plus className="w-4 h-4" /> Criar Acervo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {acervosFiltrados.map(acervo => (
            <Card key={acervo.id} className="overflow-hidden hover:shadow-lg transition-all">
              {/* Header com ícone */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{acervo.icone}</span>
                    <div>
                      <h3 className="font-bold text-lg">{acervo.titulo}</h3>
                      <p className="text-blue-100 text-sm">{acervo.cliente.nome}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(acervo)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(acervo)}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Descrição */}
                {acervo.descricao && (
                  <p className="text-sm text-zinc-500 line-clamp-2">{acervo.descricao}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <FileImage className="w-4 h-4" />
                    <span>{acervo.total_arquivos} arquivos</span>
                  </div>
                  {acervo.ultimo_sync && (
                    <span className="text-zinc-400 text-xs">
                      Sync: {new Date(acervo.ultimo_sync).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(acervo)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4" /> Copiar Link
                  </Button>
                  
                  {acervo.drive_folder_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSync(acervo.id)}
                      disabled={syncing === acervo.id}
                      className="flex-1"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === acervo.id ? 'animate-spin' : ''}`} />
                      {syncing === acervo.id ? 'Sincronizando...' : 'Sync'}
                    </Button>
                  )}

                  <Link href={`/cliente/${acervo.cliente.slug}/acervo/${acervo.slug}`} target="_blank">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editingAcervo ? '✏️ Editar Acervo' : '➕ Novo Acervo'} 
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            <select
              value={form.cliente_id}
              onChange={e => setForm({ ...form, cliente_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 bg-white"
              required
              disabled={!!editingAcervo}
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <Label>Título *</Label>
            <Input
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Fotos de Produtos"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <Label>Slug (URL)</Label>
            <Input
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder="auto-gerado se vazio"
            />
            {form.cliente_id && (
              <p className="text-xs text-zinc-400 mt-1">
                URL: /cliente/{clientes.find(c => c.id === form.cliente_id)?.slug}/acervo/{form.slug || 'slug'}
              </p>
            )}
          </div>

          {/* Ícone */}
          <div>
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {ICONES.map(icone => (
                <button
                  key={icone}
                  type="button"
                  onClick={() => setForm({ ...form, icone })}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    form.icone === icone 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {icone}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição do acervo..."
              rows={2}
            />
          </div>

          {/* URL do Drive */}
          <div>
            <Label>📁 Link da Pasta do Google Drive</Label>
            <Input
              value={form.drive_folder_url}
              onChange={e => setForm({ ...form, drive_folder_url: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
            />
            <p className="text-xs text-zinc-400 mt-1">
              Cole o link da pasta do Google Drive. A pasta deve ser pública ou compartilhada.
            </p>
          </div>

          {/* Visibilidade */}
          <div>
            <Label>Visibilidade</Label>
            <select
              value={form.visibilidade}
              onChange={e => setForm({ ...form, visibilidade: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 bg-white"
            >
              <option value="publico">🌐 Público (qualquer um com o link)</option>
              <option value="privado">🔒 Privado (só cliente logado)</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? '⏳ Salvando...' : '💾 Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
