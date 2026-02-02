'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, ArrowRight, Check, Upload, X, Calendar,
  FileText, Image as ImageIcon, Film, Smartphone, Video, MoreHorizontal
} from 'lucide-react'
import type { Cliente } from '@/types/database'

const TIPOS = [
  { value: 'post', label: 'Post', emoji: '📝', icon: FileText, desc: 'Imagem única para feed', color: 'from-blue-400 to-blue-600' },
  { value: 'carrossel', label: 'Carrossel', emoji: '📑', icon: ImageIcon, desc: 'Múltiplos slides', color: 'from-purple-400 to-purple-600' },
  { value: 'stories', label: 'Stories', emoji: '📱', icon: Smartphone, desc: 'Formato vertical', color: 'from-pink-400 to-pink-600' },
  { value: 'reels', label: 'Reels', emoji: '🎬', icon: Film, desc: 'Vídeo curto vertical', color: 'from-orange-400 to-orange-600' },
  { value: 'vídeo', label: 'Vídeo', emoji: '🎥', icon: Video, desc: 'Vídeo longo', color: 'from-red-400 to-red-600' },
  { value: 'outro', label: 'Outro', emoji: '📄', icon: MoreHorizontal, desc: 'Especifique nos detalhes', color: 'from-gray-400 to-gray-600' },
]

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', emoji: '🟢', desc: 'Sem pressa, prazo flexível', color: 'border-green-300 bg-green-50 hover:border-green-500' },
  { value: 'normal', label: 'Normal', emoji: '🔵', desc: 'Prazo padrão de produção', color: 'border-blue-300 bg-blue-50 hover:border-blue-500' },
  { value: 'alta', label: 'Alta', emoji: '🟡', desc: 'Preciso logo, priorize', color: 'border-yellow-300 bg-yellow-50 hover:border-yellow-500' },
  { value: 'urgente', label: 'Urgente', emoji: '🔴', desc: 'Preciso agora!', color: 'border-red-300 bg-red-50 hover:border-red-500' },
]

const STEPS = ['Tipo', 'Detalhes', 'Referências', 'Prioridade', 'Revisão']

export default function SolicitarWizardPage() {
  const { org, member } = useAuth()
  const { toast } = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    cliente_id: '',
    tipo: '',
    titulo: '',
    descricao: '',
    observacoes: '',
    arquivos_ref: [] as string[],
    arquivos_names: [] as string[],
    prioridade: 'normal',
    prazo_desejado: '',
  })

  useEffect(() => {
    if (!org) return
    loadClientes()
  }, [org])

  async function loadClientes() {
    const { data } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    const cls = data || []
    setClientes(cls)
    if (cls.length === 1) setForm(f => ({ ...f, cliente_id: cls[0].id }))
    setLoading(false)
  }

  function goNext() {
    setSlideDir('left')
    setStep(s => Math.min(s + 1, 4))
  }

  function goPrev() {
    setSlideDir('right')
    setStep(s => Math.max(s - 1, 0))
  }

  function canGoNext(): boolean {
    if (step === 0) return !!form.tipo
    if (step === 1) return !!form.titulo.trim()
    return true
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    // Just store file names as references (no actual upload in this demo)
    const newNames = Array.from(files).map(f => f.name)
    setForm(f => ({
      ...f,
      arquivos_names: [...f.arquivos_names, ...newNames],
      arquivos_ref: [...f.arquivos_ref, ...newNames],
    }))
    e.target.value = ''
  }

  function removeFile(index: number) {
    setForm(f => ({
      ...f,
      arquivos_names: f.arquivos_names.filter((_, i) => i !== index),
      arquivos_ref: f.arquivos_ref.filter((_, i) => i !== index),
    }))
  }

  async function handleSubmit() {
    if (!form.cliente_id && clientes.length > 0) {
      toast('Selecione uma empresa', 'error')
      return
    }
    setSending(true)

    const { error } = await db.insert('solicitacoes', {
      org_id: org!.id,
      cliente_id: form.cliente_id || clientes[0]?.id,
      titulo: form.titulo,
      descricao: form.descricao || null,
      referencias: [],
      arquivos_ref: form.arquivos_ref,
      prioridade: form.prioridade,
      prazo_desejado: form.prazo_desejado || null,
    })

    setSending(false)

    if (error) {
      toast(`Erro: ${error}`, 'error')
      return
    }

    // Notify all admins/gestores about the new request
    try {
      const { data: admins } = await db.select('members', {
        filters: [
          { op: 'eq', col: 'org_id', val: org!.id },
          { op: 'eq', col: 'status', val: 'active' },
        ],
      })
      const adminMembers = (admins || []).filter((m: any) => ['admin', 'gestor'].includes(m.role))
      const clienteName = clientes.find(c => c.id === (form.cliente_id || clientes[0]?.id))?.nome || 'Cliente'
      const prioridadeLabel = form.prioridade === 'urgente' ? '🔴 URGENTE' : form.prioridade === 'alta' ? '🟡 Alta' : ''

      for (const admin of adminMembers) {
        await db.insert('notifications', {
          org_id: org!.id,
          user_id: admin.user_id,
          title: `📋 Nova Solicitação${prioridadeLabel ? ' ' + prioridadeLabel : ''}`,
          body: `${clienteName}: ${form.titulo}`,
          type: 'solicitacao',
          read: false,
        })
      }
    } catch {
      // Non-critical, don't block success
    }

    setSuccess(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6 animate-fade-in">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-20" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <Check className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Solicitação Enviada! 🎉</h2>
        <p className="text-gray-500">
          Sua solicitação foi recebida pela equipe. Acompanhe o status no painel.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => { setSuccess(false); setStep(0); setForm({ cliente_id: clientes.length === 1 ? clientes[0].id : '', tipo: '', titulo: '', descricao: '', observacoes: '', arquivos_ref: [], arquivos_names: [], prioridade: 'normal', prazo_desejado: '' }) }}>
            Nova Solicitação
          </Button>
          <Button variant="primary" onClick={() => window.location.href = '/portal'}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Solicitação</h1>
        <p className="text-gray-500 mt-1">Conte o que você precisa em 5 passos simples</p>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
                    : i === step
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-110'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] mt-1 font-medium hidden sm:block ${
                i <= step ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="overflow-hidden">
        <div
          key={step}
          className="animate-fade-in"
        >
          {/* Step 0: Tipo */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">O que você precisa?</h2>
              <p className="text-sm text-gray-500">Selecione o tipo de conteúdo</p>

              {clientes.length > 1 && (
                <div className="mb-4">
                  <Label>Empresa</Label>
                  <select
                    value={form.cliente_id}
                    onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TIPOS.map(tipo => {
                  const Icon = tipo.icon
                  const selected = form.tipo === tipo.value
                  return (
                    <button
                      key={tipo.value}
                      onClick={() => setForm(f => ({ ...f, tipo: tipo.value }))}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 group ${
                        selected
                          ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tipo.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="font-semibold text-sm text-gray-900">{tipo.emoji} {tipo.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{tipo.desc}</div>
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 1: Detalhes */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Detalhes do conteúdo</h2>
              <p className="text-sm text-gray-500">Descreva o que você imagina</p>

              <div>
                <Label>Título *</Label>
                <Input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Post para promoção de janeiro..."
                  className="text-base"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={5}
                  placeholder="Descreva com detalhes o que imagina. Quanto mais informação, melhor o resultado!"
                />
              </div>

              <div>
                <Label>Observações adicionais</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Cores específicas, textos obrigatórios, hashtags..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Referências */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Referências</h2>
              <p className="text-sm text-gray-500">Envie imagens ou arquivos que sirvam de inspiração</p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-blue-500" />
                </div>
                <p className="font-medium text-gray-700">Arraste arquivos ou clique para selecionar</p>
                <p className="text-sm text-gray-400 mt-1">Imagens, PDFs, documentos</p>
              </div>

              {form.arquivos_names.length > 0 && (
                <div className="space-y-2">
                  {form.arquivos_names.map((name, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="flex-1 text-sm text-gray-700 truncate">{name}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">
                Este passo é opcional. Pule se não tiver referências.
              </p>
            </div>
          )}

          {/* Step 3: Prioridade e Prazo */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Prioridade e Prazo</h2>
              <p className="text-sm text-gray-500">Nos diga a urgência e quando precisa</p>

              <div>
                <Label>Prioridade</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {PRIORIDADES.map(p => {
                    const selected = form.prioridade === p.value
                    return (
                      <button
                        key={p.value}
                        onClick={() => setForm(f => ({ ...f, prioridade: p.value }))}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : p.color
                        }`}
                      >
                        <div className="text-2xl mb-1">{p.emoji}</div>
                        <div className="font-semibold text-sm text-gray-900">{p.label}</div>
                        <div className="text-xs text-gray-500">{p.desc}</div>
                        {selected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label>Prazo desejado</Label>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    value={form.prazo_desejado}
                    onChange={e => setForm(f => ({ ...f, prazo_desejado: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Quando você gostaria de receber o conteúdo?</p>
              </div>
            </div>
          )}

          {/* Step 4: Revisão */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">Revisão</h2>
              <p className="text-sm text-gray-500">Confira tudo antes de enviar</p>

              <Card className="border-0 shadow-md bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="py-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-medium">Tipo</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {TIPOS.find(t => t.value === form.tipo)?.emoji}{' '}
                        {TIPOS.find(t => t.value === form.tipo)?.label || form.tipo}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase font-medium">Prioridade</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {PRIORIDADES.find(p => p.value === form.prioridade)?.emoji}{' '}
                        {PRIORIDADES.find(p => p.value === form.prioridade)?.label}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-400 uppercase font-medium">Título</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{form.titulo}</div>
                  </div>

                  {form.descricao && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs text-gray-400 uppercase font-medium">Descrição</div>
                      <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{form.descricao}</div>
                    </div>
                  )}

                  {form.observacoes && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs text-gray-400 uppercase font-medium">Observações</div>
                      <div className="text-sm text-gray-700 mt-1">{form.observacoes}</div>
                    </div>
                  )}

                  {form.prazo_desejado && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs text-gray-400 uppercase font-medium">Prazo</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        📅 {new Date(form.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  )}

                  {form.arquivos_names.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs text-gray-400 uppercase font-medium">Referências ({form.arquivos_names.length})</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {form.arquivos_names.map((name, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                            📎 {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        {step > 0 ? (
          <Button variant="ghost" onClick={goPrev}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <Button
            variant="primary"
            onClick={goNext}
            disabled={!canGoNext()}
            className="shadow-md"
          >
            Próximo <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={sending}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg px-8"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Enviando...
              </>
            ) : (
              <>📨 Enviar Solicitação</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
