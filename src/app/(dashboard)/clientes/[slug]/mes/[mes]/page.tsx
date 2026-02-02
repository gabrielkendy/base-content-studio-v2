'use client'

import { useState, useEffect, useCallback, DragEvent, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { MediaUpload } from '@/components/upload/media-upload'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Eye,
  ExternalLink as LinkIcon,
  GripVertical,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  Image as ImageIcon,
  LayoutGrid,
  Archive
} from 'lucide-react'
import type { Cliente, Conteudo, Member } from '@/types/database'
import Link from 'next/link'
import { MESES, TIPOS_CONTEUDO, CANAIS as CANAIS_CONFIG, STATUS_CONFIG, TIPO_EMOJI, normalizeStatus } from '@/lib/utils'
import { dispatchWebhook } from '@/lib/webhooks'

// ---------- constants ----------

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  producao: 'bg-blue-100 text-blue-800',
  aprovacao: 'bg-yellow-100 text-yellow-800',
  ajuste: 'bg-orange-100 text-orange-800',
  aprovado: 'bg-green-100 text-green-800',
  agendado: 'bg-indigo-100 text-indigo-800',
  publicado: 'bg-emerald-100 text-emerald-800',
}

const STATUS_DOT: Record<string, string> = {
  rascunho: 'bg-gray-400',
  producao: 'bg-blue-500',
  aprovacao: 'bg-yellow-500',
  ajuste: 'bg-orange-500',
  aprovado: 'bg-green-500',
  agendado: 'bg-indigo-500',
  publicado: 'bg-emerald-500',
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG)
  .filter(([key]) => key !== 'nova_solicitacao')
  .map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
    emoji: cfg.emoji,
    color: STATUS_COLORS[key] || 'bg-gray-100 text-gray-800',
    dot: STATUS_DOT[key] || 'bg-gray-400',
  }))

const CANAIS = CANAIS_CONFIG.map(c => ({ id: c.id, label: c.label, icon: c.icon }))

const PLACEHOLDER_COLORS: Record<string, string> = {
  carrossel: 'from-blue-400 to-blue-600',
  post: 'from-purple-400 to-purple-600',
  stories: 'from-pink-400 to-pink-600',
  reels: 'from-red-400 to-red-600',
  feed: 'from-teal-400 to-teal-600',
  'vídeo': 'from-orange-400 to-orange-600',
}

// ---------- helpers ----------

function getWeekOfMonth(dateStr: string, mes: number, ano: number) {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfMonth = d.getDate()
  if (dayOfMonth <= 7) return 1
  if (dayOfMonth <= 14) return 2
  if (dayOfMonth <= 21) return 3
  return 4
}

function getWeekLabel(week: number, mes: number, ano: number) {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const daysInMonth = new Date(ano, mes, 0).getDate()
  const starts = [(week - 1) * 7 + 1]
  const ends = [Math.min(week * 7, daysInMonth)]
  const m = monthNames[mes - 1]
  return `Semana ${week} (${String(starts[0]).padStart(2, '0')}-${String(ends[0]).padStart(2, '0')} ${m})`
}

function groupByWeek(conteudos: Conteudo[], mes: number, ano: number) {
  const groups: Record<string, Conteudo[]> = {}
  const noDate: Conteudo[] = []

  conteudos.forEach(c => {
    if (!c.data_publicacao) {
      noDate.push(c)
      return
    }
    const week = getWeekOfMonth(c.data_publicacao, mes, ano)
    const key = `week-${week}`
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })

  const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  const result: { label: string; key: string; items: Conteudo[] }[] = sorted.map(([key, items]) => {
    const week = parseInt(key.split('-')[1])
    return { label: getWeekLabel(week, mes, ano), key, items }
  })

  if (noDate.length > 0) {
    result.push({ label: 'Sem data', key: 'no-date', items: noDate })
  }

  return result
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
}

// ---------- Repository types ----------

interface RepoFolder {
  name: string
  files: RepoFile[]
  expanded: boolean
}

interface RepoFile {
  name: string
  url: string
  type: string
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================

export default function ConteudosMesPage() {
  const params = useParams()
  const slug = params.slug as string
  const mes = parseInt(params.mes as string)
  const { org, member } = useAuth()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'conteudos' | 'repositorio'>('conteudos')

  // Repository state
  const [folders, setFolders] = useState<RepoFolder[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null)
  const folderFileRef = useRef<HTMLInputElement>(null)

  const ano = new Date().getFullYear()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'carrossel',
    descricao: '',
    data_publicacao: '',
    badge: '',
    canais: [] as string[],
    status: 'rascunho',
    assigned_to: '',
    slides: [''],
    prompt_imagem: '',
    prompt_video: '',
    legenda: '',
    midia_urls: [] as string[]
  })

  // ---------- data loading ----------

  useEffect(() => {
    if (org?.id) {
      loadCliente()
      loadMembers()
    }
  }, [org?.id, slug])

  useEffect(() => {
    if (cliente?.id) {
      loadConteudos()
    }
  }, [cliente?.id, mes])

  useEffect(() => {
    if (org?.id && cliente?.id && activeTab === 'repositorio') {
      loadFolders()
    }
  }, [org?.id, cliente?.id, activeTab])

  const loadCliente = async () => {
    try {
      const { data, error } = await db.select('clientes', {
        filters: [
          { op: 'eq', col: 'org_id', val: org?.id },
          { op: 'eq', col: 'slug', val: slug },
        ],
        single: true,
      })
      if (error) throw new Error(error)
      setCliente(data)
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const { data, error } = await db.select('members', {
        filters: [
          { op: 'eq', col: 'org_id', val: org?.id },
          { op: 'eq', col: 'status', val: 'active' },
        ],
        order: [{ col: 'display_name', asc: true }],
      })
      if (error) throw new Error(error)
      setMembers(data || [])
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    }
  }

  const loadConteudos = async () => {
    try {
      setLoading(true)
      const { data, error } = await db.select('conteudos', {
        select: '*',
        filters: [
          { op: 'eq', col: 'org_id', val: org?.id },
          { op: 'eq', col: 'empresa_id', val: cliente?.id },
          { op: 'eq', col: 'mes', val: mes },
          { op: 'eq', col: 'ano', val: ano },
        ],
        order: [{ col: 'ordem', asc: true }],
      })
      if (error) throw new Error(error)
      const normalized = (data || []).map((c: Conteudo) => ({
        ...c,
        status: normalizeStatus(c.status || 'rascunho'),
      }))
      setConteudos(normalized)
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error)
    } finally {
      setLoading(false)
    }
  }

  // ---------- Repository functions ----------

  const loadFolders = async () => {
    if (!org?.id || !cliente?.id) return
    try {
      const basePath = `${org.id}/${cliente.id}/repositorio`
      const { data: folderList, error } = await supabase.storage.from('client-assets').list(basePath, { limit: 100 })

      if (error) {
        // Try post-media bucket as fallback
        const { data: folderList2 } = await supabase.storage.from('post-media').list(basePath, { limit: 100 })
        if (folderList2) {
          const loadedFolders = await Promise.all(
            folderList2
              .filter(f => f.id === null || f.name)
              .map(async (f) => {
                const { data: files } = await supabase.storage.from('post-media').list(`${basePath}/${f.name}`, { limit: 100 })
                return {
                  name: f.name,
                  expanded: false,
                  files: (files || []).filter(file => file.name && file.id).map(file => {
                    const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(`${basePath}/${f.name}/${file.name}`)
                    return { name: file.name, url: urlData.publicUrl, type: file.metadata?.mimetype || '' }
                  }),
                }
              })
          )
          setFolders(loadedFolders)
          return
        }
        return
      }

      if (folderList) {
        const loadedFolders = await Promise.all(
          folderList
            .filter(f => f.id === null || f.name)
            .map(async (f) => {
              const { data: files } = await supabase.storage.from('client-assets').list(`${basePath}/${f.name}`, { limit: 100 })
              return {
                name: f.name,
                expanded: false,
                files: (files || []).filter(file => file.name && file.id).map(file => {
                  const { data: urlData } = supabase.storage.from('client-assets').getPublicUrl(`${basePath}/${f.name}/${file.name}`)
                  return { name: file.name, url: urlData.publicUrl, type: file.metadata?.mimetype || '' }
                }),
              }
            })
        )
        setFolders(loadedFolders)
      }
    } catch (err) {
      console.error('Erro ao carregar repositório:', err)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim() || !org?.id || !cliente?.id) return
    const basePath = `${org.id}/${cliente.id}/repositorio/${newFolderName.trim()}/.keep`
    const { error } = await supabase.storage.from('client-assets').upload(basePath, new Blob(['']))
    if (error) {
      // try post-media
      await supabase.storage.from('post-media').upload(basePath, new Blob(['']))
    }
    setNewFolderName('')
    setShowNewFolder(false)
    loadFolders()
  }

  const toggleFolder = (name: string) => {
    setFolders(prev => prev.map(f => f.name === name ? { ...f, expanded: !f.expanded } : f))
  }

  const handleFolderUpload = async (folderName: string, files: FileList) => {
    if (!org?.id || !cliente?.id) return
    setUploadingFolder(folderName)
    const basePath = `${org.id}/${cliente.id}/repositorio/${folderName}`

    for (const file of Array.from(files)) {
      const filePath = `${basePath}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('client-assets').upload(filePath, file)
      if (error) {
        await supabase.storage.from('post-media').upload(filePath, file)
      }
    }
    setUploadingFolder(null)
    loadFolders()
  }

  // ---------- CRUD ----------

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org?.id || !cliente?.id) return

    try {
      const slides = formData.slides.filter(slide => slide.trim())
      const payload: Record<string, unknown> = {
        org_id: org.id,
        empresa_id: cliente.id,
        mes,
        ano,
        titulo: formData.titulo,
        tipo: formData.tipo,
        descricao: formData.descricao || null,
        data_publicacao: formData.data_publicacao || null,
        badge: formData.badge || null,
        canais: formData.canais,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        slides,
        prompts_imagem: [formData.prompt_imagem].filter(Boolean),
        prompts_video: [formData.prompt_video].filter(Boolean),
        legenda: formData.legenda || null,
        midia_urls: formData.midia_urls,
        updated_at: new Date().toISOString(),
      }

      const previousStatus = editingId ? conteudos.find(c => c.id === editingId)?.status : null

      if (editingId) {
        const { error } = await db.update('conteudos', payload, { id: editingId })
        if (error) throw new Error(error)
        if (previousStatus && previousStatus !== formData.status) {
          dispatchWebhook(org.id, 'content.status_changed', { conteudo_id: editingId, old_status: previousStatus, new_status: formData.status, titulo: formData.titulo })
        }
      } else {
        (payload as Record<string, unknown>).ordem = conteudos.length + 1
        const { data: inserted, error } = await db.insert('conteudos', payload, { select: 'id', single: true })
        if (error) throw new Error(error)
        dispatchWebhook(org.id, 'content.created', { conteudo_id: inserted?.id, titulo: formData.titulo, tipo: formData.tipo })
      }

      setShowModal(false)
      resetForm()
      loadConteudos()
    } catch (error) {
      console.error('Erro ao salvar conteúdo:', error)
      alert(`Erro ao salvar conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      tipo: 'carrossel',
      descricao: '',
      data_publicacao: '',
      badge: '',
      canais: [],
      status: 'rascunho',
      assigned_to: '',
      slides: [''],
      prompt_imagem: '',
      prompt_video: '',
      legenda: '',
      midia_urls: []
    })
    setEditingId(null)
  }

  const handleEdit = (conteudo: Conteudo) => {
    setFormData({
      titulo: conteudo.titulo || '',
      tipo: conteudo.tipo,
      descricao: conteudo.descricao || '',
      data_publicacao: conteudo.data_publicacao || '',
      badge: conteudo.badge || '',
      canais: Array.isArray(conteudo.canais) ? conteudo.canais : [],
      status: conteudo.status,
      assigned_to: conteudo.assigned_to || '',
      slides: Array.isArray(conteudo.slides) && conteudo.slides.length > 0 ? conteudo.slides : [''],
      prompt_imagem: Array.isArray(conteudo.prompts_imagem) ? conteudo.prompts_imagem[0] || '' : '',
      prompt_video: Array.isArray(conteudo.prompts_video) ? conteudo.prompts_video[0] || '' : '',
      legenda: conteudo.legenda || '',
      midia_urls: Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
    })
    setEditingId(conteudo.id)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return
    try {
      const { error } = await db.delete('conteudos', { id })
      if (error) throw new Error(error)
      loadConteudos()
    } catch (error) {
      console.error('Erro ao excluir conteúdo:', error)
      alert(`Erro ao excluir conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const oldStatus = conteudos.find(c => c.id === id)?.status
      const { error } = await db.update('conteudos', { status, updated_at: new Date().toISOString() }, { id })
      if (error) throw new Error(error)
      if (org?.id && oldStatus !== status) {
        dispatchWebhook(org.id, 'content.status_changed', { conteudo_id: id, old_status: oldStatus, new_status: status })
      }
      loadConteudos()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const generateApprovalLink = async (id: string) => {
    try {
      const token = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
      const { error } = await db.insert('aprovacoes_links', {
        conteudo_id: id,
        empresa_id: cliente?.id,
        token,
        status: 'pendente',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (error) throw new Error(error)
      const link = `${window.location.origin}/aprovacao?token=${token}`
      await navigator.clipboard.writeText(link)
      alert('Link de aprovação copiado para área de transferência!')
    } catch (error) {
      console.error('Erro ao gerar link de aprovação:', error)
      alert(`Erro ao gerar link: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const generateDeliveryLink = async (id: string) => {
    try {
      const { data: existing } = await db.select('aprovacoes_links', {
        filters: [{ op: 'eq', col: 'conteudo_id', val: id }],
        order: [{ col: 'created_at', asc: false }],
        limit: 1,
      })
      let token: string
      if (existing && existing.length > 0) {
        token = existing[0].token
      } else {
        token = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
        await db.insert('aprovacoes_links', {
          conteudo_id: id,
          empresa_id: cliente?.id,
          token,
          status: 'pendente',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
      const link = `${window.location.origin}/entrega?token=${token}`
      await navigator.clipboard.writeText(link)
      alert('Link de entrega copiado! Envie pro cliente para download dos materiais.')
    } catch (error) {
      console.error('Erro ao gerar link:', error)
      alert(`Erro ao gerar link: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const addSlide = () => {
    setFormData(prev => ({ ...prev, slides: [...prev.slides, ''] }))
  }

  const updateSlide = (index: number, value: string) => {
    setFormData(prev => ({ ...prev, slides: prev.slides.map((s, i) => i === index ? value : s) }))
  }

  const removeSlide = (index: number) => {
    setFormData(prev => ({ ...prev, slides: prev.slides.filter((_, i) => i !== index) }))
  }

  // Drag & drop for reorder
  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = async (e: DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    const draggedIndex = conteudos.findIndex(c => c.id === draggedId)
    const targetIndex = conteudos.findIndex(c => c.id === targetId)
    const newConteudos = [...conteudos]
    const [draggedItem] = newConteudos.splice(draggedIndex, 1)
    newConteudos.splice(targetIndex, 0, draggedItem)
    const updatePromises = newConteudos.map((conteudo, index) =>
      db.update('conteudos', { ordem: index + 1 }, { id: conteudo.id })
    )
    try {
      await Promise.all(updatePromises)
      setConteudos(newConteudos)
    } catch (error) {
      console.error('Erro ao reordenar:', error)
    }
    setDraggedId(null)
  }

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  }

  const formatDate = (date: string | null) => {
    if (!date) return ''
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const getMemberName = (userId: string | null) => {
    if (!userId) return null
    const m = members.find(m => m.user_id === userId)
    return m?.display_name || null
  }

  const getMemberAvatar = (userId: string | null) => {
    if (!userId) return null
    const m = members.find(m => m.user_id === userId)
    return m?.avatar_url || null
  }

  const getMemberInitials = (userId: string | null) => {
    const name = getMemberName(userId)
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  // ---------- RENDER ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const weekGroups = groupByWeek(conteudos, mes, ano)

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
            <Link href={`/clientes/${slug}`} className="hover:text-blue-600 transition-colors">
              {cliente?.nome}
            </Link>
            <span>›</span>
            <span>{MESES[mes - 1]} {ano}</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Conteúdos do Mês</h1>
        </div>
        <Button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab('conteudos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'conteudos'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Conteúdos
          <span className="ml-1 text-xs bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">
            {conteudos.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('repositorio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'repositorio'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          Repositório
        </button>
      </div>

      {activeTab === 'conteudos' ? (
        <>
          {/* Compact Status Pipeline */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {STATUS_OPTIONS.map(statusOpt => {
              const count = conteudos.filter(c => c.status === statusOpt.value).length
              return (
                <div
                  key={statusOpt.value}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusOpt.color} ${count === 0 ? 'opacity-50' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusOpt.dot}`} />
                  {statusOpt.label}
                  <span className="font-bold">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Empty State */}
          {conteudos.length === 0 ? (
            <Card className="p-12 text-center border border-zinc-100 rounded-xl">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Nenhum conteúdo planejado</h3>
              <p className="text-zinc-500 mb-6">Comece criando o primeiro conteúdo para {MESES[mes - 1]}</p>
              <Button onClick={() => { resetForm(); setShowModal(true) }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Conteúdo
              </Button>
            </Card>
          ) : (
            /* Grouped Card Grid */
            <div className="space-y-8">
              {weekGroups.map(group => (
                <div key={group.key}>
                  {/* Week header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                      {group.label}
                    </h2>
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-xs text-zinc-400">{group.items.length} conteúdo(s)</span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map(conteudo => (
                      <ContentCard
                        key={conteudo.id}
                        conteudo={conteudo}
                        getStatusConfig={getStatusConfig}
                        formatDate={formatDate}
                        getMemberInitials={getMemberInitials}
                        getMemberAvatar={getMemberAvatar}
                        getMemberName={getMemberName}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdateStatus={updateStatus}
                        onApprovalLink={generateApprovalLink}
                        onDeliveryLink={generateDeliveryLink}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ===== REPOSITÓRIO TAB ===== */
        <RepositorioTab
          folders={folders}
          showNewFolder={showNewFolder}
          setShowNewFolder={setShowNewFolder}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          createFolder={createFolder}
          toggleFolder={toggleFolder}
          uploadingFolder={uploadingFolder}
          handleFolderUpload={handleFolderUpload}
          folderFileRef={folderFileRef}
        />
      )}

      {/* ===== Create/Edit Modal ===== */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingId ? 'Editar Conteúdo' : 'Novo Conteúdo'}
        size="xl"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Título *</label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título do conteúdo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_CONTEUDO.map((tipo: string) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_EMOJI[tipo] || ''} {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição do conteúdo..."
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Data de Publicação</label>
              <Input
                type="date"
                value={formData.data_publicacao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_publicacao: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Badge/Tema</label>
              <Input
                value={formData.badge}
                onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Ex: VIRAL, TREND"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.emoji} {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Responsável</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar responsável</option>
              {members.map(m => (
                <option key={m.id} value={m.user_id}>
                  {m.display_name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Canais</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CANAIS.map(canal => (
                <label key={canal.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.canais.includes(canal.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, canais: [...prev.canais, canal.id] }))
                      } else {
                        setFormData(prev => ({ ...prev, canais: prev.canais.filter(c => c !== canal.id) }))
                      }
                    }}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-sm">{canal.icon} {canal.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Slides</label>
            <div className="space-y-2">
              {formData.slides.map((slide, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={slide}
                    onChange={(e) => updateSlide(index, e.target.value)}
                    placeholder={`Slide ${index + 1}`}
                  />
                  {formData.slides.length > 1 && (
                    <Button type="button" variant="outline" onClick={() => removeSlide(index)} className="px-3">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSlide} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Slide
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Prompt de Imagem</label>
              <textarea
                value={formData.prompt_imagem}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_imagem: e.target.value }))}
                placeholder="Prompt para geração de imagens..."
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Prompt de Vídeo</label>
              <textarea
                value={formData.prompt_video}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_video: e.target.value }))}
                placeholder="Prompt para geração de vídeos..."
                rows={3}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Legenda</label>
            <textarea
              value={formData.legenda}
              onChange={(e) => setFormData(prev => ({ ...prev, legenda: e.target.value }))}
              placeholder="Legenda para publicação..."
              rows={4}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Mídia</label>
            <MediaUpload
              orgId={org?.id}
              conteudoId={editingId || undefined}
              existingUrls={formData.midia_urls}
              onUpload={(urls) => setFormData(prev => ({ ...prev, midia_urls: urls }))}
              maxFiles={10}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm() }}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {editingId ? 'Atualizar' : 'Criar'} Conteúdo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ==========================================================
// CONTENT CARD COMPONENT
// ==========================================================

interface ContentCardProps {
  conteudo: Conteudo
  getStatusConfig: (status: string) => { value: string; label: string; emoji: string; color: string; dot: string }
  formatDate: (date: string | null) => string
  getMemberInitials: (userId: string | null) => string
  getMemberAvatar: (userId: string | null) => string | null
  getMemberName: (userId: string | null) => string | null
  onEdit: (conteudo: Conteudo) => void
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
  onApprovalLink: (id: string) => void
  onDeliveryLink: (id: string) => void
  onDragStart: (e: DragEvent, id: string) => void
  onDragOver: (e: DragEvent) => void
  onDrop: (e: DragEvent, id: string) => void
}

function ContentCard({
  conteudo,
  getStatusConfig,
  formatDate,
  getMemberInitials,
  getMemberAvatar,
  getMemberName,
  onEdit,
  onDelete,
  onUpdateStatus,
  onApprovalLink,
  onDeliveryLink,
  onDragStart,
  onDragOver,
  onDrop,
}: ContentCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const statusConfig = getStatusConfig(conteudo.status)
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []
  const midias = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
  const firstImage = midias.find(u => isImageUrl(u))
  const tipoEmoji = TIPO_EMOJI[conteudo.tipo] || '📄'
  const placeholderGradient = PLACEHOLDER_COLORS[conteudo.tipo] || 'from-zinc-400 to-zinc-600'

  return (
    <>
      <div
        className="group bg-white border border-zinc-100 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        draggable
        onDragStart={(e) => onDragStart(e as unknown as DragEvent, conteudo.id)}
        onDragOver={(e) => onDragOver(e as unknown as DragEvent)}
        onDrop={(e) => onDrop(e as unknown as DragEvent, conteudo.id)}
        onClick={() => setShowDetail(true)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-square overflow-hidden">
          {firstImage ? (
            <img
              src={firstImage}
              alt={conteudo.titulo || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${placeholderGradient} flex items-center justify-center`}>
              <span className="text-5xl opacity-80">{tipoEmoji}</span>
            </div>
          )}

          {/* Type badge overlay */}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              {tipoEmoji} {conteudo.tipo}
            </span>
          </div>

          {/* Status badge overlay */}
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </span>
          </div>

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(conteudo) }}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-zinc-50 transition-colors"
                title="Editar"
              >
                <Edit className="w-4 h-4 text-zinc-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onApprovalLink(conteudo.id) }}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-zinc-50 transition-colors"
                title="Link de Aprovação"
              >
                <LinkIcon className="w-4 h-4 text-zinc-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeliveryLink(conteudo.id) }}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-zinc-50 transition-colors"
                title="Link de Entrega"
              >
                <Download className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conteudo.id) }}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3">
          <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 mb-2 min-h-[2.5rem]">
            {conteudo.titulo || 'Sem título'}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {conteudo.data_publicacao && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(conteudo.data_publicacao)}
                </span>
              )}
              {canais.length > 0 && (
                <span className="flex items-center text-xs">
                  {canais.slice(0, 3).map((canalId: string) => {
                    const canal = CANAIS.find(c => c.id === canalId)
                    return canal ? <span key={canalId} className="mr-0.5">{canal.icon}</span> : null
                  })}
                  {canais.length > 3 && <span className="text-zinc-400 ml-0.5">+{canais.length - 3}</span>}
                </span>
              )}
            </div>

            {conteudo.assigned_to && (
              <div
                className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-medium text-zinc-600 overflow-hidden flex-shrink-0"
                title={getMemberName(conteudo.assigned_to) || ''}
              >
                {getMemberAvatar(conteudo.assigned_to) ? (
                  <img
                    src={getMemberAvatar(conteudo.assigned_to)!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getMemberInitials(conteudo.assigned_to)
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title={conteudo.titulo || 'Detalhes do Conteúdo'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Media preview */}
          {midias.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {midias.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100">
                  {isImageUrl(url) ? (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                        Abrir mídia
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-zinc-500 font-medium">Tipo</span>
              <p className="text-sm text-zinc-900">{tipoEmoji} {conteudo.tipo}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-medium">Status</span>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={conteudo.status}
                  onChange={(e) => { e.stopPropagation(); onUpdateStatus(conteudo.id, e.target.value) }}
                  className="text-sm border border-zinc-300 rounded-lg px-2 py-1"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-medium">Data de Publicação</span>
              <p className="text-sm text-zinc-900">{formatDate(conteudo.data_publicacao) || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-medium">Responsável</span>
              <p className="text-sm text-zinc-900">{getMemberName(conteudo.assigned_to) || '—'}</p>
            </div>
          </div>

          {conteudo.descricao && (
            <div>
              <span className="text-xs text-zinc-500 font-medium">Descrição</span>
              <p className="text-sm text-zinc-700 mt-1 whitespace-pre-wrap">{conteudo.descricao}</p>
            </div>
          )}

          {conteudo.legenda && (
            <div>
              <span className="text-xs text-zinc-500 font-medium">Legenda</span>
              <p className="text-sm text-zinc-700 mt-1 whitespace-pre-wrap bg-zinc-50 p-3 rounded-lg">{conteudo.legenda}</p>
            </div>
          )}

          {Array.isArray(conteudo.slides) && conteudo.slides.filter(Boolean).length > 0 && (
            <div>
              <span className="text-xs text-zinc-500 font-medium">Slides</span>
              <div className="space-y-1 mt-1">
                {conteudo.slides.filter(Boolean).map((slide, i) => (
                  <div key={i} className="text-sm text-zinc-700 bg-zinc-50 px-3 py-2 rounded-lg">
                    <span className="text-zinc-400 mr-2">{i + 1}.</span>{slide}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canais */}
          {canais.length > 0 && (
            <div>
              <span className="text-xs text-zinc-500 font-medium">Canais</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {canais.map((canalId: string) => {
                  const canal = CANAIS.find(c => c.id === canalId)
                  return canal ? (
                    <span key={canalId} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded-lg text-xs text-zinc-700">
                      {canal.icon} {canal.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-4 border-t border-zinc-100">
            <Button size="sm" onClick={() => { setShowDetail(false); onEdit(conteudo) }} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onApprovalLink(conteudo.id)}>
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
              Link Aprovação
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDeliveryLink(conteudo.id)}>
              <Download className="w-3.5 h-3.5 mr-1.5 text-green-600" />
              Link Entrega
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowDetail(false); onDelete(conteudo.id) }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ==========================================================
// REPOSITORIO TAB
// ==========================================================

interface RepositorioTabProps {
  folders: RepoFolder[]
  showNewFolder: boolean
  setShowNewFolder: (v: boolean) => void
  newFolderName: string
  setNewFolderName: (v: string) => void
  createFolder: () => void
  toggleFolder: (name: string) => void
  uploadingFolder: string | null
  handleFolderUpload: (folderName: string, files: FileList) => void
  folderFileRef: React.RefObject<HTMLInputElement | null>
}

function RepositorioTab({
  folders,
  showNewFolder,
  setShowNewFolder,
  newFolderName,
  setNewFolderName,
  createFolder,
  toggleFolder,
  uploadingFolder,
  handleFolderUpload,
  folderFileRef,
}: RepositorioTabProps) {
  const [activeFolderUpload, setActiveFolderUpload] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Organize seus arquivos de referência, templates e materiais por pasta.
        </p>
        <Button
          variant="outline"
          onClick={() => setShowNewFolder(!showNewFolder)}
          className="gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          Nova Pasta
        </Button>
      </div>

      {/* New folder form */}
      {showNewFolder && (
        <div className="flex items-center gap-2 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
          <Folder className="w-5 h-5 text-zinc-400" />
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nome da pasta..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            autoFocus
          />
          <Button size="sm" onClick={createFolder} className="bg-blue-600 hover:bg-blue-700">
            Criar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNewFolder(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Folders list */}
      {folders.length === 0 ? (
        <Card className="p-12 text-center border border-zinc-100 rounded-xl">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhuma pasta criada</h3>
          <p className="text-zinc-500 mb-4">Crie pastas para organizar os materiais do cliente</p>
          <Button variant="outline" onClick={() => setShowNewFolder(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            Criar Primeira Pasta
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {folders.filter(f => f.name !== '.keep').map(folder => (
            <div key={folder.name} className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
              {/* Folder header */}
              <button
                onClick={() => toggleFolder(folder.name)}
                className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors"
              >
                {folder.expanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                )}
                {folder.expanded ? (
                  <FolderOpen className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Folder className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium text-zinc-900 flex-1 text-left">{folder.name}</span>
                <span className="text-xs text-zinc-400">
                  {folder.files.filter(f => f.name !== '.keep').length} arquivo(s)
                </span>
              </button>

              {/* Folder content */}
              {folder.expanded && (
                <div className="px-4 pb-4 border-t border-zinc-100">
                  {/* Upload button */}
                  <div className="flex items-center gap-2 py-3">
                    <input
                      ref={activeFolderUpload === folder.name ? folderFileRef : undefined}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.psd,.ai,.svg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFolderUpload(folder.name, e.target.files)
                      }}
                      id={`upload-${folder.name}`}
                    />
                    <label
                      htmlFor={`upload-${folder.name}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-lg cursor-pointer transition-colors"
                      onClick={() => setActiveFolderUpload(folder.name)}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingFolder === folder.name ? 'Enviando...' : 'Upload'}
                    </label>
                  </div>

                  {/* File grid */}
                  {folder.files.filter(f => f.name !== '.keep').length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {folder.files.filter(f => f.name !== '.keep').map(file => (
                        <a
                          key={file.name}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/file relative aspect-square rounded-lg overflow-hidden bg-zinc-100 hover:ring-2 hover:ring-blue-400 transition-all"
                        >
                          {isImageUrl(file.name) ? (
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                              <ImageIcon className="w-8 h-8 text-zinc-300" />
                              <span className="text-[10px] text-zinc-500 text-center truncate w-full">{file.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover/file:bg-black/10 transition-colors" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 py-4 text-center">Pasta vazia — faça upload de arquivos</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
