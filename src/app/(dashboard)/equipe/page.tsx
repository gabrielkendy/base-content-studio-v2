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
import { Plus, Mail, UserX, Trash2, Copy, RefreshCw, Shield, Users, Clock, Settings2, Phone, MessageCircle, Bell, Pencil } from 'lucide-react'
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
  
  // Novo: Modal de edição de membro
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

  // Novo: Abrir modal de edição
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

  // Novo: Salvar edição do membro
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
    
    if (error) {
      toast('Erro ao salvar', 'error')
      return
    }

    toast('✅ Membro atualizado!', 'success')
    setEditMemberModal({ open: false, member: null })
    loadData()
  }

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
    }, { select: '*', single: true })

    if (error) { toast('Erro ao enviar convite', 'error'); return }

    if (inviteRole === 'cliente' && selectedClienteIds.length > 0 && invite) {
      for (const clienteId of selectedClienteIds) {
        await db.insert('member_clients', {
          member_id: invite.id,
          cliente_id: clienteId,
          org_id: org!.id,
        })
      }
    }

    const link = `${window.location.origin}/auth/invite?token=${token}`
    
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

  async function handleDeleteInvite(inviteId: string, email: string) {
    setConfirmModal({
      open: true,
      title: 'Apagar Convite',
      message: `Tem certeza que deseja apagar o convite para ${email}? Esta ação não pode ser desfeita.`,
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
      
      if (emailData.status === 'sent' || emailData.status === 'magic_link_sent') {
        toast(`✅ Convite reenviado para ${invite.email}!`, 'success')
      } else {
        const link = `${window.location.origin}/auth/invite?token=${invite.token}`
        await navigator.clipboard.writeText(link)
        toast('⚠️ Email não enviado. Link copiado!', 'info')
      }
    } catch {
      toast('Erro ao reenviar convite', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCopyInviteLink(token: string) {
    const link = `${window.location.origin}/auth/invite?token=${token}`
    await navigator.clipboard.writeText(link)
    toast('🔗 Link copiado!', 'success')
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    await db.update('members', { role: newRole }, { id: memberId })
    toast('Role atualizado!', 'success')
    loadData()
  }

  async function handleSavePermissions(memberId: string, permissions: MemberPermissions) {
    try {
      await db.update('members', { custom_permissions: permissions }, { id: memberId })
      toast('✅ Permissões atualizadas!', 'success')
      loadData()
    } catch (err) {
      toast('Erro ao salvar permissões', 'error')
      throw err
    }
  }

  function openPermissionsModal(member: Member) {
    setPermissionsModal({ open: true, member })
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
        const toDelete = group.slice(1)
        for (const inv of toDelete) {
          await db.delete('member_clients', { member_id: inv.id })
          await db.delete('invites', { id: inv.id })
          totalDeleted++
        }
      }
    }

    if (totalDeleted > 0) {
      toast(`🧹 ${totalDeleted} convite(s) duplicado(s) removido(s)!`, 'success')
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
              const memberWhatsapp = (m as any).whatsapp
              const memberNotifyEmail = (m as any).notificar_email
              const memberNotifyWhatsapp = (m as any).notificar_whatsapp
              
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
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="truncate">
                        {(m as any).email || m.user_id?.slice(0, 8)}
                      </span>
                      {/* Mostrar WhatsApp se existir */}
                      {memberWhatsapp && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {memberWhatsapp}
                        </span>
                      )}
                      {/* Indicadores de notificação */}
                      {memberNotifyWhatsapp && (
                        <span title="Notificações WhatsApp ativas">
                          <MessageCircle className="w-3 h-3 text-green-500" />
                        </span>
                      )}
                      {memberNotifyEmail && (
                        <span title="Notificações Email ativas">
                          <Bell className="w-3 h-3 text-blue-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role selector or badge */}
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

                  {/* Edit button - NOVO */}
                  {isAdminOrGestor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditMember(m)}
                      className="text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                      title="Editar membro"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Permissions button */}
                  {isAdmin && !isCurrentUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openPermissionsModal(m)}
                      className="text-zinc-400 hover:text-purple-500 hover:bg-purple-50"
                      title="Configurar permissões"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  )}

                  {/* Remove button */}
                  {isAdmin && !isCurrentUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(m.id, m.display_name || '')}
                      disabled={actionLoading === m.id}
                      className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                      title="Remover membro"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCleanupDuplicates}
                  className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  🧹 Limpar duplicados
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isExpired ? 'bg-red-100' : 'bg-zinc-100'
                    }`}>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyInviteLink(inv.token)}
                          className="text-zinc-400 hover:text-blue-500 hover:bg-blue-50"
                          title="Copiar link do convite"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResendInvite(inv)}
                          disabled={actionLoading === inv.id}
                          className="text-zinc-400 hover:text-green-500 hover:bg-green-50"
                          title="Reenviar convite"
                        >
                          <RefreshCw className={`w-4 h-4 ${actionLoading === inv.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteInvite(inv.id, inv.email)}
                          disabled={actionLoading === inv.id}
                          className="text-zinc-400 hover:text-red-500 hover:bg-red-50"
                          title="Apagar convite"
                        >
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

      {/* NOVO: Edit member modal */}
      <Modal 
        open={editMemberModal.open} 
        onClose={() => setEditMemberModal({ open: false, member: null })} 
        title="✏️ Editar Membro" 
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

          {/* Notificações */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium text-zinc-700">🔔 Notificações</Label>
            
            {/* WhatsApp */}
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">WhatsApp</span>
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, notificar_whatsapp: !editForm.notificar_whatsapp })}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  editForm.notificar_whatsapp ? 'bg-green-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  editForm.notificar_whatsapp ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm">E-mail</span>
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, notificar_email: !editForm.notificar_email })}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  editForm.notificar_email ? 'bg-blue-500' : 'bg-zinc-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  editForm.notificar_email ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setEditMemberModal({ open: false, member: null })}>Cancelar</Button>
            <Button type="submit" variant="primary">💾 Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation modal */}
      <Modal open={confirmModal.open} onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))} title={confirmModal.title} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}>Cancelar</Button>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={confirmModal.onConfirm}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions modal */}
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
