'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  ExternalLink,
  Image as ImageIcon,
  Video,
  File,
  Copy,
  CheckCircle,
  Clock,
  Hash,
  Upload,
  X,
  Loader2,
  Plus,
  Download,
  Film,
  Trash2,
  History,
  Pencil,
  Save,
  Type,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { STATUS_CONFIG, TIPO_EMOJI, CANAIS, formatDateFull } from '@/lib/utils'
import type { Conteudo, Cliente, Member } from '@/types/database'
import Link from 'next/link'
import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import { InternalApprovalActions } from '@/components/InternalApprovalActions'
import { ScheduleModal } from '@/components/ScheduleModal'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export default function ConteudoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const conteudoId = params.id as string
  const { org, member } = useAuth()

  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Team members for assignee dropdown
  const [teamMembers, setTeamMembers] = useState<Member[]>([])
  const [savingAssignee, setSavingAssignee] = useState(false)

  // Inline edit states
  const [editingField, setEditingField] = useState<'titulo' | 'descricao' | 'legenda' | 'data_publicacao' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editTimeValue, setEditTimeValue] = useState('') // Para hora
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const fileInputRef = useState<HTMLInputElement | null>(null)

  // Cover/Thumbnail state para Reels
  const [showCoverSelector, setShowCoverSelector] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Preview mode (tamanho real)
  const [previewMode, setPreviewMode] = useState<'feed' | 'reels' | 'story' | null>(null)

  // Current user info for approvals
  const currentUser = member ? {
    id: member.user_id,
    display_name: member.display_name,
    role: member.role,
  } : null

  useEffect(() => {
    if (org?.id) loadData()
  }, [org?.id, conteudoId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load conteudo (sem join - mais seguro)
      const { data: c, error: cErr } = await db.select('conteudos', {
        select: '*',
        filters: [{ op: 'eq', col: 'id', val: conteudoId }],
        single: true,
      })
      if (cErr) throw new Error(cErr)
      
      // Load team members for assignee dropdown
      let members: Member[] = []
      if (org?.id) {
        const { data: membersData, error: memErr } = await db.select('members', {
          filters: [
            { op: 'eq', col: 'org_id', val: org.id },
            { op: 'eq', col: 'status', val: 'active' },
          ],
          order: { col: 'display_name', asc: true },
        })
        if (!memErr && membersData) {
          members = membersData
          setTeamMembers(members)
        }
      }

      // Se tem assigned_to, busca o member correspondente
      if (c?.assigned_to && members.length > 0) {
        const assignee = members.find(m => m.user_id === c.assigned_to)
        if (assignee) {
          c.assignee = assignee
        }
      }
      
      setConteudo(c)

      // Load cliente
      if (c?.empresa_id) {
        const { data: cl, error: clErr } = await db.select('clientes', {
          filters: [{ op: 'eq', col: 'id', val: c.empresa_id }],
          single: true,
        })
        if (clErr) throw new Error(clErr)
        setCliente(cl)
      }
    } catch (err) {
      console.error('Erro ao carregar conteúdo:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!conteudo) return
    try {
      const { error } = await db.update('conteudos', { status, updated_at: new Date().toISOString() }, { id: conteudo.id })
      if (error) throw new Error(error)
      setConteudo(prev => prev ? { ...prev, status } : null)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert('Erro ao atualizar status')
    }
  }

  // Inline edit functions
  const startEditing = (field: 'titulo' | 'descricao' | 'legenda' | 'data_publicacao') => {
    if (!conteudo) return
    setEditingField(field)
    
    if (field === 'data_publicacao') {
      console.log('🔵 Abrindo edição de data. Valor atual:', conteudo.data_publicacao)
      
      if (conteudo.data_publicacao) {
        const parsed = new Date(conteudo.data_publicacao)
        if (!isNaN(parsed.getTime())) {
          // Formato YYYY-MM-DD para input date
          const year = parsed.getFullYear()
          const month = (parsed.getMonth() + 1).toString().padStart(2, '0')
          const day = parsed.getDate().toString().padStart(2, '0')
          setEditValue(`${year}-${month}-${day}`)
          
          // Hora no formato HH:mm
          const hours = parsed.getHours().toString().padStart(2, '0')
          const minutes = parsed.getMinutes().toString().padStart(2, '0')
          setEditTimeValue(`${hours}:${minutes}`)
          
          console.log('🔵 Data parseada:', { year, month, day, hours, minutes })
        } else {
          // Data inválida - limpar campos
          setEditValue('')
          setEditTimeValue('12:00')
        }
      } else {
        // Sem data - campos vazios (NÃO usar data atual)
        setEditValue('')
        setEditTimeValue('12:00')
      }
    } else {
      setEditValue(conteudo[field] || '')
      setEditTimeValue('')
    }
    
    // Auto-focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValue('')
    setEditTimeValue('')
  }

  const saveField = async () => {
    if (!conteudo || !editingField) return
    setSaving(true)
    try {
      let valueToSave: string | null = editValue.trim() || null

      // Se for data_publicacao, combinar data + hora
      if (editingField === 'data_publicacao') {
        if (editValue) {
          // Validar formato da data (YYYY-MM-DD)
          const dateParts = editValue.split('-')
          if (dateParts.length !== 3) {
            alert('Formato de data inválido')
            setSaving(false)
            return
          }
          const [year, month, day] = dateParts.map(Number)
          
          // Validar formato da hora (HH:mm) - default 12:00 se vazio
          const timeParts = (editTimeValue || '12:00').split(':')
          const hours = parseInt(timeParts[0]) || 12
          const minutes = parseInt(timeParts[1]) || 0
          
          // Criar data combinada (usando UTC para evitar problemas de timezone)
          const combinedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))
          
          // Verificar se a data é válida
          if (isNaN(combinedDate.getTime())) {
            alert('Data ou hora inválida')
            setSaving(false)
            return
          }
          
          valueToSave = combinedDate.toISOString()
        } else {
          valueToSave = null
        }
      }

      console.log('🔵 Salvando campo:', editingField, 'valor:', valueToSave)
      
      const { error } = await db.update('conteudos', {
        [editingField]: valueToSave,
        updated_at: new Date().toISOString(),
      }, { id: conteudo.id })

      if (error) {
        console.error('❌ Erro no update:', error)
        throw new Error(error)
      }

      console.log('✅ Salvo com sucesso!')

      // IMPORTANTE: Atualizar estado local DIRETAMENTE (evita problema de cache)
      setConteudo(prev => {
        if (!prev) return prev
        return {
          ...prev,
          [editingField]: valueToSave,
          updated_at: new Date().toISOString(),
        }
      })
      
      setEditingField(null)
      setEditValue('')
      setEditTimeValue('')
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  // Salvar assignee (membro da equipe)
  const saveAssignee = async (userId: string | null) => {
    if (!conteudo) return
    setSavingAssignee(true)
    try {
      const { error } = await db.update('conteudos', {
        assigned_to: userId,
        updated_at: new Date().toISOString(),
      }, { id: conteudo.id })

      if (error) throw new Error(error)

      // Atualizar estado local com o member completo
      const assignee = userId ? teamMembers.find(m => m.user_id === userId) : undefined
      setConteudo(prev => prev ? { ...prev, assigned_to: userId, assignee } : null)
    } catch (err) {
      console.error('Erro ao atribuir membro:', err)
      alert('Erro ao atribuir membro')
    } finally {
      setSavingAssignee(false)
    }
  }

  // Handle keyboard shortcuts in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelEditing()
    } else if (e.key === 'Enter' && e.ctrlKey) {
      saveField()
    }
  }

  const generateApprovalLink = async () => {
    if (!conteudo || !cliente || !org) return
    try {
      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      const { error } = await db.insert('aprovacoes_links', {
        conteudo_id: conteudo.id,
        empresa_id: cliente.id,
        token,
        status: 'pendente',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      if (error) throw new Error(error)

      // Registrar no histórico de aprovações
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: org.id,
          conteudo_id: conteudo.id,
          type: 'external',
          status: 'pending',
          reviewer_name: cliente.nome,
          previous_status: conteudo.status,
          link_token: token,
        }),
      })

      const link = `${window.location.origin}/aprovacao?token=${token}`
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Erro ao gerar link:', err)
      alert('Erro ao gerar link de aprovação')
    }
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
  const isVideo = (url: string) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url)

  // Upload files directly to Supabase via presigned URLs (supports GBs)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !conteudo || !cliente) return

    setUploading(true)
    const fileList = Array.from(files)
    const progress: Record<string, number> = {}
    fileList.forEach(f => { progress[f.name] = 0 })
    setUploadProgress({ ...progress })

    try {
      // Get presigned URLs
      const res = await fetch('/api/posts/media-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudoId: conteudo.id,
          clienteId: cliente.id,
          files: fileList.map(f => ({ name: f.name, type: f.type, size: f.size })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(`Erro: ${err.error}`)
        setUploading(false)
        return
      }

      const { urls: presigned } = await res.json()
      const newPublicUrls: string[] = []

      // Upload each file directly to Supabase Storage
      for (let i = 0; i < presigned.length; i++) {
        const file = fileList[i]
        const { uploadUrl, token, publicUrl } = presigned[i]

        try {
          const uploadRes = await new Promise<boolean>((resolve) => {
            const xhr = new XMLHttpRequest()
            xhr.open('PUT', uploadUrl)
            xhr.setRequestHeader('Content-Type', file.type)
            if (token) xhr.setRequestHeader('x-upsert', 'false')

            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable) {
                const pct = Math.round((ev.loaded / ev.total) * 100)
                setUploadProgress(prev => ({ ...prev, [file.name]: pct }))
              }
            }

            xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
            xhr.onerror = () => resolve(false)
            xhr.send(file)
          })

          if (uploadRes) {
            newPublicUrls.push(publicUrl)
          }
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err)
        }
      }

      // Update conteúdo with new media URLs
      if (newPublicUrls.length > 0) {
        const currentUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
        const updatedUrls = [...currentUrls, ...newPublicUrls]

        const { error } = await db.update('conteudos', {
          midia_urls: updatedUrls,
          updated_at: new Date().toISOString(),
        }, { id: conteudo.id })

        if (!error) {
          setConteudo(prev => prev ? { ...prev, midia_urls: updatedUrls } : null)
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Erro ao fazer upload')
    }

    setUploading(false)
    setUploadProgress({})
    // Reset input
    e.target.value = ''
  }

  const handleRemoveMedia = async (urlToRemove: string) => {
    if (!conteudo || !confirm('Remover este arquivo?')) return
    const currentUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
    const updatedUrls = currentUrls.filter((u: string) => u !== urlToRemove)

    const { error } = await db.update('conteudos', {
      midia_urls: updatedUrls,
      updated_at: new Date().toISOString(),
    }, { id: conteudo.id })

    if (!error) {
      setConteudo(prev => prev ? { ...prev, midia_urls: updatedUrls } : null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!conteudo) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Conteúdo não encontrado</h2>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[conteudo.status] || { emoji: '❓', label: conteudo.status, color: '#6B7280' }
  const slides = Array.isArray(conteudo.slides) ? conteudo.slides : []
  const canais = Array.isArray(conteudo.canais) ? conteudo.canais : []
  const mediaUrls = Array.isArray(conteudo.midia_urls) ? conteudo.midia_urls : []
  const promptsImagem = Array.isArray(conteudo.prompts_imagem) ? conteudo.prompts_imagem : []
  const promptsVideo = Array.isArray(conteudo.prompts_video) ? conteudo.prompts_video : []

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Back + Actions - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="self-start">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        {/* Actions - horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <Button variant="outline" onClick={generateApprovalLink} className="flex-shrink-0 text-sm">
            {linkCopied ? <CheckCircle className="w-4 h-4 sm:mr-2 text-green-600" /> : <Copy className="w-4 h-4 sm:mr-2" />}
            <span className="hidden sm:inline">{linkCopied ? 'Link Copiado!' : 'Link Aprovação'}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowScheduleModal(true)}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 flex-shrink-0 text-sm"
          >
            <Calendar className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Agendar</span>
          </Button>
          <Link href={`/clientes/${slug}/mes/${conteudo.mes}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 flex-shrink-0 text-sm">
              <Edit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Header Card */}
      <Card className="p-4 sm:p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-blue-100 text-blue-800">
                {TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}
              </Badge>
              {conteudo.badge && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Hash className="w-3 h-3 mr-1" />
                  {conteudo.badge}
                </Badge>
              )}
            </div>
            {editingField === 'titulo' ? (
              <div className="mb-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Título do conteúdo"
                  className="w-full text-2xl font-bold text-gray-900 border-2 border-blue-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" onClick={saveField} disabled={saving} className="bg-green-600 hover:bg-green-700">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <span className="text-xs text-gray-400">Ctrl+Enter para salvar, Esc para cancelar</span>
                </div>
              </div>
            ) : (
              <h1 
                className="text-2xl font-bold text-gray-900 mb-2 group cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2 py-1 -my-1 transition-colors"
                onClick={() => startEditing('titulo')}
              >
                {conteudo.titulo || <span className="text-gray-400 italic">Clique para adicionar título</span>}
                <Pencil className="w-4 h-4 inline-block ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Badge style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color, borderColor: statusCfg.color }}
              className="border">
              {statusCfg.emoji} {statusCfg.label}
            </Badge>
          </div>
          <select
            value={conteudo.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
        </div>

        {/* 🔴 FEEDBACK DO CLIENTE - Aparece quando tem ajuste pendente */}
        {(conteudo.status === 'ajuste' || (conteudo as any).comentario_cliente) && (
          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-800 mb-1">⚠️ Cliente pediu ajuste!</h4>
                {(conteudo as any).comentario_cliente ? (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{(conteudo as any).comentario_cliente}</p>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700">Verifique o histórico de aprovações para mais detalhes.</p>
                )}
                {(conteudo as any).cliente_nome && (
                  <p className="text-xs text-amber-600 mt-2">— {(conteudo as any).cliente_nome}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Data e Hora de Publicação - Editável */}
          {editingField === 'data_publicacao' ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Data e Hora do Post</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-sm border-2 border-blue-400 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  autoFocus
                />
                <input
                  type="time"
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  className="text-sm border-2 border-blue-400 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={saveField} disabled={saving} className="bg-green-600 hover:bg-green-700 h-8 px-2">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving} className="h-8 px-2">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="flex items-center text-sm text-gray-600 cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2 py-1 transition-colors group"
              onClick={() => startEditing('data_publicacao')}
            >
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              <div>
                {conteudo.data_publicacao ? (
                  <>
                    <span>{formatDateFull(conteudo.data_publicacao)}</span>
                    <span className="ml-2 text-blue-600 font-medium">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(conteudo.data_publicacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 italic">Clique para definir data e hora</span>
                )}
              </div>
              <Pencil className="w-3 h-3 ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Responsável (Assignee) - Editável */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-500" />
            <select
              value={conteudo.assigned_to || ''}
              onChange={(e) => saveAssignee(e.target.value || null)}
              disabled={savingAssignee}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white min-w-[140px] cursor-pointer hover:border-purple-400 transition-colors"
            >
              <option value="">Sem responsável</option>
              {teamMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name} ({m.role})
                </option>
              ))}
            </select>
            {savingAssignee && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
            {conteudo.assignee && !savingAssignee && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                {conteudo.assignee.role}
              </Badge>
            )}
          </div>

          {/* Canais */}
          {canais.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              {canais.map((canalId: string) => {
                const canal = CANAIS.find(c => c.id === canalId)
                return canal ? (
                  <Badge key={canalId} className="bg-gray-100 text-gray-700 text-xs">
                    {canal.icon} {canal.label}
                  </Badge>
                ) : null
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Descrição - sempre visível para poder adicionar */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">📝 Descrição</h3>
          {editingField !== 'descricao' && conteudo.descricao && (
            <button
              onClick={() => startEditing('descricao')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
        </div>
        
        {editingField === 'descricao' ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o conteúdo, referências, instruções para a equipe..."
              className="w-full min-h-[150px] text-sm text-gray-700 border-2 border-blue-500 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
            />
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={saveField} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <span className="text-xs text-gray-400">Ctrl+Enter para salvar, Esc para cancelar</span>
            </div>
          </div>
        ) : conteudo.descricao ? (
          <div 
            className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
            onClick={() => startEditing('descricao')}
          >
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {conteudo.descricao}
            </pre>
            <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
            onClick={() => startEditing('descricao')}
          >
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Clique para adicionar descrição</p>
          </div>
        )}
      </Card>

      {/* Slides */}
      {slides.length > 0 && slides.some((s: string) => s.trim()) && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📑 Slides ({slides.length})</h3>
          <div className="space-y-3">
            {slides.map((slide: string, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                <span className="text-xs font-medium text-blue-600 uppercase mb-1 block">
                  Slide {i + 1}
                </span>
                <p className="text-sm text-gray-700">{slide}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legenda - sempre visível para poder adicionar */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">📱 Legenda</h3>
          {editingField !== 'legenda' && conteudo.legenda && (
            <button
              onClick={() => startEditing('legenda')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
        </div>

        {editingField === 'legenda' ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite a legenda para o post...&#10;&#10;Inclua hashtags, menções, CTAs..."
              className="w-full min-h-[200px] text-sm text-gray-700 border-2 border-blue-500 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y font-sans"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveField} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar Legenda
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEditing} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
              </div>
              <span className="text-xs text-gray-400">
                {editValue.length} caracteres • Ctrl+Enter para salvar
              </span>
            </div>
          </div>
        ) : conteudo.legenda ? (
          <div 
            className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 cursor-pointer hover:from-purple-100 hover:to-blue-100 transition-all group border border-purple-100"
            onClick={() => startEditing('legenda')}
          >
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {conteudo.legenda}
            </pre>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-200/50">
              <span className="text-xs text-purple-600">{conteudo.legenda.length} caracteres</span>
              <span className="text-xs text-gray-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" /> Clique para editar
              </span>
            </div>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all"
            onClick={() => startEditing('legenda')}
          >
            <MessageSquare className="w-10 h-10 text-purple-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-purple-600">Clique para adicionar legenda</p>
            <p className="text-xs text-gray-400 mt-1">A legenda que será usada na publicação</p>
          </div>
        )}
      </Card>

      {/* Prompts AI */}
      {(promptsImagem.length > 0 || promptsVideo.length > 0) && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 Prompts de IA</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promptsImagem.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <ImageIcon className="w-4 h-4 mr-2" /> Prompt de Imagem
                </h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-blue-800 font-mono">
                    {promptsImagem[0]}
                  </pre>
                </div>
              </div>
            )}
            {promptsVideo.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2" /> Prompt de Vídeo
                </h4>
                <div className="bg-purple-50 rounded-lg p-3">
                  <pre className="whitespace-pre-wrap text-xs text-purple-800 font-mono">
                    {promptsVideo[0]}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Mídia + Upload */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📎 Mídia {mediaUrls.length > 0 && `(${mediaUrls.length})`}
          </h3>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.ai,.psd,.zip,.rar"
              onChange={handleMediaUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${uploading
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm hover:shadow-md'
              }`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploading ? 'Enviando...' : 'Adicionar Conteúdo'}
            </div>
          </label>
        </div>

        {/* Upload progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2 mb-4">
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">{name}</span>
                  <span className="text-xs text-blue-600 font-bold">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone quando vazio */}
        {mediaUrls.length === 0 && !uploading && (
          <label className="cursor-pointer block">
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.ai,.psd,.zip,.rar"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all">
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Arraste ou clique para adicionar</p>
              <p className="text-xs text-gray-400 mt-1">Imagens, vídeos, PDFs — sem limite de tamanho</p>
            </div>
          </label>
        )}

        {/* Media grid */}
        {mediaUrls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaUrls.map((url: string, i: number) => (
              <div key={i} className="relative group border rounded-lg overflow-hidden bg-white hover:shadow-md transition-all">
                {isImage(url) ? (
                  <img src={url} alt={`Mídia ${i + 1}`} className="w-full h-48 object-cover" />
                ) : isVideo(url) ? (
                  <div className="relative">
                    <video src={url} controls className="w-full h-48 object-cover" />
                    <Film className="absolute top-2 left-2 w-5 h-5 text-white drop-shadow-lg" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <File className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <a href={url} target="_blank" rel="noopener noreferrer" download
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <Download className="w-4 h-4 text-gray-700" />
                  </a>
                  <button type="button" onClick={() => handleRemoveMedia(url)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">Arquivo {i + 1}</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}

            {/* Add more button */}
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.ai,.psd,.zip,.rar"
                onChange={handleMediaUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="border-2 border-dashed border-gray-200 rounded-lg h-full min-h-[200px] flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <Plus className="w-8 h-8 text-gray-300 mb-2" />
                <span className="text-xs text-gray-400">Adicionar mais</span>
              </div>
            </label>
          </div>
        )}
      </Card>

      {/* Capa do Vídeo (Reels/Stories) - Só aparece se tem vídeo */}
      {mediaUrls.some((url: string) => isVideo(url)) && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🎬 Capa do Vídeo
              <Badge className="bg-purple-100 text-purple-700 text-xs">Reels/Stories</Badge>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCoverSelector(!showCoverSelector)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {showCoverSelector ? 'Fechar' : 'Definir Capa'}
            </Button>
          </div>
          
          {/* Capa atual */}
          {(conteudo as any).cover_url ? (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Capa selecionada:</p>
              <div className="relative w-32 h-40 rounded-lg overflow-hidden border-2 border-purple-400 shadow-lg">
                <img src={(conteudo as any).cover_url} alt="Capa" className="w-full h-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
              <Film className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhuma capa definida</p>
              <p className="text-xs text-gray-400">O primeiro frame será usado automaticamente</p>
            </div>
          )}

          {showCoverSelector && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {/* Opções de capa */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Upload customizado */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file || !conteudo || !cliente) return
                      setUploadingCover(true)
                      try {
                        // Get presigned URL
                        const res = await fetch('/api/posts/media-presign', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            conteudoId: conteudo.id,
                            clienteId: cliente.id,
                            files: [{ name: `cover-${file.name}`, type: file.type, size: file.size }],
                          }),
                        })
                        if (!res.ok) throw new Error('Erro ao fazer upload')
                        const { urls } = await res.json()
                        const { uploadUrl, publicUrl } = urls[0]
                        
                        // Upload
                        const uploadRes = await fetch(uploadUrl, {
                          method: 'PUT',
                          headers: { 'Content-Type': file.type },
                          body: file,
                        })
                        if (!uploadRes.ok) throw new Error('Erro no upload')
                        
                        // Salvar URL da capa
                        await db.update('conteudos', { cover_url: publicUrl, updated_at: new Date().toISOString() }, { id: conteudo.id })
                        setConteudo(prev => prev ? { ...prev, cover_url: publicUrl } as any : null)
                        setShowCoverSelector(false)
                      } catch (err) {
                        console.error('Erro:', err)
                        alert('Erro ao fazer upload da capa')
                      }
                      setUploadingCover(false)
                      e.target.value = ''
                    }}
                    disabled={uploadingCover}
                  />
                  <div className={`h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${uploadingCover ? 'border-gray-200 bg-gray-50' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer'}`}>
                    {uploadingCover ? (
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-purple-400 mb-1" />
                        <span className="text-xs text-purple-600 font-medium">Enviar Imagem</span>
                      </>
                    )}
                  </div>
                </label>

                {/* Frames do vídeo como opções */}
                {mediaUrls.filter((url: string) => isVideo(url)).slice(0, 1).map((videoUrl: string, i: number) => (
                  <div key={i} className="col-span-3 grid grid-cols-3 gap-2">
                    {[0, 25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        onClick={async () => {
                          // Usar thumbnail do vídeo (precisa de um serviço de processamento)
                          // Por agora, vamos só mostrar que pode selecionar
                          alert(`Seleção de frame ${pct}% - Em breve!`)
                        }}
                        className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex flex-col items-center justify-center border-2 border-gray-200 hover:border-purple-400 transition-all"
                      >
                        <Film className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500">Frame {pct}%</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Preview no Tamanho Real */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📱 Preview da Publicação
          </h3>
          <div className="flex items-center gap-2">
            {[
              { id: 'feed', label: 'Feed', ratio: '4:5', icon: '⬜' },
              { id: 'reels', label: 'Reels', ratio: '9:16', icon: '📱' },
              { id: 'story', label: 'Story', ratio: '9:16', icon: '⭕' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setPreviewMode(previewMode === mode.id ? null : mode.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  previewMode === mode.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>
        </div>

        {previewMode && mediaUrls.length > 0 && (
          <div className="flex justify-center py-6 bg-gray-900 rounded-xl">
            <div 
              className={`bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-700 relative ${
                previewMode === 'feed' ? 'w-[320px] aspect-[4/5]' : 'w-[280px] aspect-[9/16]'
              }`}
            >
              {/* Mockup header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  <div>
                    <p className="text-white text-xs font-semibold">{cliente?.nome || 'Perfil'}</p>
                    <p className="text-white/60 text-[10px]">Publicação</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              {isVideo(mediaUrls[0]) ? (
                <video 
                  ref={videoRef}
                  src={mediaUrls[0]} 
                  className="w-full h-full object-cover"
                  loop
                  muted
                  playsInline
                  autoPlay
                />
              ) : (
                <img src={mediaUrls[0]} alt="Preview" className="w-full h-full object-cover" />
              )}

              {/* Mockup footer */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/80 to-transparent">
                {conteudo?.legenda && (
                  <p className="text-white text-xs line-clamp-2 mb-2">{conteudo.legenda.substring(0, 100)}...</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/80">
                    <span className="text-lg">♡</span>
                    <span className="text-lg">💬</span>
                    <span className="text-lg">➤</span>
                  </div>
                  <span className="text-lg text-white/80">⊞</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!previewMode && (
          <div className="text-center py-8 text-gray-400">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione um formato acima para visualizar</p>
          </div>
        )}
      </Card>

      {/* Seção de Aprovações */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            ✅ Aprovações
          </h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Ocultar' : 'Ver'} Histórico
          </button>
        </div>

        {/* Ações de Aprovação Interna */}
        {currentUser && org && conteudo && (
          <div className="mb-6">
            <InternalApprovalActions
              conteudo={conteudo}
              currentUser={currentUser}
              orgId={org.id}
              onSuccess={loadData}
            />
          </div>
        )}

        {/* Botão de Enviar para Cliente (só aparece após aprovação interna) */}
        {conteudo?.internal_approved && conteudo.status === 'aprovacao' && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Pronto para enviar ao cliente</p>
                <p className="text-xs text-purple-600">Aprovado internamente, gere o link de aprovação</p>
              </div>
              <Button
                onClick={generateApprovalLink}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {linkCopied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {linkCopied ? 'Link Copiado!' : 'Gerar Link'}
              </Button>
            </div>
          </div>
        )}

        {/* Timeline de Histórico */}
        {showHistory && (
          <div className="border-t border-gray-100 pt-4">
            <ApprovalTimeline
              conteudoId={conteudoId}
              conteudo={conteudo || undefined}
            />
          </div>
        )}
      </Card>

      {/* Schedule Modal */}
      {cliente && conteudo && (
        <ScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          conteudoId={conteudo.id}
          conteudoTitulo={conteudo.titulo || undefined}
          conteudoLegenda={conteudo.legenda || undefined}
          clienteSlug={cliente.slug}
          onScheduled={loadData}
        />
      )}
    </div>
  )
}
