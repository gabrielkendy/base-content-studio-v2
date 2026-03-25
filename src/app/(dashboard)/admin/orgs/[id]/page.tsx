'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  Shield,
  ArrowLeft,
  Building2,
  Users,
  FileText,
  CreditCard,
  ExternalLink,
  Loader2,
  AlertTriangle,
  UserCheck,
  UserX,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'

interface OrgDetail {
  id: string
  name: string
  slug: string
  plan: string | null
  created_at: string
}

interface Member {
  id: string
  user_id: string
  display_name: string
  email: string
  role: string
  status: string
}

interface OrgData {
  org: OrgDetail
  members: Member[]
  usage: { clients: number; contents: number }
}

const PLANS = ['starter', 'pro', 'agency'] as const
const PLAN_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  starter: { label: 'Starter', color: 'text-zinc-600', bg: 'bg-zinc-100' },
  pro: { label: 'Pro', color: 'text-purple-600', bg: 'bg-purple-100' },
  agency: { label: 'Agency', color: 'text-amber-600', bg: 'bg-amber-100' },
}

export default function AdminOrgDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [togglingMember, setTogglingMember] = useState<string | null>(null)
  const [planSuccess, setPlanSuccess] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/org/${orgId}`)
      if (res.status === 403) { router.replace('/'); return }
      if (!res.ok) throw new Error('Falha ao carregar organização')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [orgId, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    fetchData()
  }, [authLoading, user, router, fetchData])

  const handleSetPlan = async (plan: string | null) => {
    if (!data) return
    setPlanSaving(true)
    try {
      const res = await fetch(`/api/admin/org/${orgId}/set-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar plano')
      setData(prev => prev ? { ...prev, org: { ...prev.org, plan } } : prev)
      setPlanSuccess(true)
      setTimeout(() => setPlanSuccess(false), 2000)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar plano', 'error')
    } finally {
      setPlanSaving(false)
    }
  }

  const handleToggleMember = async (memberId: string, currentStatus: string) => {
    setTogglingMember(memberId)
    const newActive = currentStatus !== 'active'
    try {
      const res = await fetch(`/api/admin/org/${orgId}/toggle-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, active: newActive }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar membro')
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          members: prev.members.map(m =>
            m.id === memberId ? { ...m, status: newActive ? 'active' : 'inactive' } : m
          ),
        }
      })
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Erro ao atualizar membro', 'error')
    } finally {
      setTogglingMember(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-zinc-500">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p>{error}</p>
        <button onClick={fetchData} className="text-sm text-purple-600 hover:underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null

  const { org, members, usage } = data
  const planInfo = org.plan ? PLAN_LABELS[org.plan] : null

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-purple-500" />
            <h1 className="text-xl font-bold text-zinc-900">{org.name}</h1>
            {planInfo && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planInfo.bg} ${planInfo.color}`}>
                {planInfo.label}
              </span>
            )}
            {!org.plan && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500">
                Free
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
            /{org.slug} · Criado em {new Date(org.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Link
          href="https://dashboard.stripe.com/customers"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-600 hover:border-purple-300 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Ver no Stripe
          <ExternalLink className="w-3 h-3 text-zinc-400" />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Usage Card */}
        <div className="md:col-span-1 space-y-4">
          {/* Usage Stats */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Uso
            </h2>
            <div className="space-y-3">
              <UsageStat icon={Users} label="Membros" value={members.length} />
              <UsageStat icon={Building2} label="Clientes" value={usage.clients} />
              <UsageStat icon={FileText} label="Conteúdos" value={usage.contents} />
            </div>
          </div>

          {/* Plan Management */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              Plano
              {planSuccess && (
                <span className="ml-auto flex items-center gap-1 text-green-600 text-xs">
                  <Check className="w-3 h-3" /> Salvo
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {PLANS.map(plan => {
                const info = PLAN_LABELS[plan]
                const isActive = org.plan === plan
                return (
                  <button
                    key={plan}
                    onClick={() => handleSetPlan(isActive ? null : plan)}
                    disabled={planSaving}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      isActive
                        ? `${info.bg} ${info.color} border-transparent`
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-purple-300'
                    } disabled:opacity-50`}
                  >
                    <span>{info.label}</span>
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                )
              })}
              <button
                onClick={() => handleSetPlan(null)}
                disabled={planSaving || !org.plan}
                className="w-full px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-30"
              >
                Remover plano (Free)
              </button>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              Usuários ({members.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Usuário</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">Role</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-zinc-500">Status</th>
                  <th className="py-3 px-4 text-xs font-medium text-zinc-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {members.map(member => (
                  <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{member.display_name}</div>
                        <div className="text-xs text-zinc-400">{member.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleMember(member.id, member.status)}
                        disabled={togglingMember === member.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ml-auto ${
                          member.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        } disabled:opacity-50`}
                      >
                        {togglingMember === member.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : member.status === 'active' ? (
                          <><UserX className="w-3 h-3" /> Desativar</>
                        ) : (
                          <><UserCheck className="w-3 h-3" /> Ativar</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-zinc-400">
                      Nenhum membro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsageStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Icon className="w-4 h-4 text-zinc-400" />
        {label}
      </div>
      <span className="font-semibold text-zinc-900 text-sm">{value}</span>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'text-purple-600 bg-purple-50' },
    gestor: { label: 'Gestor', color: 'text-blue-600 bg-blue-50' },
    designer: { label: 'Designer', color: 'text-cyan-600 bg-cyan-50' },
    cliente: { label: 'Cliente', color: 'text-green-600 bg-green-50' },
  }
  const info = map[role] || { label: role, color: 'text-zinc-600 bg-zinc-100' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
      {info.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'text-green-600 bg-green-50' : 'text-zinc-400 bg-zinc-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-zinc-400'}`} />
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  )
}
