'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { 
  Plus, Search, Home, Building2, MapPin, DollarSign, 
  Bed, Bath, Car, Square, Send, Eye, Trash2, 
  CheckCircle, Clock, Video, Mail, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import type { Cliente } from '@/types/database'

interface Imovel {
  id: string
  codigo?: string
  titulo: string
  tipo: string
  bairro?: string
  cidade?: string
  quartos?: number
  vagas?: number
  preco?: number
  tipo_negocio?: string
  status: string
  email_kendy_enviado?: boolean
  email_equipe_enviado?: boolean
  resposta_gravacao?: string
  fotos?: string[]
  created_at: string
  cliente?: Cliente
}

const TIPOS_IMOVEL = [
  { value: 'apartamento', label: 'Apartamento', emoji: '🏢' },
  { value: 'casa', label: 'Casa', emoji: '🏠' },
  { value: 'cobertura', label: 'Cobertura', emoji: '🌆' },
  { value: 'terreno', label: 'Terreno', emoji: '📐' },
  { value: 'comercial', label: 'Comercial', emoji: '🏪' },
  { value: 'studio', label: 'Studio', emoji: '🏙️' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  novo: { label: 'Novo', color: '#8B5CF6', emoji: '🆕' },
  conteudo_criado: { label: 'Conteúdo Criado', color: '#3B82F6', emoji: '📝' },
  aguardando_gravacao: { label: 'Aguardando Gravação', color: '#F59E0B', emoji: '🎬' },
  em_producao: { label: 'Em Produção', color: '#6366F1', emoji: '🔨' },
  publicado: { label: 'Publicado', color: '#22C55E', emoji: '✅' },
}

function formatPreco(valor?: number): string {
  if (!valor) return '-'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ImoveisPage() {
  const { org, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    cliente_id: '',
    codigo: '',
    titulo: '',
    tipo: 'apartamento',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: 'MG',
    area_construida: '',
    quartos: '3',
    suites: '1',
    banheiros: '2',
    vagas: '2',
    preco: '',
    preco_condominio: '',
    tipo_negocio: 'venda',
    descricao: '',
    diferenciais: '',
  })

  useEffect(() => {
    if (org) loadData()
  }, [org])

  async function loadData() {
    try {
      const [imoveisRes, clientesRes] = await Promise.all([
        fetch('/api/imoveis'),
        fetch('/api/db?table=clientes&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', col: 'org_id', val: org!.id }]))),
      ])
      
      const imoveisData = await imoveisRes.json()
      const clientesData = await clientesRes.json()
      
      setImoveis(imoveisData.data || [])
      setClientes(clientesData.data || [])
      
      // Se tiver clientes, selecionar o primeiro
      if (clientesData.data?.length > 0) {
        setForm(f => ({ ...f, cliente_id: clientesData.data[0].id }))
      }
    } catch (e) {
      console.error('Error loading data:', e)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...form,
        area_construida: form.area_construida ? parseFloat(form.area_construida) : null,
        quartos: parseInt(form.quartos) || 0,
        suites: parseInt(form.suites) || 0,
        banheiros: parseInt(form.banheiros) || 0,
        vagas: parseInt(form.vagas) || 0,
        preco: form.preco ? parseFloat(form.preco.replace(/\D/g, '')) : null,
        preco_condominio: form.preco_condominio ? parseFloat(form.preco_condominio.replace(/\D/g, '')) : null,
        diferenciais: form.diferenciais.split('\n').filter(d => d.trim()),
      }

      const res = await fetch('/api/imoveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Erro ao cadastrar imóvel', 'error')
        return
      }

      toast('🏠 Imóvel cadastrado + conteúdo gerado + emails enviados!', 'success')
      setModalOpen(false)
      loadData()
      
      // Reset form
      setForm(f => ({
        ...f,
        codigo: '',
        titulo: '',
        endereco: '',
        bairro: '',
        area_construida: '',
        preco: '',
        preco_condominio: '',
        descricao: '',
        diferenciais: '',
      }))
    } catch (err) {
      toast('Erro ao cadastrar imóvel', 'error')
    }
    setSaving(false)
  }

  const filteredImoveis = imoveis.filter(i => {
    if (!busca) return true
    const search = busca.toLowerCase()
    return (
      i.titulo?.toLowerCase().includes(search) ||
      i.bairro?.toLowerCase().includes(search) ||
      i.cidade?.toLowerCase().includes(search) ||
      i.codigo?.toLowerCase().includes(search)
    )
  })

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-indigo-500" />
            Imóveis
          </h1>
          <p className="text-sm text-zinc-500">{imoveis.length} imóveis cadastrados</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)} className="max-sm:w-full">
          <Plus className="w-4 h-4" /> Novo Imóvel
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por título, bairro, cidade..."
          className="pl-10"
        />
      </div>

      {/* Lista de imóveis */}
      {filteredImoveis.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Nenhum imóvel</h3>
            <p className="text-sm text-zinc-500 mb-4">Cadastre o primeiro imóvel para gerar conteúdo automaticamente</p>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> Cadastrar Imóvel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredImoveis.map(imovel => {
            const status = STATUS_CONFIG[imovel.status] || STATUS_CONFIG.novo
            const tipoConfig = TIPOS_IMOVEL.find(t => t.value === imovel.tipo)
            
            return (
              <Link key={imovel.id} href={`/imoveis/${imovel.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                  {/* Imagem */}
                  <div className="h-36 bg-gradient-to-br from-indigo-100 to-purple-100 relative">
                    {imovel.fotos?.[0] ? (
                      <img src={imovel.fotos[0]} alt={imovel.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl opacity-50">{tipoConfig?.emoji || '🏠'}</span>
                      </div>
                    )}
                    
                    {/* Badge de status */}
                    <div className="absolute top-2 right-2">
                      <Badge style={{ background: status.color }} className="text-white text-xs">
                        {status.emoji} {status.label}
                      </Badge>
                    </div>
                    
                    {/* Tipo */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs">
                        {tipoConfig?.emoji} {tipoConfig?.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    {/* Cliente */}
                    {imovel.cliente && (
                      <p className="text-xs text-indigo-600 font-medium mb-1">
                        {imovel.cliente.nome}
                      </p>
                    )}
                    
                    {/* Título */}
                    <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {imovel.titulo}
                    </h3>
                    
                    {/* Localização */}
                    <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[imovel.bairro, imovel.cidade].filter(Boolean).join(' - ') || 'Localização não informada'}
                    </p>
                    
                    {/* Características */}
                    <div className="flex items-center gap-3 mt-3 text-sm text-zinc-600">
                      {imovel.quartos && (
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" /> {imovel.quartos}
                        </span>
                      )}
                      {imovel.vagas && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" /> {imovel.vagas}
                        </span>
                      )}
                    </div>
                    
                    {/* Preço */}
                    <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-lg font-bold text-green-600">
                        {formatPreco(imovel.preco)}
                      </span>
                      
                      {/* Indicadores de email/gravação */}
                      <div className="flex items-center gap-1">
                        {imovel.email_kendy_enviado && (
                          <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center" title="Email enviado">
                            <Mail className="w-3 h-3 text-green-600" />
                          </span>
                        )}
                        {imovel.resposta_gravacao === 'sim' && (
                          <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center" title="Vai gravar">
                            <Video className="w-3 h-3 text-purple-600" />
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal de cadastro */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="🏠 Novo Imóvel" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            <Select
              value={form.cliente_id}
              onChange={e => setForm({ ...form, cliente_id: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </div>

          {/* Linha 1: Código + Título */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>Código</Label>
              <Input
                value={form.codigo}
                onChange={e => setForm({ ...form, codigo: e.target.value })}
                placeholder="AP001"
              />
            </div>
            <div className="col-span-3">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Apartamento 3 quartos no Buritis"
                required
              />
            </div>
          </div>

          {/* Linha 2: Tipo + Negócio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_IMOVEL.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Negócio</Label>
              <Select value={form.tipo_negocio} onChange={e => setForm({ ...form, tipo_negocio: e.target.value })}>
                <option value="venda">🏷️ Venda</option>
                <option value="aluguel">🔑 Aluguel</option>
              </Select>
            </div>
          </div>

          {/* Localização */}
          <div className="border-t border-zinc-100 pt-4 mt-4">
            <h4 className="font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Localização
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={e => setForm({ ...form, endereco: e.target.value })}
                  placeholder="Rua das Flores, 123"
                />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input
                  value={form.bairro}
                  onChange={e => setForm({ ...form, bairro: e.target.value })}
                  placeholder="Buritis"
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={e => setForm({ ...form, cidade: e.target.value })}
                  placeholder="Belo Horizonte"
                />
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="border-t border-zinc-100 pt-4 mt-4">
            <h4 className="font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Características
            </h4>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label>Área (m²)</Label>
                <Input
                  type="number"
                  value={form.area_construida}
                  onChange={e => setForm({ ...form, area_construida: e.target.value })}
                  placeholder="120"
                />
              </div>
              <div>
                <Label>Quartos</Label>
                <Input
                  type="number"
                  value={form.quartos}
                  onChange={e => setForm({ ...form, quartos: e.target.value })}
                />
              </div>
              <div>
                <Label>Suítes</Label>
                <Input
                  type="number"
                  value={form.suites}
                  onChange={e => setForm({ ...form, suites: e.target.value })}
                />
              </div>
              <div>
                <Label>Banheiros</Label>
                <Input
                  type="number"
                  value={form.banheiros}
                  onChange={e => setForm({ ...form, banheiros: e.target.value })}
                />
              </div>
              <div>
                <Label>Vagas</Label>
                <Input
                  type="number"
                  value={form.vagas}
                  onChange={e => setForm({ ...form, vagas: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="border-t border-zinc-100 pt-4 mt-4">
            <h4 className="font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Valores
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço</Label>
                <Input
                  value={form.preco}
                  onChange={e => setForm({ ...form, preco: e.target.value })}
                  placeholder="850.000"
                />
              </div>
              <div>
                <Label>Condomínio</Label>
                <Input
                  value={form.preco_condominio}
                  onChange={e => setForm({ ...form, preco_condominio: e.target.value })}
                  placeholder="800"
                />
              </div>
            </div>
          </div>

          {/* Descrição e Diferenciais */}
          <div className="border-t border-zinc-100 pt-4 mt-4">
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o imóvel..."
                rows={3}
              />
            </div>
            <div className="mt-3">
              <Label>Diferenciais (um por linha)</Label>
              <Textarea
                value={form.diferenciais}
                onChange={e => setForm({ ...form, diferenciais: e.target.value })}
                placeholder="Varanda gourmet&#10;Piscina&#10;Academia&#10;Portaria 24h"
                rows={4}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="border-t border-zinc-100 pt-4 mt-4 flex justify-end gap-2 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? '⏳ Processando...' : '🚀 Cadastrar + Gerar Conteúdo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
