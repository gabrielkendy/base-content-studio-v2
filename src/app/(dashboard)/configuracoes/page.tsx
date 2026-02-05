'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Save, Upload, Building2, Palette, User, Bell, Camera, Share2 } from 'lucide-react'
import { useRoleGuard } from '@/hooks/use-role-guard'
import type { NotificationPreferences } from '@/types/database'

type TabId = 'org' | 'appearance' | 'profile' | 'notifications' | 'social'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'org', label: 'Organização', icon: Building2 },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'social', label: 'Redes Sociais', icon: Share2 },
]

const DEFAULT_NOTIF: NotificationPreferences = {
  new_requests: true,
  pending_approvals: true,
  chat_messages: true,
  upcoming_deadlines: true,
}

export default function ConfiguracoesPage() {
  const { org, member, user } = useAuth()
  const { allowed, loading: roleLoading } = useRoleGuard(['admin', 'gestor'])
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('org')
  const [saving, setSaving] = useState(false)

  // Org state
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  // Appearance state
  const [brandColor, setBrandColor] = useState('#6366F1')
  const [accentColor, setAccentColor] = useState('#3B82F6')

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF)

  // Social accounts state
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const [loadingSocial, setLoadingSocial] = useState(false)
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string; slug: string }>>([])
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null)
  const [loadingClientes, setLoadingClientes] = useState(false)

  useEffect(() => {
    if (org) {
      setOrgName(org.name)
      setLogoUrl(org.logo_url)
      setLogoPreview(org.logo_url)
      setBrandColor(org.brand_color || '#6366F1')
      setAccentColor(org.accent_color || '#3B82F6')
    }
    if (member) {
      setDisplayName(member.display_name || '')
      setAvatarUrl(member.avatar_url)
      setAvatarPreview(member.avatar_url)
      // Load notification prefs from member
      const prefs = (member as unknown as Record<string, unknown>).notification_prefs as NotificationPreferences | undefined
      if (prefs && typeof prefs === 'object') {
        setNotifPrefs({ ...DEFAULT_NOTIF, ...prefs })
      }
    }
  }, [org, member])

  // Apply colors preview in real-time
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', brandColor)
    document.documentElement.style.setProperty('--accent-color', accentColor)
  }, [brandColor, accentColor])

  const uploadFile = useCallback(async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'media')
    formData.append('folder', folder)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast(json.error || 'Erro no upload', 'error')
        return null
      }
      return json.url
    } catch {
      toast('Erro no upload', 'error')
      return null
    }
  }, [toast])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    // Preview
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
    // Upload
    const url = await uploadFile(file, `logos/${org?.id || 'unknown'}`)
    if (url) {
      setLogoUrl(url)
      setLogoPreview(url)
    }
    setUploadingLogo(false)
    if (logoRef.current) logoRef.current.value = ''
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
    const url = await uploadFile(file, `avatars/${member?.id || 'unknown'}`)
    if (url) {
      setAvatarUrl(url)
      setAvatarPreview(url)
    }
    setUploadingAvatar(false)
    if (avatarRef.current) avatarRef.current.value = ''
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await db.update('organizations', {
      name: orgName,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    }, { id: org!.id })
    if (error) toast('Erro ao salvar', 'error')
    else toast('Organização atualizada!', 'success')
    setSaving(false)
  }

  async function handleSaveAppearance(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await db.update('organizations', {
      brand_color: brandColor,
      accent_color: accentColor,
      updated_at: new Date().toISOString(),
    }, { id: org!.id })
    if (error) toast('Erro ao salvar', 'error')
    else toast('Aparência atualizada!', 'success')
    setSaving(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await db.update('members', {
      display_name: displayName,
      avatar_url: avatarUrl,
    }, { id: member!.id })
    if (error) toast('Erro ao salvar', 'error')
    else toast('Perfil atualizado!', 'success')
    setSaving(false)
  }

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await db.update('members', {
      notification_prefs: notifPrefs,
    }, { id: member!.id })
    if (error) toast('Erro ao salvar', 'error')
    else toast('Notificações atualizadas!', 'success')
    setSaving(false)
  }

  function toggleNotif(key: keyof NotificationPreferences) {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Load clientes when social tab is active
  useEffect(() => {
    if (activeTab === 'social' && clientes.length === 0 && org) {
      setLoadingClientes(true)
      db.select('clientes', { select: 'id,nome,slug', order: { col: 'nome', asc: true } })
        .then(result => {
          const data = result.data || []
          setClientes(data)
          // Auto-select first if only one
          if (data.length === 1) {
            setSelectedCliente(data[0].slug)
          }
        })
        .catch(() => toast('Erro ao carregar clientes', 'error'))
        .finally(() => setLoadingClientes(false))
    }
  }, [activeTab, clientes.length, org, toast])

  // Load Upload-Post connect URL when cliente is selected
  useEffect(() => {
    if (activeTab === 'social' && selectedCliente) {
      setConnectUrl(null)
      setLoadingSocial(true)
      fetch('/api/social/connect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteSlug: selectedCliente })
      })
        .then(res => res.json())
        .then(data => {
          if (data.url) setConnectUrl(data.url)
        })
        .catch(() => toast('Erro ao carregar conexão', 'error'))
        .finally(() => setLoadingSocial(false))
    }
  }, [activeTab, selectedCliente, toast])

  if (roleLoading || !allowed) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-sm text-zinc-500">Gerencie sua organização, aparência e perfil</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Organização */}
      {activeTab === 'org' && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Organização
            </h3>
          </div>
          <CardContent>
            <form onSubmit={handleSaveOrg} className="space-y-6">
              {/* Logo upload */}
              <div>
                <Label>Logo da Organização</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    onClick={() => logoRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden bg-zinc-50"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Upload className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-500">
                    <p>Clique para fazer upload</p>
                    <p className="text-xs text-zinc-400">PNG, JPG ou SVG. Máx 2MB.</p>
                    {uploadingLogo && <p className="text-blue-500 text-xs mt-1">Enviando...</p>}
                  </div>
                </div>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              <div>
                <Label>Nome da Organização</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={org?.slug || ''} disabled className="bg-zinc-50" />
                <p className="text-xs text-zinc-400 mt-1">O slug não pode ser alterado</p>
              </div>
              <div>
                <Label>Plano</Label>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  {(org?.plan || 'free').charAt(0).toUpperCase() + (org?.plan || 'free').slice(1)}
                </div>
              </div>
              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="w-4 h-4" /> Salvar Organização
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Aparência */}
      {activeTab === 'appearance' && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Palette className="w-5 h-5" /> Aparência
            </h3>
          </div>
          <CardContent>
            <form onSubmit={handleSaveAppearance} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Brand Color */}
                <div>
                  <Label>Cor Primária</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
                    />
                    <Input
                      value={brandColor}
                      onChange={e => {
                        const v = e.target.value
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBrandColor(v)
                      }}
                      maxLength={7}
                      className="font-mono uppercase w-28"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <Label>Cor de Destaque</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-zinc-200 cursor-pointer p-0.5"
                    />
                    <Input
                      value={accentColor}
                      onChange={e => {
                        const v = e.target.value
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v)
                      }}
                      maxLength={7}
                      className="font-mono uppercase w-28"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <Label>Preview ao vivo</Label>
                <div className="mt-2 p-6 bg-zinc-50 rounded-xl border border-zinc-100 space-y-4">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all shadow-sm"
                      style={{ backgroundColor: brandColor }}
                    >
                      Botão Primário
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-all shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    >
                      Botão Destaque
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all border-2"
                      style={{ borderColor: brandColor, color: brandColor }}
                    >
                      Outline
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: brandColor }} />
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: accentColor }} />
                    <a href="#" className="text-sm font-medium underline" style={{ color: accentColor }} onClick={e => e.preventDefault()}>
                      Link de exemplo
                    </a>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full transition-all" style={{ backgroundColor: brandColor }} />
                  </div>
                </div>
              </div>

              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="w-4 h-4" /> Salvar Aparência
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Perfil */}
      {activeTab === 'profile' && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <User className="w-5 h-5" /> Perfil
            </h3>
          </div>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar */}
              <div>
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div
                    onClick={() => avatarRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden bg-zinc-50 relative group"
                  >
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </>
                    ) : (
                      <User className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-500">
                    <p>Clique para trocar</p>
                    <p className="text-xs text-zinc-400">Recomendado: 200x200px</p>
                    {uploadingAvatar && <p className="text-blue-500 text-xs mt-1">Enviando...</p>}
                  </div>
                </div>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div>
                <Label>Nome de Exibição</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-zinc-50" />
              </div>
              <div>
                <Label>Função</Label>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-medium capitalize">
                  {member?.role || '—'}
                </div>
              </div>
              <Button type="submit" variant="primary" disabled={saving}>
                <Save className="w-4 h-4" /> Salvar Perfil
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Notificações */}
      {activeTab === 'notifications' && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notificações
            </h3>
          </div>
          <CardContent>
            <form onSubmit={handleSaveNotifications} className="space-y-1">
              {([
                { key: 'new_requests' as const, label: 'Novas solicitações', desc: 'Receber notificação quando uma nova solicitação for criada' },
                { key: 'pending_approvals' as const, label: 'Aprovações pendentes', desc: 'Notificar quando há conteúdos aguardando aprovação' },
                { key: 'chat_messages' as const, label: 'Mensagens no chat', desc: 'Alertar sobre novas mensagens em conversas' },
                { key: 'upcoming_deadlines' as const, label: 'Deadlines próximos', desc: 'Avisar sobre prazos chegando' },
              ]).map(item => (
                <div key={item.key} className="flex items-center justify-between py-4 border-b border-zinc-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{item.label}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleNotif(item.key)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                      notifPrefs[item.key] ? 'bg-blue-600' : 'bg-zinc-200'
                    }`}
                    style={notifPrefs[item.key] ? { backgroundColor: brandColor } : undefined}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        notifPrefs[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
              <div className="pt-4">
                <Button type="submit" variant="primary" disabled={saving}>
                  <Save className="w-4 h-4" /> Salvar Preferências
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Redes Sociais */}
      {activeTab === 'social' && (
        <Card>
          <div className="px-6 py-4 border-b border-zinc-100">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Redes Sociais
            </h3>
            <p className="text-sm text-zinc-500 mt-1">Conecte as redes de cada cliente para agendar publicações</p>
          </div>
          <CardContent>
            {/* Seletor de Cliente */}
            <div className="mb-6">
              <Label>Selecione o Cliente</Label>
              {loadingClientes ? (
                <div className="animate-pulse h-10 bg-zinc-100 rounded-lg mt-1" />
              ) : clientes.length === 0 ? (
                <p className="text-sm text-zinc-500 mt-2">Nenhum cliente cadastrado</p>
              ) : (
                <select
                  value={selectedCliente || ''}
                  onChange={(e) => setSelectedCliente(e.target.value || null)}
                  className="w-full mt-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.slug}>{c.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Área de Conexão */}
            {selectedCliente ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-zinc-900 mb-2">
                  Conectar Redes - {clientes.find(c => c.slug === selectedCliente)?.nome}
                </h4>
                <p className="text-sm text-zinc-500 mb-6 max-w-md">
                  Clique no botão abaixo para conectar Instagram, Facebook, TikTok e outras redes deste cliente.
                </p>
                {loadingSocial ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                ) : connectUrl ? (
                  <Button 
                    variant="primary"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => window.open(connectUrl, '_blank', 'width=600,height=700')}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Abrir Painel de Conexão
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCliente(selectedCliente)}
                  >
                    Tentar novamente
                  </Button>
                )}
                <p className="text-xs text-zinc-400 mt-4">
                  Cada cliente tem suas próprias redes conectadas para agendamento.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                <Share2 className="w-12 h-12 mb-4 opacity-50" />
                <p>Selecione um cliente acima para conectar as redes sociais</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
