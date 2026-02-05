'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { CANAIS, TIPOS_CONTEUDO, TIPO_EMOJI, MESES } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Upload,
  X,
  Loader2,
  Tag,
  FileText,
  Image as ImageIcon,
  Video,
  Check,
  Sparkles,
} from 'lucide-react'
import type { Cliente } from '@/types/database'

export default function NovaDemandaPage() {
  const router = useRouter()
  const { org, member } = useAuth()
  const { toast } = useToast()

  // Form state
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState('post')
  const [canaisSelecionados, setCanaisSelecionados] = useState<string[]>([])
  const [dataPublicacao, setDataPublicacao] = useState('')
  const [horaPublicacao, setHoraPublicacao] = useState('12:00')
  const [autoAgendar, setAutoAgendar] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [briefing, setBriefing] = useState('')
  const [arquivosRef, setArquivosRef] = useState<File[]>([])

  // Data
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (org?.id) loadClientes()
  }, [org?.id])

  async function loadClientes() {
    const { data } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    setClientes(data || [])
    setLoading(false)
  }

  function toggleCanal(canalId: string) {
    setCanaisSelecionados(prev =>
      prev.includes(canalId)
        ? prev.filter(c => c !== canalId)
        : [...prev, canalId]
    )
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setArquivosRef(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setArquivosRef(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(saveAsDraft = false) {
    // Validações
    if (!titulo.trim()) {
      toast('Título é obrigatório', 'error')
      return
    }
    if (!clienteId) {
      toast('Selecione um cliente', 'error')
      return
    }
    if (canaisSelecionados.length === 0) {
      toast('Selecione ao menos um canal', 'error')
      return
    }

    setSubmitting(true)

    try {
      const cliente = clientes.find(c => c.id === clienteId)
      if (!cliente) throw new Error('Cliente não encontrado')

      // Calcular mês/ano da publicação
      let mes = new Date().getMonth() + 1
      let ano = new Date().getFullYear()
      if (dataPublicacao) {
        const dataPub = new Date(dataPublicacao)
        mes = dataPub.getMonth() + 1
        ano = dataPub.getFullYear()
      }

      // Buscar última ordem para esse mês
      const { data: existentes } = await db.select('conteudos', {
        filters: [
          { op: 'eq', col: 'empresa_id', val: clienteId },
          { op: 'eq', col: 'mes', val: mes },
          { op: 'eq', col: 'ano', val: ano },
        ],
        order: [{ col: 'ordem', asc: false }],
        limit: 1,
      })
      const novaOrdem = (existentes?.[0]?.ordem || 0) + 1

      // Criar conteúdo
      const { data: novoConteudo, error } = await db.insert('conteudos', {
        org_id: org!.id,
        empresa_id: clienteId,
        titulo: titulo.trim(),
        tipo,
        canais: canaisSelecionados,
        data_publicacao: dataPublicacao || null,
        descricao: briefing || null,
        badge: tags.length > 0 ? tags[0] : null,
        status: saveAsDraft ? 'rascunho' : 'producao',
        mes,
        ano,
        ordem: novaOrdem,
        slides: [],
        prompts_imagem: [],
        prompts_video: [],
        midia_urls: [],
        assigned_to: member?.user_id || null,
      }, { select: '*', single: true })

      if (error) throw new Error(error)

      // Upload de arquivos de referência (se houver)
      if (arquivosRef.length > 0 && novoConteudo?.id) {
        // TODO: Implementar upload de arquivos de referência
        // Por enquanto, vamos apenas registrar que tem arquivos
      }

      toast(saveAsDraft ? '📝 Rascunho salvo!' : '🚀 Demanda criada com sucesso!', 'success')
      router.push(`/clientes/${cliente.slug}/conteudo/${novoConteudo.id}`)
    } catch (err: any) {
      console.error('Erro ao criar demanda:', err)
      toast(err.message || 'Erro ao criar demanda', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const clienteSelecionado = clientes.find(c => c.id === clienteId)

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Demanda</h1>
          <p className="text-sm text-gray-500">Crie uma nova demanda de conteúdo</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Título */}
        <Card className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Título da Demanda *
          </label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Post Dia das Mães, Reels Lançamento Produto..."
            className="text-lg"
          />
        </Card>

        {/* Cliente e Tipo */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cliente *
              </label>
              <Select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Conteúdo *
              </label>
              <Select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full"
              >
                {TIPOS_CONTEUDO.map(t => (
                  <option key={t} value={t}>{TIPO_EMOJI[t] || '📄'} {t}</option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {/* Canais - Visual Selector */}
        <Card className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Canais de Publicação *
          </label>
          <div className="flex flex-wrap gap-2">
            {CANAIS.map(canal => {
              const isSelected = canaisSelecionados.includes(canal.id)
              return (
                <button
                  key={canal.id}
                  type="button"
                  onClick={() => toggleCanal(canal.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-lg">{canal.icon}</span>
                  <span className="text-sm font-medium">{canal.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              )
            })}
          </div>
          {canaisSelecionados.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {canaisSelecionados.length} {canaisSelecionados.length === 1 ? 'canal selecionado' : 'canais selecionados'}
            </p>
          )}
        </Card>

        {/* Data e Hora */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Data Prevista
              </label>
              <Input
                type="date"
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Horário
              </label>
              <Input
                type="time"
                value={horaPublicacao}
                onChange={(e) => setHoraPublicacao(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Auto-agendar toggle */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoAgendar(!autoAgendar)}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${autoAgendar ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                  ${autoAgendar ? 'translate-x-7' : 'translate-x-1'}
                `}
              />
            </button>
            <span className="text-sm text-gray-700">
              <Sparkles className="w-4 h-4 inline mr-1 text-yellow-500" />
              Agendar automaticamente após aprovação
            </span>
          </div>
        </Card>

        {/* Tags */}
        <Card className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-2" />
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Digite uma tag e pressione Enter"
              className="flex-1"
            />
            <Button type="button" onClick={addTag} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag}
                  className="bg-purple-100 text-purple-700 px-3 py-1 flex items-center gap-1"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        {/* Briefing */}
        <Card className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Briefing / Descrição
          </label>
          <textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Descreva o que deve ser criado, referências, tom de voz, objetivo..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Card>

        {/* Arquivos de Referência */}
        <Card className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Upload className="w-4 h-4 inline mr-2" />
            Arquivos de Referência
          </label>
          
          <label className="cursor-pointer block">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.psd,.ai"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Clique para adicionar arquivos</p>
              <p className="text-xs text-gray-400 mt-1">Imagens, PDFs, documentos (até 50MB cada)</p>
            </div>
          </label>

          {arquivosRef.length > 0 && (
            <div className="mt-4 space-y-2">
              {arquivosRef.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                    ) : file.type.includes('video') ? (
                      <Video className="w-5 h-5 text-purple-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="border-gray-300"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar Rascunho
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Demanda
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
