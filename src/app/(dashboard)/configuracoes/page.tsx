'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Save, Moon, Sun } from 'lucide-react'

export default function ConfiguracoesPage() {
  const { org, member, user, supabase } = useAuth()
  const { toast } = useToast()
  const [orgName, setOrgName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (org) setOrgName(org.name)
    if (member) setDisplayName(member.display_name || '')
  }, [org, member])

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('organizations').update({ name: orgName, updated_at: new Date().toISOString() }).eq('id', org!.id)
    if (error) toast('Erro ao salvar', 'error')
    else toast('Organização atualizada!', 'success')
    setSaving(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('members').update({ display_name: displayName }).eq('id', member!.id)
    if (error) toast('Erro ao salvar', 'error')
    else toast('Perfil atualizado!', 'success')
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Configurações</h1>
        <p className="text-sm text-zinc-500">Gerencie sua organização e perfil</p>
      </div>

      {/* Org settings */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">🏢 Organização</h3>
        </div>
        <CardContent>
          <form onSubmit={handleSaveOrg} className="space-y-4">
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
              <Input value={org?.plan || 'free'} disabled className="bg-zinc-50" />
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">👤 Perfil</h3>
        </div>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-zinc-50" />
            </div>
            <div>
              <Label>Função</Label>
              <Input value={member?.role || ''} disabled className="bg-zinc-50" />
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">🎨 Aparência</h3>
        </div>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-900">Modo Escuro</div>
              <div className="text-xs text-zinc-400">Em breve!</div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
              disabled
            >
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
