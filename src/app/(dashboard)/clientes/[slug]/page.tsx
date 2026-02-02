'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { MESES, STATUS_CONFIG, TIPO_EMOJI, formatDate } from '@/lib/utils'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { ChevronLeft, ChevronRight, Plus, Calendar, Kanban, Users, Trash2, Mail, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Cliente, Conteudo, Member, MemberClient } from '@/types/database'

export default function ClienteDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { org, member: currentMember } = useAuth()
  const { toast } = useToast()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [conteudos, setConteudos] = useState<Conteudo[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [view, setView] = useState<'anual' | 'acessos'>('anual')
  const [loading, setLoading] = useState(true)

  // Acessos state
  const [accessMembers, setAccessMembers] = useState<(MemberClient & { member?: Member })[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [loadingAccess, setLoadingAccess] = useState(false)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org, ano])

  async function loadData() {
    const { data: c } = await db.select('clientes', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'slug', val: slug },
      ],
      single: true,
    })

    if (!c) return
    setCliente(c)

    const { data: conts } = await db.select('conteudos', {
      filters: [
        { op: 'eq', col: 'empresa_id', val: c.id },
        { op: 'eq', col: 'ano', val: ano },
      ],
      order: [{ col: 'ordem', asc: true }, { col: 'data_publicacao', asc: true }],
    })

    setConteudos(conts || [])
    setLoading(false)

    // Load access data
    loadAccessData(c.id)
  }

  async function loadAccessData(clienteId: string) {
    setLoadingAccess(true)
    // Get member_clients for this client
    const { data: mcs } = await db.select('member_clients', {
      filters: [
        { op: 'eq', col: 'cliente_id', val: clienteId },
        { op: 'eq', col: 'org_id', val: org!.id },
      ],
    })

    // Get all members to resolve names
    const { data: members } = await db.select('members', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'status', val: 'active' },
      ],
    })

    const memberMap = new Map((members || []).map((m: Member) => [m.id, m]))
    const enriched = (mcs || []).map((mc: MemberClient) => ({
      ...mc,
      member: memberMap.get(mc.member_id),
    }))

    setAccessMembers(enriched)
    setAllMembers(members || [])
    setLoadingAccess(false)
  }

  async function handleRemoveAccess(mcId: string) {
    if (!confirm('Remover acesso deste membro?')) return
    await db.delete('member_clients', { id: mcId })
    toast('Acesso removido', 'success')
    if (cliente) loadAccessData(cliente.id)
  }

  async function handleInviteForClient(e: React.FormEvent) {
    e.preventDefault()
    if (!cliente) return

    const token = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')

    const { data: invite, error } = await db.insert('invites', {
      org_id: org!.id,
      email: inviteEmail,
      role: 'cliente',
      token,
      invited_by: currentMember?.user_id,
    }, { select: '*', single: true })

    if (error) { toast('Erro ao enviar convite', 'error'); return }

    if (invite) {
      await db.insert('member_clients', {
        member_id: invite.id,
        cliente_id: cliente.id,
        org_id: org!.id,
      })
    }

    const link = `${window.location.origin}/auth/invite?token=${token}`
    await navigator.clipboard.writeText(link)
    toast('Convite criado! Link copiado.', 'success')
    setInviteModalOpen(false)
    setInviteEmail('')
    loadAccessData(cliente.id)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!cliente) return <div className="text-center py-12 text-zinc-500">Cliente não encontrado</div>

  const primaria = cliente.cores?.primaria || '#6366F1'

  // Group by month
  const porMes: Record<number, Conteudo[]> = {}
  for (let m = 1; m <= 12; m++) porMes[m] = []
  conteudos.forEach(c => { if (c.mes && porMes[c.mes]) porMes[c.mes].push(c) })

  // Group by status for workflow
  const porStatus: Record<string, Conteudo[]> = {}
  Object.keys(STATUS_CONFIG).forEach(s => porStatus[s] = [])
  conteudos.forEach(c => {
    const s = c.status || 'rascunho'
    if (porStatus[s]) porStatus[s].push(c)
    else porStatus['rascunho'].push(c)
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={cliente.nome} src={cliente.logo_url} color={primaria} size="lg" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: primaria }}>{cliente.nome}</h1>
            <p className="text-sm text-zinc-500">{conteudos.length} conteúdos em {ano}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAno(a => a - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-lg min-w-[60px] text-center">{ano}</span>
          <Button size="sm" variant="ghost" onClick={() => setAno(a => a + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === 'anual' ? 'primary' : 'outline'}
          onClick={() => setView('anual')}
        >
          <Calendar className="w-4 h-4" /> Visão Anual
        </Button>
        <Link href={`/workflow?cliente=${cliente.id}`}>
          <Button size="sm" variant="outline">
            <Kanban className="w-4 h-4" /> Workflow
          </Button>
        </Link>
        <Button
          size="sm"
          variant={view === 'acessos' ? 'primary' : 'outline'}
          onClick={() => setView('acessos')}
        >
          <Users className="w-4 h-4" /> Acessos
        </Button>
        <Link href={`/clientes/${slug}/analytics`}>
          <Button size="sm" variant="outline" className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 hover:from-violet-700 hover:to-purple-700">
            <BarChart3 className="w-4 h-4" /> Analytics
          </Button>
        </Link>
        <Link href={`/clientes/${slug}/brand`}>
          <Button size="sm" variant="outline" className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 hover:from-pink-700 hover:to-purple-700">
            🎨 Brand Book
          </Button>
        </Link>
        <Link href={`/clientes/${slug}/repositorio`}>
          <Button size="sm" variant="outline">
            📁 Repositório
          </Button>
        </Link>
        <Link href={`/clientes/${slug}/redes`}>
          <Button size="sm" variant="outline" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700">
            🔗 Redes Sociais
          </Button>
        </Link>
      </div>

      {view === 'anual' && (
        /* VISÃO ANUAL - Grid de meses */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const posts = porMes[m]
            const total = posts.length
            const statusCounts: Record<string, number> = {}
            posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })

            return (
              <Link key={m} href={`/clientes/${slug}/mes/${m}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600">{MESES[m - 1]}</h3>
                      <span className="text-xs text-zinc-400">{total} posts</span>
                    </div>
                    {total > 0 ? (
                      <>
                        <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100 mb-2">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div
                              key={status}
                              className="h-full transition-all"
                              style={{
                                width: `${(count / total) * 100}%`,
                                backgroundColor: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#ccc'
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(statusCounts).map(([s, c]) => (
                            <span key={s} className="text-[10px] text-zinc-400">
                              {STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.emoji} {c}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-400">Nenhum conteúdo</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {view === 'acessos' && (
        /* ACESSOS - Quem tem acesso a este cliente */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900">Quem tem acesso</h3>
            <Button size="sm" variant="primary" onClick={() => setInviteModalOpen(true)}>
              <Mail className="w-4 h-4" /> Convidar para este cliente
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingAccess ? (
                <div className="px-6 py-8 text-center text-sm text-zinc-400">Carregando...</div>
              ) : accessMembers.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <p className="text-sm text-zinc-500">Nenhum membro com acesso a este cliente</p>
                  <p className="text-xs text-zinc-400 mt-1">Convide alguém para dar acesso ao portal</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {accessMembers.map(mc => (
                    <div key={mc.id} className="flex items-center gap-4 px-6 py-4">
                      <Avatar name={mc.member?.display_name || 'Pendente'} src={mc.member?.avatar_url} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">
                          {mc.member?.display_name || 'Convite pendente'}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {mc.member ? mc.member.role : 'Aguardando aceite'}
                        </div>
                      </div>
                      <Badge variant={mc.member ? 'success' : 'warning'}>
                        {mc.member ? 'Ativo' : 'Pendente'}
                      </Badge>
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

      {/* Invite for client modal */}
      <Modal open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title={`✉️ Convidar para ${cliente?.nome}`} size="sm">
        <form onSubmit={handleInviteForClient} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <p className="text-xs text-zinc-500">
            Um convite com role &quot;cliente&quot; será criado automaticamente vinculado a <strong>{cliente?.nome}</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">📨 Enviar Convite</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
