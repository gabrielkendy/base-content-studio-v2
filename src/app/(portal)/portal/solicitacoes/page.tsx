'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Solicitacao } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  nova: { label: 'Nova', color: 'info', icon: Clock },
  aceita: { label: 'Aceita', color: 'success', icon: CheckCircle },
  em_producao: { label: 'Em Produção', color: 'info', icon: FileText },
  concluida: { label: 'Concluída', color: 'success', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'danger', icon: AlertCircle },
}

const PRIORIDADE_EMOJI: Record<string, string> = {
  baixa: '🟢',
  normal: '🔵',
  alta: '🟡',
  urgente: '🔴',
}

export default function MinhasSolicitacoesPage() {
  const { org } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState<(Solicitacao & { cliente?: any })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    const { data } = await db.select('solicitacoes', {
      select: '*, cliente:clientes(id, nome, slug)',
      filters: [{ op: 'eq', col: 'org_id', val: org!.id }],
      order: [{ col: 'created_at', asc: false }],
    })
    setSolicitacoes((data as any) || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Solicitações</h1>
          <p className="text-sm text-gray-500">{solicitacoes.length} solicitação(ões)</p>
        </div>
        <Link href="/portal/solicitar">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> Nova Solicitação
          </Button>
        </Link>
      </div>

      {solicitacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma solicitação</h3>
            <p className="text-sm text-gray-500 mb-6">Faça sua primeira solicitação de conteúdo</p>
            <Link href="/portal/solicitar">
              <Button variant="primary">
                <Plus className="w-4 h-4" /> Solicitar Conteúdo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map(sol => {
            const cfg = STATUS_CONFIG[sol.status] || STATUS_CONFIG.nova
            const Icon = cfg.icon
            return (
              <Card key={sol.id} className="hover:shadow-md transition-all duration-200">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{sol.titulo}</h3>
                          {sol.descricao && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sol.descricao}</p>
                          )}
                        </div>
                        <Badge variant={cfg.color as any}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>{PRIORIDADE_EMOJI[sol.prioridade] || '🔵'} {sol.prioridade}</span>
                        {sol.cliente?.nome && <span>📁 {sol.cliente.nome}</span>}
                        <span>📅 {new Date(sol.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {sol.prazo_desejado && (
                          <span>⏰ Prazo: {new Date(sol.prazo_desejado + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
