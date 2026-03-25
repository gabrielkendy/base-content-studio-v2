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
import {
  Plus, Mail, UserX, Trash2, Copy, RefreshCw, Shield, Users, Clock,
  Settings2, Phone, MessageCircle, Bell, Pencil, KeyRound, CheckCircle, ExternalLink,
} from 'lucide-react'
import type { Member, Invite, Cliente, MemberPermissions } from '@/types/database'
import { useRoleGuard } from '@/hooks/use-role-guard'
import { PermissionsModal } from '@/components/permissions-modal'

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
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: '', message: '', onConfirm: () => {}
  })
  const [permissionsModal, setPermissionsModal] = useState<{ open: boolean; member: Member | null }>({
    open: false, member: null
  })
  const [editMemberModal, setEditMemberModal] = useState<{ open: boolean; member: Member | null }>({
    open: false, member: null
  })
  const [editForm, setEditForm] = useState({
    display_name: '',
    whatsapp: '',
    pais: '+55',
    notificar_email: true,
    notificar_whatsapp: true,
  })

  // Modal que exibe link do convite após criação
  const [inviteLinkModal, setInviteLinkModal] = useState<{ open: boolean; link: string; email: string; emailSent: boolean }>({
    open: false, link: '', email: '', emailSent: false,
  })

  // Modal de reset de senha
  const [resetModal, setResetModal] = useState<{ open: boolean; member: Member | null; link?: string; sent: boolean }>({
    open: false, member: null, link: undefined, sent: false,
  })

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data: mems } = await db.select('members', {
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
    })

    // Enriquece membros com email via admin API
    try {
      const emailRes = await fetch('/api/members/emails')
      if (emailRes.ok) {
        const { emails } = await emailRes.json()
        const enriched = (mems || []).map((m: any) => ({
          ...m,
          email: emails[m.user_id] || m.email || null,
        }))
        setMembers(enriched)
      } else {
        setMembers(mems || [])
      }
    } catch {
      setMembers(mems || [])
    }

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

  function openEditMember(member: Member) {
    setEditMemberModal({ open: true, member })
    setEditForm({
      display_name: member.display_name || '',
      whatsapp: (member as any).whatsapp || '',
      pais: (member as any).pais || '+55',
      notificar_email: (member as any).notificar_email ?? true,
      notificar_whatsapp: (member as any).notificar_whatsapp ?? true,
    })
  }

  async function handleSaveEditMember(e: React.FormEvent) {
    e.preventDefault()
    if (!editMemberModal.member) return

    const payload = {
      display_name: editForm.display_name || null,
      whatsapp: editForm.whatsapp ? editForm.whatsapp.replace(/\D/g, '') : null,
      pais: editForm.pais,
      notificar_email: editForm.notificar_email,
      notificar_whatsapp: editForm.notificar_whatsapp,
    }

    const { error } = await db.update('members', payload, { id: editMemberModal.member.id })
    if (error) { toast('Erro ao salvar', 'error'); return }

    toast('Membro atualizado!', 'success')
    setEditMemberModal({ open: false, member: null })
    loadData()
  }

  // ── Enviar reset de senha ──
  async function handleSendReset(member: Member) {
    const email = (member as any).email
    if (!email) {
      toast('Email do membro não encontrado', 'error')
      return
    }
    setResetModal({ open: true, member, link: undefined, sent: false })
    setActionLoading(member.id)
    try {
      const res = await fetch('/api/members/send-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, memberId: member.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar link')

      if (data.status === 'sent') {
        setResetModal({ open: true, member, link: undefined, sent: true })
      } else {
        // link_only — mostra link para o admin copiar
        setResetModal({ open: true, member, link: data.link, sent: false })
      }
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar reset', 'error')
      setResetModal({ open: false, member: null, link: undefined, sent: false })
    } finally {
      setActionLoading(null)
    }
  }

  // ── Criar convite ──
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()

    if (inviteRole === 'cliente' && selectedClienteIds.length === 0) {
      toast('Selecione ao menos um cliente para vincular', 'error')
      return
    }

    const existingInvite = invites.find(inv => inv.email.toLowerCase() === inviteEmail.toLowerCase())
    if (existingInvite) {
      toast('Já existe um convite pendente para este email. Reenvie ou apague o existente.', 'error')
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
      client_ids: inviteRole === 'cliente' ? selectedClienteIds : [],
    }, { select: '*', single: true })

    if (error) { toast('Erro ao criar convite', 'error'); return }

    const link = `${window.location.origin}/auth/invite?token=${token}`
    setInviteOpen(false)
    setInviteEmail('')
    setSelectedClienteIds([])
    loadData()

    // Tenta enviar email
    let emailSent = false
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
      emailSent = emailData.status === 'sent' || emailData.status === 'magic_link_sent'
    } catch {}

    // Sempre mostra o modal com o link
    setInviteLinkModal({ open: true, link, email: inviteEmail, emailSent })
  }

  // ── Renovar convite expirado ──
  async function handleRenewInvite(invite: Invite) {
    setActionLoading(invite.id)
    try {
      const newToken = Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + 7)

      await db.update('invites', {
        token: newToken,
        expires_at: newExpiry.toISOString(),
      }, { id: invite.id })

      // Re-envia email
      const link = `${window.location.origin}/auth/invite?token=${newToken}`
      let emailSent = false
      try {
        const emailRes = await fetch('/api/invite/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: invite.email,
            role: invite.role,
            inviteToken: newToken,
            orgName: org?.name || 'BASE Content Studio',
          }),
        })
        const emailData = await emailRes.json()
        emailSent = emailData.status === 'sent' || emailData.status === 'magic_link_sent'
      } catch {}

      loadData()
      setInviteLinkModal({ open: true, link, email: invite.email, emailSent })
    } catch {
      toast('Erro ao renovar convite', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeleteInvite(inviteId: string, email: string) {
    setConfirmModal({
      open: true,
      title: 'Apagar Convite',
      message: `Tem certeza que deseja apagar o convite para ${email}?`,
      onConfirm: async () => {
        setActionLoading(inviteId)
        setConfirmModal(prev => ({ ...prev, open: false }))
        try {
          await db.delete('member_clients', { member_id: inviteId })
          await db.delete('invites', { id: inviteId })
          toast('Convite apagado!', 'success')
          loadData()
        } catch {
          toast('Erro ao apagar convite', 'error')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  async function handleResendInvite(invite: Invite) {
    setActionLoading(invite.id)
    try {
      const emailRes = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invite.email,
          role: invite.role,
          inviteToken: invite.token,
          orgName: org?.name || 'BASE Content Studio',
        }),
      })
      const emailData = await emailRes.json()
      const link = `${window.location.origin}/auth/invite?token=${invite.token}`
      const emailSent = emailData.status === 'sent' || emailData.status === 'magic_link_sent'
      setInviteLinkModal({ open: true, link, email: invite.email, emailSent })
    } catch {
      toast('Erro ao reenviar convite', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCopyInviteLink(token: string) {
    const link = `${window.location.origin}/auth/invite?token=${token}`
    await navigator.clipboard.writeText(link)
    toast('Link copiado!', 'success')
  }

  async function handleCopyLink(link: string) {
    await navigator.clipboard.writeText(link)
    toast('Link copiado!', 'success')
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    await db.update('members', { role: newRole }, { id: memberId })
    toast('Role atualizado!', 'success')
    loadData()
  }

  async function handleSavePermissions(memberId: string, permissions: MemberPermissions) {
    try {
      await db.update('members', { custom_permissions: permissions }, { id: memberId })
      toast('Permissões atualizadas!', 'success')
      loadData()
    } catch (err) {
      toast('Erro ao salvar permissões', 'error')
      throw err
    }
  }

  async function handleRemoveMember(memberId: string, displayName: string) {
    setConfirmModal({
      open: true,
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover ${displayName || 'este membro'} da equipe? O acesso será revogado imediatamente.`,
      onConfirm: async () => {
        setActionLoading(memberId)
        setConfirmModal(prev => ({ ...prev, open: false }))
        try {
          await db.update('members', { status: 'inactive' }, { id: memberId })
          toast('Membro removido da equipe', 'success')
          loadData()
        } catch {
          toast('Erro ao remover membro', 'error')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  async function handleCleanupDuplicates() {
    const emailMap = new Map<string, Invite[]>()
    invites.forEach(inv => {
      const key = inv.email.toLowerCase()
      emailMap.set(key, [...(emailMap.get(key) || []), inv])
    })

    let totalDeleted = 0
    for (const [, group] of emailMap) {
      if (group.length > 1) {
        for (const inv of group.slice(1)) {
          await db.delete('member_clients', { member_id: inv.id })
          await db.delete('invites', { id: inv.id })
          totalDeleted++
        }
      }
    }

    if (totalDeleted > 0) {
      toast(`${totalDeleted} convite(s) duplicado(s) removido(s)!`, 'success')
      loadData()
    } else {
      toast('Nenhum duplicado encontrado', 'info')
    }
  }

  const isAdmin = currentMember?.role === 'admin'
  const isAdminOrGestor = currentMember?.role === 'admin' || currentMember?.role === 'gestor'
  const activeMembers = members.filter(m => m.status === 'active')

  const emailCounts = new Map<string, number>()
  invites.forEach(inv => {
    const key = inv.email.toLowerCase()
    emailCounts.set(key, (emailCounts.get(key) || 0) + 1)
  })
  const hasDuplicates = Array.from(emailCounts.values()).some(count => count > 1)

  const ROLE_COLORS = {
    admin: 'danger', gestor: 'info', designer: 'success', cliente: 'warning'
  } as const

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin', gestor: 'Gestor', designer: 'Designer', cliente: 'Cliente'
  }

  if (loading || roleLoading || !allowed) {
    return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Equipe
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {activeMembers.length} membro{activeMembers.length !== 1 ? 's' : ''} ativo{activeMembers.length !== 1 ? 's' : ''}
            {invites.length > 0 && ` · ${invites.length} convite${invites.length !== 1 ? 's' : ''} pendente${invites.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdminOrGestor && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <Plus className="w-4 h-4" /> Convidar
          </Button>
        )}
      </div>

      {/* Members */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" /> Membros
          </h3>
          <span className="text-xs text-zinc-400">{activeMembers.length} ativo{activeMembers.length !== 1 ? 's' : ''}</span>
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-50">
            {activeMembers.map(m => {
              const isCurrentUser = m.user_id === currentMember?.user_id
              const memberEmail = (m as any).email
              const memberWhatsapp = (m as any).whatsapp

              return (
                <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/50 transition-colors">
                  <Avatar name={m.display_name || '?'} src={m.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 truncate">{m.display_name || 'Sem nome'}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Você</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                      {memberEmail && <span className="truncate">{memberEmail}</span>}
                      {memberWhatsapp && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {memberWhatsapp}
                        </span>
                      )}
                      {(m as any).notificar_whatsapp && (
                        <span title="Notificações WhatsApp ativas"><MessageCircle className="w-3 h-3 text-green-500" /></span>
                      )}
                      {(m as any).notificar_email && (
                        <span title="Notificações Email ativas"><Bell className="w-3 h-3 text-blue-500" /></span>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  {isAdmin && !isCurrentUser ? (
                    <Select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      className="w-32 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="gestor">Gestor</option>
                      <option value="designer">Designer</option>
                      <option value="cliente">Cliente</option>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_COLORS[m.role as keyof typeof ROLE_COLORS] || 'default'}>
                      {ROLE_LABELS[m.role] || m.role}
                    </Badge>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Editar */}
                    {isAdminOrGestor && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => openEditMember(m)}
                        className="text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                        title="Editar membro"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Reset senha */}
                    {isAdmin && !isCurrentUser && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleSendReset(m)}
                        disabled={actionLoading === m.id}
                        className="text-zinc-400 hover:text-orange-500 hover:bg-orange-50"
                        title="Enviar link de recuperação de senha"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Permissões */}
                    {isAdmin && !isCurrentUser && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setPermissionsModal({ open: true, member: m })}
                        className="text-zinc-400 hover:text-purple-500 hover:bg-purple-50"
                        title="Configurar permissões"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Remover */}
                    {isAdmin && !isCurrentUser && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleRemoveMember(m.id, m.display_name || '')}
                        disabled={actionLoading === m.id}
                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                        title="Remover membro"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {activeMembers.length === 0 && (
              <div className="px-6 py-12 text-center text-zinc-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum membro ativo</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Convites Pendentes
            </h3>
            <div className="flex items-center gap-2">
              {hasDuplicates && isAdminOrGestor && (
                <Button size="sm" variant="ghost" onClick={handleCleanupDuplicates}
                  className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                  Limpar duplicados
                </Button>
              )}
              <span className="text-xs text-zinc-400">{invites.length} pendente{invites.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-50">
              {invites.map(inv => {
                const isDuplicate = (emailCounts.get(inv.email.toLowerCase()) || 0) > 1
                const isExpired = new Date(inv.expires_at) < new Date()
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                      isExpired ? 'bg-red-50/30' : isDuplicate ? 'bg-amber-50/30' : 'hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpired ? 'bg-red-100' : 'bg-zinc-100'}`}>
                      <Mail className={`w-5 h-5 ${isExpired ? 'text-red-400' : 'text-zinc-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-900 truncate">{inv.email}</span>
                        {isDuplicate && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Duplicado</span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Expirado</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {isExpired
                          ? `Expirou em ${new Date(inv.expires_at).toLocaleDateString('pt-BR')}`
                          : `Expira em ${new Date(inv.expires_at).toLocaleDateString('pt-BR')}`
                        }
                        {inv.created_at && ` · Enviado em ${new Date(inv.created_at).toLocaleDateString('pt-BR')}`}
                      </div>
                    </div>

                    <Badge variant={ROLE_COLORS[inv.role as keyof typeof ROLE_COLORS] || 'default'}>
                      {ROLE_LABELS[inv.role] || inv.role}
                    </Badge>

                    {isAdminOrGestor && (
                      <div className="flex items-center gap-1">
                        {/* Copiar link */}
                        <Button size="sm" variant="ghost"
                          onClick={() => handleCopyInviteLink(inv.token)}
                          className="text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                          title="Copiar link do convite">
                          <Copy className="w-4 h-4" />
                        </Button>

                        {/* Reenviar ou Renovar (se expirado) */}
                        {isExpired ? (
                          <Button size="sm" variant="ghost"
                            onClick={() => handleRenewInvite(inv)}
                            disabled={actionLoading === inv.id}
                            className="text-zinc-400 hover:text-green-600 hover:bg-green-50"
                            title="Renovar convite expirado (gera novo link + reenvia email)">
                            <RefreshCw className={`w-4 h-4 ${actionLoading === inv.id ? 'animate-spin' : ''}`} />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost"
                            onClick={() => handleResendInvite(inv)}
                            disabled={actionLoading === inv.id}
                            className="text-zinc-400 hover:text-green-500 hover:bg-green-50"
                            title="Reenviar email do convite">
                            <RefreshCw className={`w-4 h-4 ${actionLoading === inv.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}

                        {/* Apagar */}
                        <Button size="sm" variant="ghost"
                          onClick={() => handleDeleteInvite(inv.id, inv.email)}
                          disabled={actionLoading === inv.id}
                          className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                          title="Apagar convite">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modal: Convidar ── */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Convidar Membro" size="sm">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com" required />
          </div>
          <div>
            <Label>Função</Label>
            <Select value={inviteRole} onChange={e => { setInviteRole(e.target.value); setSelectedClienteIds([]) }}>
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="designer">Designer</option>
              <option value="cliente">Cliente</option>
            </Select>
            <p className="text-xs text-zinc-400 mt-1">
              {inviteRole === 'admin' && 'Acesso total: gerenciar equipe, clientes e configurações'}
              {inviteRole === 'gestor' && 'Gerenciar conteúdos, clientes e equipe'}
              {inviteRole === 'designer' && 'Criar e editar conteúdos dos clientes atribuídos'}
              {inviteRole === 'cliente' && 'Visualizar e aprovar conteúdos do(s) seu(s) perfil(is)'}
            </p>
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
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: c.cores?.primaria || '#6366F1' }}>
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
            <Button type="submit" variant="primary">Enviar Convite</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Link do Convite ── */}
      <Modal
        open={inviteLinkModal.open}
        onClose={() => setInviteLinkModal(prev => ({ ...prev, open: false }))}
        title="Link de Acesso"
        size="sm"
      >
        <div className="space-y-4">
          {inviteLinkModal.emailSent ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700">
                Email enviado para <strong>{inviteLinkModal.email}</strong>!
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <Mail className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                Email não enviado. Copie e envie o link abaixo manualmente.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-500 mb-2">Link de acesso para <strong>{inviteLinkModal.email}</strong>:</p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 break-all font-mono">
                {inviteLinkModal.link}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" className="flex-1" onClick={() => handleCopyLink(inviteLinkModal.link)}>
                <Copy className="w-4 h-4" /> Copiar Link
              </Button>
              <Button variant="ghost" onClick={() => window.open(inviteLinkModal.link, '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Editar Membro ── */}
      <Modal
        open={editMemberModal.open}
        onClose={() => setEditMemberModal({ open: false, member: null })}
        title="Editar Membro"
        size="sm"
      >
        <form onSubmit={handleSaveEditMember} className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={editForm.display_name}
              onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
              placeholder="Nome do membro"
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-zinc-100 text-zinc-500 text-sm rounded-lg border border-zinc-200">
                {editForm.pais}
              </span>
              <Input
                value={editForm.whatsapp}
                onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })}
                placeholder="31999999999"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">Usado para notificações de aprovação</p>
          </div>
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium text-zinc-700">Notificações</Label>
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">WhatsApp</span>
              </div>
              <button type="button"
                onClick={() => setEditForm({ ...editForm, notificar_whatsapp: !editForm.notificar_whatsapp })}
                className={`relative w-12 h-6 rounded-full transition-all ${editForm.notificar_whatsapp ? 'bg-green-500' : 'bg-zinc-300'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.notificar_whatsapp ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm">E-mail</span>
              </div>
              <button type="button"
                onClick={() => setEditForm({ ...editForm, notificar_email: !editForm.notificar_email })}
                className={`relative w-12 h-6 rounded-full transition-all ${editForm.notificar_email ? 'bg-blue-500' : 'bg-zinc-300'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.notificar_email ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setEditMemberModal({ open: false, member: null })}>Cancelar</Button>
            <Button type="submit" variant="primary">Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Reset Senha ── */}
      <Modal
        open={resetModal.open}
        onClose={() => setResetModal({ open: false, member: null, link: undefined, sent: false })}
        title="Recuperar Senha"
        size="sm"
      >
        <div className="space-y-4">
          {actionLoading === resetModal.member?.id ? (
            <div className="flex items-center gap-3 p-4 text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Gerando link de recuperação...</span>
            </div>
          ) : resetModal.sent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-700">
                  Email de recuperação enviado para <strong>{(resetModal.member as any)?.email}</strong>!
                </p>
              </div>
              <p className="text-xs text-zinc-500">O membro receberá um link para criar uma nova senha. O link expira em 1 hora.</p>
            </div>
          ) : resetModal.link ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <Mail className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">Email não configurado. Copie o link e envie manualmente.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 break-all font-mono">
                {resetModal.link}
              </div>
              <Button variant="primary" className="w-full" onClick={() => handleCopyLink(resetModal.link!)}>
                <Copy className="w-4 h-4" /> Copiar Link de Recuperação
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* ── Modal: Confirmação ── */}
      <Modal open={confirmModal.open} onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        title={confirmModal.title} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={confirmModal.onConfirm}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Permissões ── */}
      {permissionsModal.member && (
        <PermissionsModal
          open={permissionsModal.open}
          onClose={() => setPermissionsModal({ open: false, member: null })}
          member={permissionsModal.member}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  )
}
