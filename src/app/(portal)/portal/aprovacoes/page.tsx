'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, Eye, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Conteudo, Cliente } from '@/types/database'

const STATUS_LABELS: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default' }> = {
  aprovacao_cliente: { label: 'Aguardando aprovação', variant: 'warning' },
  aprovado_agendado: { label: 'Aprovado', variant: 'success' },
  ajustes: { label: 'Ajustes solicitados', variant: 'danger' },
  concluido: { label: 'Concluído', variant: 'success' },
}

const TIPO_EMOJI: Record<string, string> = {
  carrossel: '📑', post: '📝', stories: '📱', reels: '🎬', feed: '🏠', vídeo: '🎥',
}

export default function AprovacoesListPage() {
  const { org } = useAuth()
  const [pendentes, setPendentes] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [historico, setHistorico] = useState<(Conteudo & { empresa?: Cliente })[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendentes' | 'historico'>('pendentes')

  useEffect(() => {
    if (!org) return
    loadData()
  }, [org])

  async function loadData() {
    // Pendentes de aprovação
    const { data: pend } = await db.select('conteudos', {
      select: '*, empresa:clientes(id, nome, slug, cores)',
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'eq', col: 'status', val: 'aprovacao_cliente' },
      ],
      order: [{ col: 'updated_at', asc: false }],
    })
    setPendentes((pend as any) || [])

    // Histórico (aprovados + ajustes)
    const { data: hist } = await db.select('conteudos', {
      select: '*, empresa:clientes(id, nome, slug, cores)',
      filters: [
        { op: 'eq', col: 'org_id', val: org!.id },
        { op: 'in', col: 'status', val: ['aprovado_agendado', 'ajustes', 'concluido'] },
      ],
      order: [{ col: 'updated_at', asc: false }],
      limit: 20,
    })
    setHistorico((hist as any) || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const items = tab === 'pendentes' ? pendentes : historico

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprovações</h1>
        <p className="text-gray-500 mt-1">Revise e aprove conteúdos da sua equipe</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setTab('pendentes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
            tab === 'pendentes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⏳ Pendentes
          {pendentes.length > 0 && (
            <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
            tab === 'historico'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Histórico
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-5xl mb-4">{tab === 'pendentes' ? '🎉' : '📭'}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {tab === 'pendentes' ? 'Tudo aprovado!' : 'Nenhum histórico ainda'}
            </h3>
            <p className="text-gray-500">
              {tab === 'pendentes'
                ? 'Não há conteúdos aguardando sua aprovação no momento.'
                : 'Aprovações anteriores aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(c => {
            const st = STATUS_LABELS[c.status]
            const mediaCount = Array.isArray(c.midia_urls) ? c.midia_urls.length : 0
            return (
              <Link key={c.id} href={`/portal/aprovacoes/${c.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {/* Client avatar */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ backgroundColor: c.empresa?.cores?.primaria || '#6366F1' }}
                      >
                        {c.empresa?.nome?.charAt(0) || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {c.titulo || 'Sem título'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{c.empresa?.nome}</span>
                          <span>{TIPO_EMOJI[c.tipo] || '📄'} {c.tipo}</span>
                          {c.data_publicacao && (
                            <span>📅 {new Date(c.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          )}
                          {mediaCount > 0 && <span>📎 {mediaCount} arquivo(s)</span>}
                        </div>
                      </div>

                      <Badge variant={st?.variant || 'default'}>
                        {st?.label || c.status}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
