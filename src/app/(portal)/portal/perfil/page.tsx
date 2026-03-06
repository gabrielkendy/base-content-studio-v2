'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePortalCliente } from '../../portal-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { User, Lock, Building2, CheckCircle, Loader2 } from 'lucide-react'

export default function PerfilPage() {
  const { member, org, user, supabase } = useAuth()
  const { clienteNome } = usePortalCliente()
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast('A senha deve ter no mínimo 8 caracteres', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('As senhas não coincidem', 'error')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)

    if (error) {
      toast(`Erro ao atualizar senha: ${error.message}`, 'error')
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setPasswordSaved(true)
    toast('Senha atualizada com sucesso!', 'success')
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 mt-1">Informações da sua conta</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {member?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member?.display_name || '—'}</h2>
              <p className="text-sm text-gray-500">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Nome</div>
                <div className="text-sm font-semibold text-gray-900">{member?.display_name || '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Empresa</div>
                <div className="text-sm font-semibold text-gray-900">{clienteNome || org?.name || '—'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Status</div>
                <div className="text-sm font-semibold text-green-700">Ativo</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Alterar Senha</h3>
              <p className="text-xs text-gray-500">Crie uma senha forte com pelo menos 8 caracteres</p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                minLength={8}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={savingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full"
            >
              {savingPassword ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : passwordSaved ? (
                <><CheckCircle className="w-4 h-4" /> Senha Atualizada!</>
              ) : (
                <><Lock className="w-4 h-4" /> Salvar Nova Senha</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
