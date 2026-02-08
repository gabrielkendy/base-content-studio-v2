'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Brain, Upload, FileText, Trash2, Check, X, 
  Plus, Save, Sparkles, BookOpen, Mic, Palette
} from 'lucide-react'
import type { KnowledgeBase, CreationSettings } from '@/types/database'

const CATEGORIES = [
  { id: 'framework', label: 'Frameworks', icon: BookOpen, description: 'Estruturas e métodos de criação' },
  { id: 'voice', label: 'Tom de Voz', icon: Mic, description: 'Estilo de comunicação' },
  { id: 'visual', label: 'Referências Visuais', icon: Palette, description: 'Estilos de imagem' },
  { id: 'general', label: 'Geral', icon: FileText, description: 'Outros documentos' },
]

const DEFAULT_SETTINGS: CreationSettings = {
  id: '',
  tenant_id: '',
  default_framework: 'curiosidade',
  default_slides: 10,
  default_format: 'carrossel',
  voice_instructions: `- Sempre usar português brasileiro informal
- Citar fonte científica quando possível
- Tom: direto, sem enrolação, empolgado
- Evitar: termos muito técnicos, clickbait falso
- CTA preferido: salvar, compartilhar, comentar`,
  default_hashtags: {
    fitness: ['#fitness', '#treino', '#musculacao', '#gym'],
    saude: ['#saude', '#bemestar', '#longevidade'],
    nutricao: ['#nutricao', '#dieta', '#alimentacao'],
  },
  default_cta: 'Salva esse post e manda pra quem precisa saber! 🔥',
  image_style: 'cinematografico',
  image_prompt_template: `Estilo cinematográfico, moderno, dark mode.
Cores: Tons escuros com acentos em violeta/roxo/azul.
Tipografia: Limpa, sem serifa, bold para títulos.
Composição: Minimalista com foco no texto.
Iluminação: Dramática, com gradientes suaves.`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default function TrainingPage() {
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase[]>([])
  const [settings, setSettings] = useState<CreationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'knowledge' | 'settings'>('knowledge')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // In production, fetch from API
      // Mock data for now
      setKnowledgeBase([
        {
          id: 'kb-1',
          tenant_id: 'mock',
          type: 'pdf',
          name: 'brandsdecoded_method.pdf',
          description: 'Método completo de criação de carrosséis do BrandsDecoded',
          file_url: '/uploads/brandsdecoded_method.pdf',
          content: null,
          category: 'framework',
          is_active: true,
          processed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas arquivos PDF, TXT ou MD são aceitos.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      // In production, upload to storage and process
      const newItem: KnowledgeBase = {
        id: `kb-${Date.now()}`,
        tenant_id: 'mock',
        type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
        name: file.name,
        description: '',
        file_url: URL.createObjectURL(file),
        content: null,
        category: category as KnowledgeBase['category'],
        is_active: true,
        processed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setKnowledgeBase(prev => [...prev, newItem])

      // Simulate processing
      setTimeout(() => {
        setKnowledgeBase(prev => prev.map(item => 
          item.id === newItem.id ? { ...item, processed: true } : item
        ))
        toast({
          title: 'Processado!',
          description: `${file.name} foi adicionado à base de conhecimento.`,
        })
      }, 2000)

    } catch (error) {
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível fazer upload do arquivo.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteKnowledge(id: string) {
    setKnowledgeBase(prev => prev.filter(item => item.id !== id))
    toast({ title: 'Removido', description: 'Arquivo removido da base.' })
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      // In production, save to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: 'Salvo!',
        description: 'Configurações atualizadas com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            Training Center
          </h1>
          <p className="text-zinc-400 mt-1">
            Configure a IA com sua base de conhecimento e preferências
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'knowledge'
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          📚 Base de Conhecimento
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          ⚙️ Configurações
        </button>
      </div>

      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CATEGORIES.map(category => {
            const items = knowledgeBase.filter(item => item.category === category.id)
            const Icon = category.icon

            return (
              <Card key={category.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{category.label}</h3>
                        <p className="text-xs text-zinc-500">{category.description}</p>
                      </div>
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.txt,.md"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, category.id)}
                        disabled={uploading}
                      />
                      <Button size="sm" variant="outline" className="gap-2" asChild>
                        <span>
                          <Upload className="w-4 h-4" />
                          Upload
                        </span>
                      </Button>
                    </label>
                  </div>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">
                        Nenhum arquivo nesta categoria
                      </p>
                    ) : (
                      items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            <div>
                              <p className="text-sm text-white">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-zinc-500">{item.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.processed ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <Check className="w-3 h-3" />
                                Processado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                                Processando
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteKnowledge(item.id)}
                              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Voice Instructions */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Mic className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Tom de Voz</h3>
                  <p className="text-xs text-zinc-500">Instruções para o estilo de comunicação</p>
                </div>
              </div>
              <Textarea
                value={settings.voice_instructions || ''}
                onChange={(e) => setSettings({ ...settings, voice_instructions: e.target.value })}
                rows={6}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Descreva o tom de voz desejado..."
              />
            </CardContent>
          </Card>

          {/* Image Style */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Palette className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Estilo de Imagens</h3>
                  <p className="text-xs text-zinc-500">Template para geração de imagens</p>
                </div>
              </div>
              <Textarea
                value={settings.image_prompt_template || ''}
                onChange={(e) => setSettings({ ...settings, image_prompt_template: e.target.value })}
                rows={6}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Descreva o estilo visual desejado..."
              />
            </CardContent>
          </Card>

          {/* Default CTA */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">CTA Padrão</h3>
                  <p className="text-xs text-zinc-500">Chamada para ação padrão</p>
                </div>
              </div>
              <Input
                value={settings.default_cta || ''}
                onChange={(e) => setSettings({ ...settings, default_cta: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Ex: Salva e compartilha!"
              />
            </CardContent>
          </Card>

          {/* Defaults */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="font-medium text-white mb-4">Configurações Padrão</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-zinc-400">Framework padrão</Label>
                  <select
                    value={settings.default_framework}
                    onChange={(e) => setSettings({ ...settings, default_framework: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="curiosidade">Curiosidade</option>
                    <option value="autoridade">Autoridade</option>
                    <option value="beneficio">Benefício Direto</option>
                    <option value="pergunta">Pergunta Impactante</option>
                    <option value="lista">Lista Valiosa</option>
                    <option value="problema_solucao">Problema/Solução</option>
                    <option value="passo_a_passo">Passo a Passo</option>
                    <option value="segredo">Segredo Revelado</option>
                  </select>
                </div>
                <div>
                  <Label className="text-zinc-400">Slides padrão</Label>
                  <Input
                    type="number"
                    value={settings.default_slides}
                    onChange={(e) => setSettings({ ...settings, default_slides: parseInt(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 mt-1"
                    min={5}
                    max={15}
                  />
                </div>
                <div>
                  <Label className="text-zinc-400">Formato padrão</Label>
                  <select
                    value={settings.default_format}
                    onChange={(e) => setSettings({ ...settings, default_format: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="carrossel">Carrossel</option>
                    <option value="reels">Reels</option>
                    <option value="post">Post único</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
