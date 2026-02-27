'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, Pencil, Trash2, Phone, Mail, Building2, Users, Bell, BellOff, Edit2, CheckCircle2 } from 'lucide-react'

interface Aprovador {
  id: string
  empresa_id: string
  nome: string
  email: string | null
  whatsapp: string
  pais: string
  tipo: 'interno' | 'cliente' | 'designer'
  nivel: number
  pode_editar_legenda: boolean
  recebe_notificacao: boolean
  ativo: boolean
  created_at: string
  empresas?: {
    nome: string
    slug: string
  }
}

interface Empresa {
  id: string
  nome: string
  slug: string
}

export default function AprovadoresPage() {
  const { org, loading: authLoading } = useAuth()
  const [aprovadores, setAprovadores] = useState<Aprovador[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const { toast } = useToast()
  
  const [form, setForm] = useState({
    empresa_id: '',
    nome: '',
    email: '',
    whatsapp: '',
    tipo: 'interno' as 'interno' | 'cliente' | 'designer',
    nivel: 1,
    pode_editar_legenda: false,
    recebe_notificacao: true,
    ativo: true
  })

  useEffect(() => {
    if (org) loadData()
  }, [org])

  async function loadData() {
    setLoading(true)
    
    // Carregar empresas
    const { data: empresasData } = await db.select('empresas', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }]
    })
    if (empresasData) setEmpresas(empresasData)
    
    // Carregar aprovadores - join manual
    const { data: aprovadoresData } = await db.select('aprovadores', {
      order: [{ col: 'nivel', asc: true }, { col: 'nome', asc: true }]
    })
    
    if (aprovadoresData && empresasData) {
      // Fazer join manual
      const empresaMap = new Map(empresasData.map((e: Empresa) => [e.id, e]))
      const aprovadoresComEmpresa = aprovadoresData.map((a: Aprovador) => ({
        ...a,
        empresas: empresaMap.get(a.empresa_id)
      })).filter((a: Aprovador) => a.empresas) // Só mostrar aprovadores de empresas da org
      setAprovadores(aprovadoresComEmpresa)
    }
    
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.empresa_id || !form.nome || !form.whatsapp) {
      toast('Preencha os campos obrigatórios', 'error')
      return
    }

    // Formatar WhatsApp
    const whatsappFormatado = form.whatsapp.replace(/\D/g, '')
    
    const payload = {
      empresa_id: form.empresa_id,
      nome: form.nome,
      email: form.email || null,
      whatsapp: whatsappFormatado.startsWith('55') ? whatsappFormatado : `55${whatsappFormatado}`,
      pais: '+55',
      tipo: form.tipo,
      nivel: form.nivel,
      pode_editar_legenda: form.pode_editar_legenda,
      recebe_notificacao: form.recebe_notificacao,
      ativo: form.ativo
    }

    if (editingId) {
      const { error } = await db.update('aprovadores', payload, { id: editingId })
      if (error) {
        toast('Erro ao atualizar aprovador', 'error')
        return
      }
      toast('Aprovador atualizado!', 'success')
    } else {
      const { error } = await db.insert('aprovadores', payload)
      if (error) {
        toast('Erro ao criar aprovador', 'error')
        return
      }
      toast('Aprovador criado!', 'success')
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este aprovador?')) return
    
    const { error } = await db.delete('aprovadores', { id })
    if (error) {
      toast('Erro ao excluir aprovador', 'error')
      return
    }
    
    toast('Aprovador excluído!', 'success')
    loadData()
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await db.update('aprovadores', { ativo: !ativo }, { id })
    if (error) {
      toast('Erro ao atualizar status', 'error')
      return
    }
    loadData()
  }

  function openEdit(aprovador: Aprovador) {
    setEditingId(aprovador.id)
    setForm({
      empresa_id: aprovador.empresa_id,
      nome: aprovador.nome,
      email: aprovador.email || '',
      whatsapp: aprovador.whatsapp.replace(/^55/, ''),
      tipo: aprovador.tipo,
      nivel: aprovador.nivel,
      pode_editar_legenda: aprovador.pode_editar_legenda,
      recebe_notificacao: aprovador.recebe_notificacao,
      ativo: aprovador.ativo
    })
    setDialogOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      empresa_id: '',
      nome: '',
      email: '',
      whatsapp: '',
      tipo: 'interno',
      nivel: 1,
      pode_editar_legenda: false,
      recebe_notificacao: true,
      ativo: true
    })
  }

  const tipoLabels = {
    interno: { label: 'Equipe', color: 'bg-blue-500', emoji: '🏢' },
    cliente: { label: 'Cliente', color: 'bg-green-500', emoji: '👤' },
    designer: { label: 'Designer', color: 'bg-purple-500', emoji: '🎨' }
  }

  const aprovadoresFiltrados = aprovadores.filter(a => {
    if (filtroEmpresa !== 'todas' && a.empresa_id !== filtroEmpresa) return false
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
    return true
  })

  // Agrupar por empresa
  const aprovadoresPorEmpresa = aprovadoresFiltrados.reduce((acc, apr) => {
    const empresaNome = apr.empresas?.nome || 'Sem empresa'
    if (!acc[empresaNome]) acc[empresaNome] = []
    acc[empresaNome].push(apr)
    return acc
  }, {} as Record<string, Aprovador[]>)

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 max-sm:text-xl">Aprovadores</h1>
          <p className="text-sm text-zinc-500">Gerencie o fluxo de aprovação de conteúdos</p>
        </div>
        
        <Button variant="primary" onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Novo Aprovador
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
          <Building2 className="w-4 h-4 ml-2 text-zinc-400" />
          <select 
            value={filtroEmpresa} 
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="bg-transparent text-sm py-1.5 pr-8 border-0 focus:ring-0 cursor-pointer"
          >
            <option value="todas">Todos os clientes</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
          <Users className="w-4 h-4 ml-2 text-zinc-400" />
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-transparent text-sm py-1.5 pr-8 border-0 focus:ring-0 cursor-pointer"
          >
            <option value="todos">Todos os tipos</option>
            <option value="interno">🏢 Equipe</option>
            <option value="cliente">👤 Cliente</option>
            <option value="designer">🎨 Designer</option>
          </select>
        </div>
      </div>

      {/* Lista agrupada por empresa */}
      {Object.entries(aprovadoresPorEmpresa).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhum aprovador cadastrado</h3>
            <p className="text-sm text-zinc-500 mb-4">Comece adicionando aprovadores para gerenciar o fluxo de aprovação</p>
            <Button variant="primary" onClick={() => { resetForm(); setDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Aprovador
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(aprovadoresPorEmpresa).map(([empresaNome, lista]) => (
          <Card key={empresaNome} className="overflow-hidden shadow-md border-0">
            <div className="px-5 py-3 bg-gradient-to-r from-zinc-800 to-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-white/70" />
                <span className="font-semibold text-white">{empresaNome}</span>
                <Badge className="bg-white/20 text-white">{lista.length}</Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                {lista.map(apr => (
                  <div 
                    key={apr.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${!apr.ativo ? 'opacity-50 bg-zinc-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: apr.tipo === 'interno' ? '#3B82F6' : apr.tipo === 'cliente' ? '#22C55E' : '#A855F7' }}
                      >
                        {apr.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900">{apr.nome}</span>
                          <Badge variant={apr.tipo === 'interno' ? 'info' : apr.tipo === 'cliente' ? 'success' : 'default'}>
                            {tipoLabels[apr.tipo].emoji} {tipoLabels[apr.tipo].label}
                          </Badge>
                          <Badge>Nível {apr.nivel}</Badge>
                          {!apr.ativo && <Badge variant="warning">Inativo</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            +55 {apr.whatsapp.replace(/^55/, '')}
                          </span>
                          {apr.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {apr.email}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {apr.recebe_notificacao ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <Bell className="w-3 h-3" /> Notificações
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                              <BellOff className="w-3 h-3" /> Sem notificações
                            </span>
                          )}
                          {apr.pode_editar_legenda && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Edit2 className="w-3 h-3" /> Pode editar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => toggleAtivo(apr.id, apr.ativo)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${apr.ativo ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}
                      >
                        {apr.ativo ? '✓' : '○'}
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(apr)}>
                        <Pencil className="w-4 h-4 text-zinc-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(apr.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal Criar/Editar */}
      <Modal 
        open={dialogOpen} 
        onClose={() => { setDialogOpen(false); resetForm() }} 
        title={editingId ? '✏️ Editar Aprovador' : '➕ Novo Aprovador'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            <select 
              value={form.empresa_id} 
              onChange={(e) => setForm({...form, empresa_id: e.target.value})}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione o cliente</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          {/* Nome e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={form.nome} 
                onChange={(e) => setForm({...form, nome: e.target.value})}
                placeholder="Nome do aprovador"
                required
              />
            </div>
            
            <div>
              <Label>Tipo</Label>
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
                {(['interno', 'cliente', 'designer'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({...form, tipo: t})}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                      form.tipo === t 
                        ? 'bg-white text-zinc-900 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {tipoLabels[t].emoji} {tipoLabels[t].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp e Nível */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>WhatsApp *</Label>
              <Input 
                value={form.whatsapp} 
                onChange={(e) => setForm({...form, whatsapp: e.target.value})}
                placeholder="31999999999"
                required
              />
            </div>
            
            <div>
              <Label>Nível de Aprovação</Label>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({...form, nivel: n})}
                    className={`flex-1 h-10 rounded-lg font-bold transition-all ${
                      form.nivel === n 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>E-mail</Label>
            <Input 
              type="email"
              value={form.email} 
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Configurações */}
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-zinc-900">Receber notificações</span>
                <p className="text-xs text-zinc-400">Receber mensagens de aprovação</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({...form, recebe_notificacao: !form.recebe_notificacao})}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  form.recebe_notificacao ? 'bg-green-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  form.recebe_notificacao ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-zinc-900">Pode editar legenda</span>
                <p className="text-xs text-zinc-400">Permitir edição da legenda</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({...form, pode_editar_legenda: !form.pode_editar_legenda})}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  form.pode_editar_legenda ? 'bg-blue-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  form.pode_editar_legenda ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              💾 {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
