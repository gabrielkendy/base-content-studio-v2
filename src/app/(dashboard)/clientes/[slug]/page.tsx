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
import { ChevronLeft, ChevronRight, Calendar, Users, Trash2, Mail, BarChart3, Palette, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Member, MemberClient } from '@/types/database'
import { normalizeStatus } from '@/lib/utils'

type ViewTab = 'anual' | 'acessos' | 'analytics' | 'brand' | 'repositorio'

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
  }

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
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: `/clientes/${slug}/analytics` },
    { id: 'brand', label: 'Brand Book', icon: Palette, href: `/clientes/${slug}/brand` },
    { id: 'repositorio', label: 'Repositório', icon: FolderOpen, href: `/clientes/${slug}/repositorio` },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="h-2" style={{ backgroundColor: primaria }} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="xl" />
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">{cliente.nome}</h1>
                <p className="text-sm text-zinc-500">{conteudos.length} conteúdos em {ano}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
              <Button size="sm" variant="ghost" onClick={() => setAno(a => a - 1)} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-bold text-lg min-w-[60px] text-center">{ano}</span>
              <Button size="sm" variant="ghost" onClick={() => setAno(a => a + 1)} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = view === tab.id
          const className = `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
          }`
          
          if (tab.href) {
            return (
              <Link key={tab.id} href={tab.href} className={className}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            )
          }
          
          return (
            <button key={tab.id} onClick={() => setView(tab.id)} className={className}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {view === 'anual' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const posts = porMes[m]
            const total = posts.length
            const statusCounts: Record<string, number> = {}
            posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })
            const currentMonth = new Date().getMonth() + 1
            const isCurrentMonth = m === currentMonth && ano === new Date().getFullYear()

            return (
              <Link key={m} href={`/clientes/${slug}/mes/${m}`}>
                <Card className={`hover:shadow-lg transition-all cursor-pointer group h-full ${isCurrentMonth ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold group-hover:text-blue-600 ${isCurrentMonth ? 'text-blue-600' : 'text-zinc-900'}`}>
                        {MESES[m - 1]}
                      </h3>
                      <Badge variant={total > 0 ? 'default' : 'secondary'} className="text-xs">
                        {total} posts
                      </Badge>
                    </div>
                    {total > 0 ? (
                      <>
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-100 mb-3">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status} className="h-full transition-all" style={{ width: `${(count / total) * 100}%`, backgroundColor: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#ccc' }} title={`${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}: ${count}`} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(statusCounts).map(([s, c]) => (
                            <span key={s} className="text-xs text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded">
                              {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.emoji} {c}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-400">Nenhum conteúdo</p>
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
    </div>
  )
}
