'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, Phone, Mail, Building2, Users } from 'lucide-react'
import { toast } from 'sonner'

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
  const [aprovadores, setAprovadores] = useState<Aprovador[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  
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

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Carregar empresas
    const { data: empresasData } = await supabase
      .from('empresas')
      .select('id, nome, slug')
      .order('nome')
    
    if (empresasData) setEmpresas(empresasData)
    
    // Carregar aprovadores
    const { data: aprovadoresData } = await supabase
      .from('aprovadores')
      .select(`
        *,
        empresas (nome, slug)
      `)
      .order('nivel')
      .order('nome')
    
    if (aprovadoresData) setAprovadores(aprovadoresData)
    
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.empresa_id || !form.nome || !form.whatsapp) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    // Formatar WhatsApp (remover caracteres especiais)
    const whatsappFormatado = form.whatsapp.replace(/\D/g, '')
    
    const payload = {
      ...form,
      whatsapp: whatsappFormatado.startsWith('55') ? whatsappFormatado : `55${whatsappFormatado}`
    }

    if (editingId) {
      // Atualizar
      const { error } = await supabase
        .from('aprovadores')
        .update(payload)
        .eq('id', editingId)
      
      if (error) {
        toast.error('Erro ao atualizar aprovador')
        console.error(error)
        return
      }
      toast.success('Aprovador atualizado!')
    } else {
      // Criar
      const { error } = await supabase
        .from('aprovadores')
        .insert(payload)
      
      if (error) {
        toast.error('Erro ao criar aprovador')
        console.error(error)
        return
      }
      toast.success('Aprovador criado!')
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este aprovador?')) return
    
    const { error } = await supabase
      .from('aprovadores')
      .delete()
      .eq('id', id)
    
    if (error) {
      toast.error('Erro ao excluir aprovador')
      return
    }
    
    toast.success('Aprovador excluído!')
    loadData()
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await supabase
      .from('aprovadores')
      .update({ ativo: !ativo })
      .eq('id', id)
    
    if (error) {
      toast.error('Erro ao atualizar status')
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
      whatsapp: aprovador.whatsapp,
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
    interno: { label: 'Interno', color: 'bg-blue-500' },
    cliente: { label: 'Cliente', color: 'bg-green-500' },
    designer: { label: 'Designer', color: 'bg-purple-500' }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aprovadores</h1>
          <p className="text-muted-foreground">Gerencie o fluxo de aprovação de conteúdos</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Aprovador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Aprovador' : 'Novo Aprovador'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.empresa_id} onValueChange={(v) => setForm({...form, empresa_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={form.nome} 
                    onChange={(e) => setForm({...form, nome: e.target.value})}
                    placeholder="Nome do aprovador"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v: any) => setForm({...form, tipo: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno (Equipe)</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp *</Label>
                  <Input 
                    value={form.whatsapp} 
                    onChange={(e) => setForm({...form, whatsapp: e.target.value})}
                    placeholder="31999999999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nível</Label>
                  <Select value={String(form.nivel)} onValueChange={(v) => setForm({...form, nivel: Number(v)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Nível 1 (Primeiro)</SelectItem>
                      <SelectItem value="2">Nível 2</SelectItem>
                      <SelectItem value="3">Nível 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input 
                  type="email"
                  value={form.email} 
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Receber notificações</Label>
                  <p className="text-xs text-muted-foreground">Receber mensagens de aprovação</p>
                </div>
                <Switch 
                  checked={form.recebe_notificacao}
                  onCheckedChange={(v) => setForm({...form, recebe_notificacao: v})}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Pode editar legenda</Label>
                  <p className="text-xs text-muted-foreground">Permitir edição da legenda</p>
                </div>
                <Switch 
                  checked={form.pode_editar_legenda}
                  onCheckedChange={(v) => setForm({...form, pode_editar_legenda: v})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os clientes</SelectItem>
            {empresas.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[200px]">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="interno">Interno</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por empresa */}
      {Object.entries(aprovadoresPorEmpresa).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum aprovador cadastrado</h3>
            <p className="text-muted-foreground mb-4">Comece adicionando aprovadores para gerenciar o fluxo de aprovação</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Aprovador
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(aprovadoresPorEmpresa).map(([empresaNome, lista]) => (
          <Card key={empresaNome}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {empresaNome}
                <Badge variant="secondary" className="ml-2">{lista.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lista.map(apr => (
                  <div 
                    key={apr.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${!apr.ativo ? 'opacity-50 bg-muted' : 'bg-card'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{apr.nome}</span>
                          <Badge className={tipoLabels[apr.tipo].color}>
                            {tipoLabels[apr.tipo].label}
                          </Badge>
                          <Badge variant="outline">Nível {apr.nivel}</Badge>
                          {!apr.ativo && <Badge variant="destructive">Inativo</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {apr.whatsapp}
                          </span>
                          {apr.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {apr.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={apr.ativo}
                        onCheckedChange={() => toggleAtivo(apr.id, apr.ativo)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(apr)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(apr.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
