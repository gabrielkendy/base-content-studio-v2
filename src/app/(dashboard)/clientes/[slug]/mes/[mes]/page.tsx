'use client'

import { useState, useEffect, DragEvent } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
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
  AlertTriangle
} from 'lucide-react'
import type { Cliente, Conteudo, Member } from '@/types/database'
import Link from 'next/link'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const TIPOS_CONTEUDO = ['carrossel', 'post', 'stories', 'reels', 'igtv', 'feed']

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', color: 'bg-gray-100 text-gray-800' },
  { value: 'conteudo', label: 'Conteúdo', color: 'bg-blue-100 text-blue-800' },
  { value: 'design', label: 'Design', color: 'bg-purple-100 text-purple-800' },
  { value: 'aprovacao_cliente', label: 'Aprovação Cliente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ajustes', label: 'Ajustes', color: 'bg-orange-100 text-orange-800' },
  { value: 'aprovado_agendado', label: 'Aprovado/Agendado', color: 'bg-green-100 text-green-800' },
  { value: 'concluido', label: 'Concluído', color: 'bg-emerald-100 text-emerald-800' }
]

const CANAIS = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'youtube', label: 'YouTube', icon: '🔴' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' }
]

export default function ConteudosMesPage() {
  const params = useParams()
  const slug = params.slug as string
  const mes = parseInt(params.mes as string)
  const { org, member, supabase } = useAuth()
  
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  
  const ano = new Date().getFullYear()

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

  const loadCliente = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('org_id', org?.id)
        .eq('slug', slug)
        .single()

      if (error) throw error
      setCliente(data)
    } catch (error) {
      console.error('Erro ao carregar cliente:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('org_id', org?.id)
        .eq('status', 'active')
        .order('display_name')

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
    }
  }

  const loadConteudos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('conteudos')
        .select(`
          *,
          assignee:members!assigned_to(id, display_name)
        `)
        .eq('org_id', org?.id)
        .eq('empresa_id', cliente?.id)
        .eq('mes', mes)
        .eq('ano', ano)
        .order('ordem')

      if (error) throw error
      setConteudos(data || [])
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error)
      alert(`Erro ao carregar conteúdos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!org?.id || !cliente?.id) return

    try {
      const slides = formData.slides.filter(slide => slide.trim())
      
      const payload = {
        org_id: org.id,
        empresa_id: cliente.id,
        mes,
        ano,
        titulo: formData.titulo,
        tipo: formData.tipo,
        descricao: formData.descricao || null,
        data_publicacao: formData.data_publicacao || null,
        badge: formData.badge || null,
        canais: JSON.stringify(formData.canais),
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        slides: JSON.stringify(slides),
        prompts_imagem: JSON.stringify([formData.prompt_imagem].filter(Boolean)),
        prompts_video: JSON.stringify([formData.prompt_video].filter(Boolean)),
        legenda: formData.legenda || null,
        midia_urls: JSON.stringify(formData.midia_urls),
        ordem: editingId ? undefined : conteudos.length + 1,
        updated_at: new Date().toISOString()
      }

      if (editingId) {
        const { error } = await supabase
          .from('conteudos')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('conteudos')
          .insert(payload)

        if (error) throw error
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
      canais: typeof conteudo.canais === 'string' ? JSON.parse(conteudo.canais || '[]') : conteudo.canais || [],
      status: conteudo.status,
      assigned_to: conteudo.assigned_to || '',
      slides: typeof conteudo.slides === 'string' ? JSON.parse(conteudo.slides || '[]') : conteudo.slides || [''],
      prompt_imagem: typeof conteudo.prompts_imagem === 'string' 
        ? JSON.parse(conteudo.prompts_imagem || '[]')[0] || ''
        : conteudo.prompts_imagem?.[0] || '',
      prompt_video: typeof conteudo.prompts_video === 'string'
        ? JSON.parse(conteudo.prompts_video || '[]')[0] || ''
        : conteudo.prompts_video?.[0] || '',
      legenda: conteudo.legenda || '',
      midia_urls: typeof conteudo.midia_urls === 'string' ? JSON.parse(conteudo.midia_urls || '[]') : conteudo.midia_urls || []
    })
    setEditingId(conteudo.id)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return

    try {
      const { error } = await supabase
        .from('conteudos')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadConteudos()
    } catch (error) {
      console.error('Erro ao excluir conteúdo:', error)
      alert(`Erro ao excluir conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('conteudos')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      loadConteudos()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert(`Erro ao atualizar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const generateApprovalLink = async (id: string) => {
    try {
      const token = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
      
      const { error } = await supabase
        .from('aprovacoes_links')
        .insert({
          conteudo_id: id,
          empresa_id: cliente?.id,
          token,
          status: 'pendente'
        })

      if (error) throw error

      const link = `${window.location.origin}/aprovacao?token=${token}`
      await navigator.clipboard.writeText(link)
      alert('Link de aprovação copiado para área de transferência!')
    } catch (error) {
      console.error('Erro ao gerar link de aprovação:', error)
      alert(`Erro ao gerar link: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const addSlide = () => {
    setFormData(prev => ({
      ...prev,
      slides: [...prev.slides, '']
    }))
  }

  const updateSlide = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) => i === index ? value : slide)
    }))
  }

  const removeSlide = (index: number) => {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index)
    }))
  }

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

    // Update ordem in database
    const updatePromises = newConteudos.map((conteudo, index) =>
      supabase
        .from('conteudos')
        .update({ ordem: index + 1 })
        .eq('id', conteudo.id)
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
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle className="w-4 h-4" />
      case 'aprovacao_cliente': case 'ajustes': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/clientes/${slug}`} className="hover:text-blue-600">
              {cliente?.nome}
            </Link>
            <span>›</span>
            <span>{MESES[mes - 1]} {ano}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Conteúdos do Mês</h1>
          <p className="text-gray-600">{conteudos.length} conteúdo(s) planejado(s)</p>
        </div>
        <Button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Conteúdo
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {STATUS_OPTIONS.map(statusOpt => {
          const count = conteudos.filter(c => c.status === statusOpt.value).length
          return (
            <Card key={statusOpt.value} className="p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{count}</div>
              <div className={`text-xs px-2 py-1 rounded-full ${statusOpt.color}`}>
                {statusOpt.label}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Conteúdos List */}
      {conteudos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum conteúdo planejado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece criando o primeiro conteúdo para {MESES[mes - 1]}
          </p>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Conteúdo
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {conteudos.map(conteudo => {
            const statusConfig = getStatusConfig(conteudo.status)
            const canais = typeof conteudo.canais === 'string' 
              ? JSON.parse(conteudo.canais || '[]') 
              : conteudo.canais || []

            return (
              <Card 
                key={conteudo.id}
                className="p-4 hover:shadow-md transition-shadow cursor-move"
                draggable
                onDragStart={(e) => handleDragStart(e, conteudo.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, conteudo.id)}
              >
                <div className="flex items-start gap-4">
                  <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {conteudo.titulo || 'Sem título'}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-800">
                            {conteudo.tipo}
                          </Badge>
                          {conteudo.badge && (
                            <Badge className="bg-purple-100 text-purple-800">
                              {conteudo.badge}
                            </Badge>
                          )}
                          <Badge className={statusConfig.color}>
                            {getStatusIcon(conteudo.status)}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(conteudo)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateApprovalLink(conteudo.id)}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(conteudo.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {conteudo.descricao && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {conteudo.descricao}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      {conteudo.data_publicacao && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(conteudo.data_publicacao)}
                        </div>
                      )}
                      {conteudo.assigned_to && (
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-4 h-4 mr-2" />
                          {(conteudo as any).assignee?.display_name || 'Usuário'}
                        </div>
                      )}
                      {canais.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500">
                          {canais.slice(0, 2).map((canalId: string) => {
                            const canal = CANAIS.find(c => c.id === canalId)
                            return canal ? (
                              <span key={canalId} className="mr-1">
                                {canal.icon}
                              </span>
                            ) : null
                          })}
                          {canais.length > 2 && (
                            <span className="text-xs">+{canais.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        value={conteudo.status}
                        onChange={(e) => updateStatus(conteudo.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      
                      {conteudo.status === 'aprovacao_cliente' && (
                        <Button
                          size="sm"
                          onClick={() => generateApprovalLink(conteudo.id)}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Gerar Link
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Create/Edit */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingId ? 'Editar Conteúdo' : 'Novo Conteúdo'}
        size="xl"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <Input
                required
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título do conteúdo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPOS_CONTEUDO.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição do conteúdo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Publicação
              </label>
              <Input
                type="date"
                value={formData.data_publicacao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_publicacao: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Badge/Tema
              </label>
              <Input
                value={formData.badge}
                onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Ex: VIRAL, TREND"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsável
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar responsável</option>
              {members.map(member => (
                <option key={member.id} value={member.user_id}>
                  {member.display_name} ({member.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canais
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CANAIS.map(canal => (
                <label key={canal.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.canais.includes(canal.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          canais: [...prev.canais, canal.id]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          canais: prev.canais.filter(c => c !== canal.id)
                        }))
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{canal.icon} {canal.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slides
            </label>
            <div className="space-y-2">
              {formData.slides.map((slide, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={slide}
                    onChange={(e) => updateSlide(index, e.target.value)}
                    placeholder={`Slide ${index + 1}`}
                  />
                  {formData.slides.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeSlide(index)}
                      className="px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addSlide}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Slide
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt de Imagem
              </label>
              <textarea
                value={formData.prompt_imagem}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_imagem: e.target.value }))}
                placeholder="Prompt para geração de imagens..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt de Vídeo
              </label>
              <textarea
                value={formData.prompt_video}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_video: e.target.value }))}
                placeholder="Prompt para geração de vídeos..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Legenda
            </label>
            <textarea
              value={formData.legenda}
              onChange={(e) => setFormData(prev => ({ ...prev, legenda: e.target.value }))}
              placeholder="Legenda para publicação..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mídia
            </label>
            <MediaUpload
              existingUrls={formData.midia_urls}
              onUpload={(urls) => setFormData(prev => ({ ...prev, midia_urls: urls }))}
              maxFiles={5}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
            >
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
