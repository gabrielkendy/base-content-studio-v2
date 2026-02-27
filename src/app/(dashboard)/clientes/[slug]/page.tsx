'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MESES, STATUS_CONFIG } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ChevronLeft, ChevronRight, Calendar, Users, Trash2, Mail, BarChart3, Palette, FolderOpen, Share2, Target, FileText, CheckCircle2, Plus, Phone, X, GripVertical, Bell, BellOff, Edit2, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Member, MemberClient } from '@/types/database'
import { normalizeStatus } from '@/lib/utils'

type ViewTab = 'anual' | 'acessos' | 'aprovadores' | 'analytics' | 'brand' | 'repositorio'

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
}

export default function ClienteDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org, member: currentMember } = useAuth()
  const { toast } = useToast()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [view, setView] = useState<ViewTab>('anual')
  const [loading, setLoading] = useState(true)

  // Acessos state
  const [accessMembers, setAccessMembers] = useState<(MemberClient & { member?: Member })[]>([])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loadingAccess, setLoadingAccess] = useState(false)

  // Aprovadores state
  const [aprovadores, setAprovadores] = useState<Aprovador[]>([])
  const [loadingAprovadores, setLoadingAprovadores] = useState(false)
  const [aprovadorModalOpen, setAprovadorModalOpen] = useState(false)
  const [editingAprovador, setEditingAprovador] = useState<Aprovador | null>(null)
  const [aprovadorForm, setAprovadorForm] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    pais: '+55',
    tipo: 'cliente' as 'interno' | 'cliente' | 'designer',
    nivel: 1,
    pode_editar_legenda: false,
    recebe_notificacao: true
  })

  useEffect(() => { if (org) loadData() }, [org, ano])

  async function loadData() {
    const { data: c } = await db.select('clientes', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }, { op: 'eq', col: 'slug', val: slug }], single: true })
    if (!c) return
    setCliente(c)
    const { data: conts } = await db.select('conteudos', { filters: [{ op: 'eq', col: 'empresa_id', val: c.id }, { op: 'eq', col: 'ano', val: ano }], order: [{ col: 'ordem', asc: true }, { col: 'data_publicacao', asc: true }] })
    const normalized = (conts || []).map((c: any) => ({ ...c, status: normalizeStatus(c.status || 'rascunho') }))
    setConteudos(normalized)
    setLoading(false)
    loadAccessData(c.id)
    loadAprovadores(c.id)
  }

  async function loadAprovadores(clienteId: string) {
    setLoadingAprovadores(true)
    const { data } = await db.select('aprovadores', { 
      filters: [{ op: 'eq', col: 'empresa_id', val: clienteId }],
      order: [{ col: 'nivel', asc: true }, { col: 'nome', asc: true }]
    })
    setAprovadores(data || [])
    setLoadingAprovadores(false)
  }

  function openNewAprovador(nivel: number = 1) {
    setEditingAprovador(null)
    setAprovadorForm({
      nome: '',
      email: '',
      whatsapp: '',
      pais: '+55',
      tipo: 'cliente',
      nivel,
      pode_editar_legenda: false,
      recebe_notificacao: true
    })
    setAprovadorModalOpen(true)
  }

  function openEditAprovador(apr: Aprovador) {
    setEditingAprovador(apr)
    setAprovadorForm({
      nome: apr.nome,
      email: apr.email || '',
      whatsapp: apr.whatsapp.replace(/^55/, ''),
      pais: '+55',
      tipo: apr.tipo,
      nivel: apr.nivel,
      pode_editar_legenda: apr.pode_editar_legenda,
      recebe_notificacao: apr.recebe_notificacao
    })
    setAprovadorModalOpen(true)
  }

  async function handleSaveAprovador(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) return
    
    const whatsappFormatado = aprovadorForm.whatsapp.replace(/\D/g, '')
    const payload = {
      empresa_id: cliente.id,
      nome: aprovadorForm.nome,
      email: aprovadorForm.email || null,
      whatsapp: whatsappFormatado.startsWith('55') ? whatsappFormatado : `55${whatsappFormatado}`,
      pais: aprovadorForm.pais,
      tipo: aprovadorForm.tipo,
      nivel: aprovadorForm.nivel,
      pode_editar_legenda: aprovadorForm.pode_editar_legenda,
      recebe_notificacao: aprovadorForm.recebe_notificacao,
      ativo: true
    }

    if (editingAprovador) {
      const { error } = await db.update('aprovadores', payload, { id: editingAprovador.id })
      if (error) { toast('Erro ao salvar', 'error'); return }
      toast('Aprovador atualizado!', 'success')
    } else {
      const { error } = await db.insert('aprovadores', payload)
      if (error) { toast('Erro ao criar', 'error'); return }
      toast('Aprovador adicionado!', 'success')
    }
    
    setAprovadorModalOpen(false)
    loadAprovadores(cliente.id)
  }

  async function handleDeleteAprovador(id: string) {
    if (!confirm('Remover este aprovador?')) return
    const { error } = await db.delete('aprovadores', { id })
    if (error) { toast('Erro ao remover', 'error'); return }
    toast('Aprovador removido!', 'success')
    if (cliente) loadAprovadores(cliente.id)
  }

  async function toggleAprovadorAtivo(apr: Aprovador) {
    const { error } = await db.update('aprovadores', { ativo: !apr.ativo }, { id: apr.id })
    if (error) { toast('Erro', 'error'); return }
    if (cliente) loadAprovadores(cliente.id)
  }

  // Agrupar aprovadores por nível
  const aprovadoresPorNivel = aprovadores.reduce((acc, apr) => {
    if (!acc[apr.nivel]) acc[apr.nivel] = []
    acc[apr.nivel].push(apr)
    return acc
  }, {} as Record<number, Aprovador[]>)

  const maxNivel = Math.max(...Object.keys(aprovadoresPorNivel).map(Number), 0)

  async function loadAccessData(clienteId: string) {
    setLoadingAccess(true)
    const { data: mcs } = await db.select('member_clients', { filters: [{ op: 'eq', col: 'cliente_id', val: clienteId }, { op: 'eq', col: 'org_id', val: org!.id }] })
    const { data: members } = await db.select('members', { filters: [{ op: 'eq', col: 'org_id', val: org!.id }, { op: 'eq', col: 'status', val: 'active' }] })
    const memberMap = new Map((members || []).map((m: Member) => [m.id, m]))
    setAccessMembers((mcs || []).map((mc: MemberClient) => ({ ...mc, member: memberMap.get(mc.member_id) })))
    setLoadingAccess(false)
  }

  async function handleRemoveAccess(mcId: string) {
    if (!confirm('Remover acesso?')) return
    await db.delete('member_clients', { id: mcId })
    toast('Removido', 'success')
    if (cliente) loadAccessData(cliente.id)
  }

  async function handleInviteForClient(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) return
    const token = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('')
    const { data: invite, error } = await db.insert('invites', { org_id: org!.id, email: inviteEmail, role: 'cliente', token, invited_by: currentMember?.user_id }, { select: '*', single: true })
    if (error) { toast('Erro', 'error'); return }
    if (invite) await db.insert('member_clients', { member_id: invite.id, cliente_id: cliente.id, org_id: org!.id })
    await navigator.clipboard.writeText(`${window.location.origin}/auth/invite?token=${token}`)
    toast('Link copiado!', 'success')
    setInviteModalOpen(false)
    setInviteEmail('')
    loadAccessData(cliente.id)
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-full rounded-2xl" /><div className="grid grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div></div>
  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'
  const porMes: Record<number, Conteudo[]> = {}
  for (let m = 1; m <= 12; m++) porMes[m] = []
  conteudos.forEach(c => { if (c.mes && porMes[c.mes]) porMes[c.mes].push(c) })

  const TABS: { id: ViewTab; label: string; icon: any; href?: string }[] = [
    { id: 'anual', label: 'Visão Anual', icon: Calendar },
    { id: 'acessos', label: 'Acessos', icon: Users },
    { id: 'aprovadores', label: 'Aprovadores', icon: CheckCircle2 },
    { id: 'planejamento' as ViewTab, label: 'Planejamento', icon: Target, href: `/clientes/${slug}/planejamento` },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: `/clientes/${slug}/analytics` },
    { id: 'campanhas' as ViewTab, label: 'Campanhas', icon: Target, href: `/clientes/${slug}/campanhas` },
    { id: 'brand', label: 'Brand Book', icon: Palette, href: `/clientes/${slug}/brand` },
    { id: 'repositorio', label: 'Repositório', icon: FolderOpen, href: `/clientes/${slug}/repositorio` },
    { id: 'redes' as ViewTab, label: 'Redes Sociais', icon: Share2, href: `/clientes/${slug}/redes` },
    { id: 'blog' as ViewTab, label: 'Blog', icon: FileText, href: `/clientes/${slug}/blog` },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card - Banner Style */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Banner gradient */}
        <div 
          className="h-24 max-sm:h-20 relative"
          style={{ background: `linear-gradient(135deg, ${primaria} 0%, ${cliente.cores?.secundaria || primaria}90 100%)` }}
        >
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23fff" fill-opacity="1" fill-rule="evenodd"%3E%3Cpath d="M0 40L40 0H20L0 20M40 40V20L20 40"/%3E%3C/g%3E%3C/svg%3E")' }} />
          
          {/* Avatar posicionado */}
          <div className="absolute -bottom-6 left-6 max-sm:left-4 max-sm:-bottom-5">
            <div className="ring-4 ring-white rounded-2xl shadow-xl bg-white">
              <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" className="w-16 h-16 max-sm:w-14 max-sm:h-14 text-xl rounded-xl" />
            </div>
          </div>
          
          {/* Year selector posicionado no banner */}
          <div className="absolute bottom-3 right-4 max-sm:bottom-2 max-sm:right-3">
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-xl p-1">
              <Button size="sm" variant="ghost" onClick={() => setAno(a => a - 1)} className="h-8 w-8 max-sm:h-7 max-sm:w-7 p-0 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-lg max-sm:text-base min-w-[50px] text-center text-white">{ano}</span>
              <Button size="sm" variant="ghost" onClick={() => setAno(a => a + 1)} className="h-8 w-8 max-sm:h-7 max-sm:w-7 p-0 text-white hover:bg-white/20">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="pt-10 pb-4 px-6 max-sm:pt-8 max-sm:pb-3 max-sm:px-4">
          <div className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start max-sm:gap-2">
            <div>
              <h1 className="text-2xl max-sm:text-xl font-bold text-zinc-900">{cliente.nome}</h1>
              <p className="text-sm max-sm:text-xs text-zinc-500">{conteudos.length} conteúdos em {ano}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation - Mobile Scroll */}
      <div className="flex gap-1.5 p-1.5 bg-zinc-100 rounded-2xl overflow-x-auto scrollbar-hide max-sm:gap-1 max-sm:p-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = view === tab.id
          const className = `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap max-sm:px-3 max-sm:py-2 max-sm:text-xs max-sm:gap-1.5 ${
            isActive 
              ? 'bg-white text-zinc-900 shadow-md' 
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
          }`
          
          if (tab.href) {
            return (
              <Link key={tab.id} href={tab.href} className={className}>
                <Icon className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5" />
                <span className="max-sm:hidden">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </Link>
            )
          }
          
          return (
            <button key={tab.id} onClick={() => setView(tab.id)} className={className}>
              <Icon className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5" />
              <span className="max-sm:hidden">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {view === 'anual' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-sm:gap-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const posts = porMes[m]
            const total = posts.length
            const statusCounts: Record<string, number> = {}
            posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })
            const currentMonth = new Date().getMonth() + 1
            const isCurrentMonth = m === currentMonth && ano === new Date().getFullYear()
            const isPastMonth = m < currentMonth && ano === new Date().getFullYear()
            const completedCount = statusCounts['publicado'] || 0
            const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0

            return (
              <Link key={m} href={`/clientes/${slug}/mes/${m}`}>
                <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-0 shadow-md hover:-translate-y-1 ${
                  isCurrentMonth ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}>
                  {/* Mini header colorido */}
                  <div 
                    className="h-1.5 transition-all"
                    style={{ 
                      background: isCurrentMonth 
                        ? `linear-gradient(90deg, ${primaria}, #3b82f6)` 
                        : total > 0 
                          ? `linear-gradient(90deg, ${primaria}40, ${primaria}20)` 
                          : '#e5e7eb'
                    }}
                  />
                  
                  <CardContent className="p-4 max-sm:p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 max-sm:mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl max-sm:text-xl font-black ${
                          isCurrentMonth ? 'text-blue-600' : isPastMonth ? 'text-zinc-300' : 'text-zinc-800'
                        }`}>
                          {String(m).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className={`font-bold text-sm max-sm:text-xs leading-tight group-hover:text-blue-600 transition-colors ${
                            isCurrentMonth ? 'text-blue-600' : 'text-zinc-700'
                          }`}>
                            {MESES[m - 1]}
                          </h3>
                          {isCurrentMonth && (
                            <span className="text-[10px] text-blue-500 font-medium">● Mês atual</span>
                          )}
                        </div>
                      </div>
                      <div className={`text-right ${total > 0 ? '' : 'opacity-50'}`}>
                        <span className={`text-lg max-sm:text-base font-bold ${total > 0 ? 'text-zinc-800' : 'text-zinc-300'}`}>
                          {total}
                        </span>
                        <span className="text-[10px] text-zinc-400 block leading-tight">posts</span>
                      </div>
                    </div>
                    
                    {total > 0 ? (
                      <>
                        {/* Progress bar elegante */}
                        <div className="relative h-2 rounded-full overflow-hidden bg-zinc-100 mb-3 max-sm:mb-2">
                          <div className="absolute inset-0 flex">
                            {Object.entries(statusCounts).map(([status, count], idx) => (
                              <div 
                                key={status} 
                                className="h-full transition-all duration-500" 
                                style={{ 
                                  width: `${(count / total) * 100}%`, 
                                  backgroundColor: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#ccc',
                                  opacity: 0.9
                                }} 
                                title={`${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}: ${count}`} 
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Status pills */}
                        <div className="flex flex-wrap gap-1.5 max-sm:gap-1">
                          {Object.entries(statusCounts)
                            .sort(([a], [b]) => {
                              const order = ['publicado', 'agendado', 'aprovacao_cliente', 'producao', 'rascunho']
                              return order.indexOf(a) - order.indexOf(b)
                            })
                            .slice(0, 4) // Mostrar max 4 no mobile
                            .map(([s, c]) => (
                              <span 
                                key={s} 
                                className="inline-flex items-center gap-1 text-[10px] max-sm:text-[9px] font-medium px-2 py-1 max-sm:px-1.5 rounded-full"
                                style={{ 
                                  backgroundColor: `${STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.color}15`,
                                  color: STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.color 
                                }}
                              >
                                <span>{STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.emoji}</span>
                                <span>{c}</span>
                              </span>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-3 max-sm:py-2 text-center">
                        <p className="text-xs text-zinc-300 italic">Nenhum conteúdo</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {view === 'acessos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">Quem tem acesso</h3>
            <Button size="sm" onClick={() => setInviteModalOpen(true)}>
              <Mail className="w-4 h-4 mr-1" /> Convidar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingAccess ? (
                <div className="px-6 py-8 text-center text-sm text-zinc-400">Carregando...</div>
              ) : accessMembers.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500 mb-1">Nenhum membro com acesso</p>
                  <p className="text-xs text-zinc-400">Convide alguém para dar acesso ao portal</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {accessMembers.map(mc => (
                    <div key={mc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50">
                      <Avatar name={mc.member?.display_name || 'Pendente'} src={mc.member?.avatar_url} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{mc.member?.display_name || 'Convite pendente'}</div>
                        <div className="text-xs text-zinc-400">{mc.member?.role || 'Aguardando aceite'}</div>
                      </div>
                      <Badge variant={mc.member ? 'success' : 'warning'}>{mc.member ? 'Ativo' : 'Pendente'}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveAccess(mc.id)}>
                        <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Aprovadores - Estilo Aprova Aí */}
      {view === 'aprovadores' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-zinc-900">Fluxo de Aprovação</h3>
              <p className="text-sm text-zinc-500">Configure quem aprova os conteúdos e em qual ordem</p>
            </div>
            <Button onClick={() => openNewAprovador(maxNivel + 1)}>
              <Plus className="w-4 h-4 mr-1" /> Novo Nível
            </Button>
          </div>

          {loadingAprovadores ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : Object.keys(aprovadoresPorNivel).length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">Nenhum aprovador configurado</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Configure o fluxo de aprovação para este cliente.<br />
                  Os conteúdos passarão por cada nível antes de serem publicados.
                </p>
                <Button onClick={() => openNewAprovador(1)}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Primeiro Aprovador
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Níveis de Aprovação */}
              {Object.entries(aprovadoresPorNivel)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([nivel, lista], index) => (
                  <Card key={nivel} className="overflow-hidden shadow-lg border-0">
                    {/* Header do Nível */}
                    <div 
                      className="px-5 py-3 flex items-center justify-between"
                      style={{ 
                        background: `linear-gradient(135deg, ${primaria}${index === 0 ? '' : '90'} 0%, ${primaria}60 100%)`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                          {nivel}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">
                            Nível {nivel} {index === 0 ? '(Primeira Aprovação)' : index === Object.keys(aprovadoresPorNivel).length - 1 ? '(Aprovação Final)' : ''}
                          </h4>
                          <p className="text-white/70 text-xs">
                            {lista.length} aprovador{lista.length > 1 ? 'es' : ''}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-white hover:bg-white/20"
                        onClick={() => openNewAprovador(Number(nivel))}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>

                    {/* Lista de Aprovadores do Nível */}
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {lista.map((apr, aprIndex) => (
                          <div 
                            key={apr.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${
                              !apr.ativo ? 'opacity-50 bg-zinc-50' : 'bg-white'
                            }`}
                          >
                            {/* Drag handle */}
                            <div className="text-zinc-300 cursor-grab">
                              <GripVertical className="w-5 h-5" />
                            </div>

                            {/* Avatar */}
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                              style={{ backgroundColor: primaria }}
                            >
                              {apr.nome.charAt(0).toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-900">{apr.nome}</span>
                                <Badge 
                                  variant={apr.tipo === 'interno' ? 'info' : apr.tipo === 'cliente' ? 'success' : 'default'}
                                  className="text-[10px]"
                                >
                                  {apr.tipo === 'interno' ? 'Equipe' : apr.tipo === 'cliente' ? 'Cliente' : 'Designer'}
                                </Badge>
                                {!apr.ativo && <Badge variant="warning" className="text-[10px]">Inativo</Badge>}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  +{apr.pais.replace('+', '')} {apr.whatsapp.replace(/^55/, '')}
                                </span>
                                {apr.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3" />
                                    {apr.email}
                                  </span>
                                )}
                              </div>
                              
                              {/* Tags de config */}
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
                                    <Edit2 className="w-3 h-3" /> Pode editar legenda
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => toggleAprovadorAtivo(apr)}
                                className={apr.ativo ? 'text-green-500' : 'text-zinc-400'}
                              >
                                {apr.ativo ? '✓' : '○'}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEditAprovador(apr)}>
                                <Edit2 className="w-4 h-4 text-zinc-400" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteAprovador(apr.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {/* Botão para adicionar novo nível */}
              <button
                onClick={() => openNewAprovador(maxNivel + 1)}
                className="w-full py-6 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar Nível {maxNivel + 1}
              </button>

              {/* Explicação do fluxo */}
              <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Como funciona o fluxo</h4>
                      <p className="text-sm text-blue-700">
                        Os conteúdos passam por cada nível em ordem. Quando o <strong>Nível 1</strong> aprova, 
                        vai para o <strong>Nível 2</strong>, e assim por diante. Notificações são enviadas 
                        automaticamente via WhatsApp e Email para os aprovadores configurados.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title={`✉️ Convidar para ${cliente?.nome}`} size="sm">
        <form onSubmit={handleInviteForClient} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" required />
          </div>
          <p className="text-xs text-zinc-500">Convite com role &quot;cliente&quot; vinculado a <strong>{cliente?.nome}</strong>.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancelar</Button>
            <Button type="submit">📨 Enviar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Aprovador */}
      <Modal 
        open={aprovadorModalOpen} 
        onClose={() => setAprovadorModalOpen(false)} 
        title={editingAprovador ? '✏️ Editar Aprovador' : '➕ Novo Aprovador'} 
        size="md"
      >
        <form onSubmit={handleSaveAprovador} className="space-y-5">
          {/* Info básica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={aprovadorForm.nome} 
                onChange={e => setAprovadorForm({...aprovadorForm, nome: e.target.value})}
                placeholder="Nome do aprovador"
                required
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-lg">
                {(['cliente', 'interno', 'designer'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAprovadorForm({...aprovadorForm, tipo: t})}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      aprovadorForm.tipo === t 
                        ? 'bg-white text-zinc-900 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {t === 'cliente' ? '👤 Cliente' : t === 'interno' ? '🏢 Equipe' : '🎨 Designer'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>WhatsApp *</Label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-zinc-100 text-zinc-500 text-sm rounded-lg border border-zinc-200">
                  {aprovadorForm.pais}
                </span>
                <Input 
                  value={aprovadorForm.whatsapp} 
                  onChange={e => setAprovadorForm({...aprovadorForm, whatsapp: e.target.value})}
                  placeholder="31999999999"
                  required
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input 
                type="email"
                value={aprovadorForm.email} 
                onChange={e => setAprovadorForm({...aprovadorForm, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Nível */}
          <div>
            <Label>Nível de Aprovação</Label>
            <div className="flex gap-2 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAprovadorForm({...aprovadorForm, nivel: n})}
                  className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${
                    aprovadorForm.nivel === n 
                      ? 'text-white shadow-lg' 
                      : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                  }`}
                  style={aprovadorForm.nivel === n ? { backgroundColor: primaria } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Nível {aprovadorForm.nivel}: {aprovadorForm.nivel === 1 ? 'Primeira aprovação' : `Aprovação após nível ${aprovadorForm.nivel - 1}`}
            </p>
          </div>

          {/* Configurações */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="mb-0">Receber notificações</Label>
                <p className="text-xs text-zinc-400">WhatsApp e email quando tiver conteúdo pra aprovar</p>
              </div>
              <button
                type="button"
                onClick={() => setAprovadorForm({...aprovadorForm, recebe_notificacao: !aprovadorForm.recebe_notificacao})}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  aprovadorForm.recebe_notificacao ? 'bg-green-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  aprovadorForm.recebe_notificacao ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="mb-0">Pode editar legenda</Label>
                <p className="text-xs text-zinc-400">Permitir alterar texto ao aprovar</p>
              </div>
              <button
                type="button"
                onClick={() => setAprovadorForm({...aprovadorForm, pode_editar_legenda: !aprovadorForm.pode_editar_legenda})}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  aprovadorForm.pode_editar_legenda ? 'bg-blue-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  aprovadorForm.pode_editar_legenda ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setAprovadorModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              💾 {editingAprovador ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
