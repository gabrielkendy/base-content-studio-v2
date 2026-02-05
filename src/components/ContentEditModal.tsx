'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import { InternalApprovalActions } from '@/components/InternalApprovalActions'
import { db } from '@/lib/api'
import { STATUS_CONFIG, TIPO_EMOJI, CANAIS, TIPOS_CONTEUDO } from '@/lib/utils'
import {
  X,
  Save,
  Loader2,
  Calendar,
  Clock,
  Hash,
  FileText,
  Image as ImageIcon,
  Video,
  Settings,
  History,
  Plus,
  Trash2,
  Upload,
  Check,
  Copy,
  ExternalLink,
  Download,
  Eye,
} from 'lucide-react'
import type { Conteudo, Cliente, Member } from '@/types/database'

interface ContentEditModalProps {
  isOpen: boolean
  onClose: () => void
  conteudo: Conteudo | null
  cliente: Cliente | null
  currentUser: { id: string; display_name: string; role: string } | null
  orgId: string
  onSave?: () => void
}

type TabId = 'conteudo' | 'midia' | 'config' | 'historico'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'conteudo', label: 'Conteúdo', icon: FileText },
  { id: 'midia', label: 'Mídia', icon: ImageIcon },
  { id: 'config', label: 'Configurações', icon: Settings },
  { id: 'historico', label: 'Histórico', icon: History },
]

export function ContentEditModal({
  isOpen,
  onClose,
  conteudo,
  cliente,
  currentUser,
  orgId,
  onSave,
}: ContentEditModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('conteudo')
  const [saving, setSaving] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'post',
    descricao: '',
    legenda: '',
    slides: [''] as string[],
    canais: [] as string[],
    data_publicacao: '',
    badge: '',
    status: 'rascunho',
  })

  // Reset form when conteudo changes
  useEffect(() => {
    if (conteudo) {
      setFormData({
        titulo: conteudo.titulo || '',
        tipo: conteudo.tipo || 'post',
        descricao: conteudo.descricao || '',
        legenda: conteudo.legenda || '',
        slides: Array.isArray(conteudo.slides) && conteudo.slides.length > 0 ? conteudo.slides : [''],
        canais: Array.isArray(conteudo.canais) ? conteudo.canais : [],
        data_publicacao: conteudo.data_publicacao || '',
        badge: conteudo.badge || '',
        status: conteudo.status || 'rascunho',
      })
    }
  }, [conteudo])

  if (!isOpen || !conteudo) return null

  // Garantir que conteudo não é null para o resto do componente
  const currentConteudo = conteudo

  const statusCfg = STATUS_CONFIG[formData.status] || STATUS_CONFIG.rascunho

  function updateField<K extends keyof typeof formData>(key: K, value: typeof formData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  function toggleCanal(canalId: string) {
    setFormData(prev => ({
      ...prev,
      canais: prev.canais.includes(canalId)
        ? prev.canais.filter(c => c !== canalId)
        : [...prev.canais, canalId],
    }))
  }

  function addSlide() {
    setFormData(prev => ({ ...prev, slides: [...prev.slides, ''] }))
  }

  function updateSlide(index: number, value: string) {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? value : s)),
    }))
  }

  function removeSlide(index: number) {
    setFormData(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await db.update('conteudos', {
        titulo: formData.titulo || null,
        tipo: formData.tipo,
        descricao: formData.descricao || null,
        legenda: formData.legenda || null,
        slides: formData.slides.filter(s => s.trim()),
        canais: formData.canais,
        data_publicacao: formData.data_publicacao || null,
        badge: formData.badge || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }, { id: currentConteudo.id })

      if (error) throw new Error(error)

      toast('✅ Conteúdo salvo!', 'success')
      onSave?.()
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function generateApprovalLink() {
    if (!conteudo || !cliente) return
    try {
      const token = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      await db.insert('aprovacoes_links', {
        conteudo_id: currentConteudo.id,
        empresa_id: cliente.id,
        token,
        status: 'pendente',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      // Registrar no histórico
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          conteudo_id: currentConteudo.id,
          type: 'external',
          status: 'pending',
          reviewer_name: cliente.nome,
          previous_status: currentConteudo.status,
          link_token: token,
        }),
      })

      const link = `${window.location.origin}/aprovacao?token=${token}`
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
      toast('🔗 Link de aprovação copiado!', 'success')
    } catch (err) {
      toast('Erro ao gerar link', 'error')
    }
  }

  const mediaUrls = Array.isArray(currentConteudo.midia_urls) ? currentConteudo.midia_urls : []

  return (
    <Modal open={isOpen} onClose={onClose} size="xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800">
            {TIPO_EMOJI[formData.tipo] || '📄'} {formData.tipo}
          </Badge>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => updateField('titulo', e.target.value)}
            placeholder="Título do conteúdo..."
            className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 min-w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={formData.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: statusCfg.color + '40' }}
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
            ))}
          </select>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab: Conteúdo */}
        {activeTab === 'conteudo' && (
          <div className="space-y-6">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conteúdo</label>
              <Select value={formData.tipo} onChange={(e) => updateField('tipo', e.target.value)} className="w-full max-w-xs">
                {TIPOS_CONTEUDO.map(t => (
                  <option key={t} value={t}>{TIPO_EMOJI[t] || '📄'} {t}</option>
                ))}
              </Select>
            </div>

            {/* Descrição/Narrativa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📝 Descrição / Narrativa</label>
              <textarea
                value={formData.descricao}
                onChange={(e) => updateField('descricao', e.target.value)}
                placeholder="Descreva o que será mostrado neste conteúdo..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Slides */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">📑 Slides</label>
                <Button type="button" onClick={addSlide} variant="outline" className="text-xs h-8">
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.slides.map((slide, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="flex-shrink-0 w-8 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <Input
                      value={slide}
                      onChange={(e) => updateSlide(i, e.target.value)}
                      placeholder={`Texto do slide ${i + 1}...`}
                      className="flex-1"
                    />
                    {formData.slides.length > 1 && (
                      <Button type="button" onClick={() => removeSlide(i)} variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Legenda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📱 Legenda para Publicação</label>
              <textarea
                value={formData.legenda}
                onChange={(e) => updateField('legenda', e.target.value)}
                placeholder="Legenda que será publicada junto com o conteúdo..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              />
            </div>
          </div>
        )}

        {/* Tab: Mídia */}
        {activeTab === 'midia' && (
          <div className="space-y-6">
            {mediaUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mediaUrls.map((url, i) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url)
                  const isVideo = /\.(mp4|webm|mov)/i.test(url)
                  return (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200">
                      {isImage ? (
                        <img src={url} alt={`Mídia ${i + 1}`} className="w-full h-40 object-cover" />
                      ) : isVideo ? (
                        <video src={url} className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-gray-100">
                          <Eye className="w-4 h-4" />
                        </a>
                        <a href={url} download className="p-2 bg-white rounded-lg hover:bg-gray-100">
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma mídia anexada</p>
                <p className="text-xs text-gray-400 mt-1">Acesse a página de detalhes para fazer upload</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Configurações */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Canais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Canais de Publicação</label>
              <div className="flex flex-wrap gap-2">
                {CANAIS.map(canal => {
                  const isSelected = formData.canais.includes(canal.id)
                  return (
                    <button
                      key={canal.id}
                      type="button"
                      onClick={() => toggleCanal(canal.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{canal.icon}</span>
                      <span className="text-sm font-medium">{canal.label}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Data e Tag */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" /> Data de Publicação
                </label>
                <Input
                  type="date"
                  value={formData.data_publicacao}
                  onChange={(e) => updateField('data_publicacao', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" /> Tag / Categoria
                </label>
                <Input
                  value={formData.badge}
                  onChange={(e) => updateField('badge', e.target.value)}
                  placeholder="Ex: Dica, Promo, Lançamento..."
                />
              </div>
            </div>

            {/* Aprovação Interna */}
            {currentUser && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">✅ Aprovação Interna</h4>
                <InternalApprovalActions
                  conteudo={currentConteudo}
                  currentUser={currentUser}
                  orgId={orgId}
                  onSuccess={onSave}
                />
              </div>
            )}

            {/* Link de Aprovação Externa */}
            {currentConteudo.internal_approved && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">🔗 Link para Cliente</h4>
                <Button onClick={generateApprovalLink} variant="outline" className="w-full justify-center">
                  {linkCopied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
                  {linkCopied ? 'Link Copiado!' : 'Gerar Link de Aprovação'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Histórico */}
        {activeTab === 'historico' && (
          <ApprovalTimeline
            conteudoId={currentConteudo.id}
            conteudo={currentConteudo}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>
    </Modal>
  )
}

export default ContentEditModal
