'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Label, Select } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Plus, Mail, Shield, UserX } from 'lucide-react'
import type { Member, Invite, Cliente } from '@/types/database'
import { useRoleGuard } from '@/hooks/use-role-guard'

export default function EquipePage() {
  const { org, member: currentMember } = useAuth()
  const { allowed, loading: roleLoading } = useRoleGuard(['admin', 'gestor'])
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('designer')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([])

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data: mems } = await db.select('members', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })
    setMembers(mems || [])

    const { data: invs } = await db.select('invites', {
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'is', col: 'accepted_at', val: null },
      ],
      order: [{ col: 'created_at', asc: false }],
    })
    setInvites(invs || [])

    const { data: cls } = await db.select('clientes', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'nome', asc: true }],
    })
    setClientes(cls || [])
    setLoading(false)
  }

  function toggleClienteId(id: string) {
    setSelectedClienteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()

    if (inviteRole === 'cliente' && selectedClienteIds.length === 0) {
      toast('Selecione ao menos um cliente para vincular', 'error')
      return
    }

    const token = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')

    const { data: invite, error } = await db.insert('invites', {
      org_id: org!.id,
      email: inviteEmail,
      role: inviteRole,
      token,
      invited_by: currentMember?.user_id,
    }, { select: '*', single: true })

    if (error) { toast('Erro ao enviar convite', 'error'); return }

    // If role is "cliente", save the client associations
    // These will be applied when the invite is accepted (member is created)
    // For now, store them as metadata in a separate table keyed by invite token
    if (inviteRole === 'cliente' && selectedClienteIds.length > 0 && invite) {
      // Store pending client links - will be resolved when member is created
      // We use a convention: store in member_clients with a placeholder member_id
      // that matches the invite id, so we can resolve it on accept
      for (const clienteId of selectedClienteIds) {
        await db.insert('member_clients', {
          member_id: invite.id, // temporarily store invite id as member_id
          cliente_id: clienteId,
          org_id: org!.id,
        })
      }
    }

    const link = `${window.location.origin}/auth/invite?token=${token}`
    
    // Send invite email automatically
    try {
      const emailRes = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          inviteToken: token,
          orgName: org?.name || 'BASE Content Studio',
        }),
      })
      const emailData = await emailRes.json()
      
      if (emailData.status === 'sent' || emailData.status === 'magic_link_sent') {
        toast('✅ Convite enviado por email!', 'success')
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(link)
        toast('⚠️ Email não enviado. Link copiado!', 'info')
      }
    } catch {
      await navigator.clipboard.writeText(link)
      toast('⚠️ Email não enviado. Link copiado!', 'info')
    }

    setInviteOpen(false)
    setInviteEmail('')
    setSelectedClienteIds([])
    loadData()
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    await db.update('members', { role: newRole }, { id: memberId })
    toast('Role atualizado!', 'success')
    loadData()
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remover este membro da equipe?')) return
    await db.update('members', { status: 'inactive' }, { id: memberId })
    toast('Membro removido', 'success')
    loadData()
  }

  const isAdmin = currentMember?.role === 'admin'

  const ROLE_COLORS = {
    admin: 'danger', gestor: 'info', designer: 'success', cliente: 'warning'
  } as const

  if (loading || roleLoading || !allowed) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Equipe</h1>
          <p className="text-sm text-zinc-500">{members.filter(m => m.status === 'active').length} membros ativos</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4" /> Convidar
          </Button>
        )}
      </div>

      {/* Members */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">Membros</h3>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-50">
            {members.filter(m => m.status === 'active').map(m => (
              <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                <Avatar name={m.display_name || '?'} src={m.avatar_url} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900">{m.display_name}</div>
                  <div className="text-xs text-zinc-400">{m.user_id === currentMember?.user_id ? 'Você' : ''}</div>
                </div>
                {isAdmin && m.user_id !== currentMember?.user_id ? (
                  <Select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value)}
                    className="w-32"
                  >
                    <option value="admin">Admin</option>
                    <option value="gestor">Gestor</option>
                    <option value="designer">Designer</option>
                    <option value="cliente">Cliente</option>
                  </Select>
                ) : (
                  <Badge variant={ROLE_COLORS[m.role as keyof typeof ROLE_COLORS] || 'default'}>
                    {m.role}
                  </Badge>
                )}
                {isAdmin && m.user_id !== currentMember?.user_id && (
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(m.id)}>
                    <UserX className="w-4 h-4 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900">Convites Pendentes</h3>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-50">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                  <Mail className="w-5 h-5 text-zinc-300" />
                  <div className="flex-1">
                    <div className="text-sm text-zinc-900">{inv.email}</div>
                    <div className="text-xs text-zinc-400">
                      Expira em {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Badge>{inv.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="✉️ Convidar Membro" size="sm">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" required />
          </div>
          <div>
            <Label>Função</Label>
            <Select value={inviteRole} onChange={e => { setInviteRole(e.target.value); setSelectedClienteIds([]) }}>
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="designer">Designer</option>
              <option value="cliente">Cliente</option>
            </Select>
          </div>
          {inviteRole === 'cliente' && (
            <div>
              <Label>Vincular ao(s) cliente(s):</Label>
              <div className="mt-2 max-h-48 overflow-y-auto border border-zinc-200 rounded-lg p-2 space-y-1">
                {clientes.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-3">Nenhum cliente cadastrado</p>
                ) : (
                  clientes.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClienteIds.includes(c.id)}
                        onChange={() => toggleClienteId(c.id)}
                        className="rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: c.cores?.primaria || '#6366F1' }}
                        >
                          {c.nome.charAt(0)}
                        </div>
                        <span className="text-sm text-zinc-900 truncate">{c.nome}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedClienteIds.length > 0 && (
                <p className="text-xs text-zinc-500 mt-1">{selectedClienteIds.length} cliente(s) selecionado(s)</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">📨 Enviar Convite</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
