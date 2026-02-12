'use client'

import { useState, useEffect, useCallback } from 'react'

interface CampanhaNotificacao {
  id: string
  campanha_id: string
  org_id: string
  tipo: string
  titulo: string
  mensagem: string
  enviar_em: string
  enviada: boolean
  enviada_em: string | null
  prioridade: number
  campanha?: {
    id: string
    nome: string
    tipo: string
    cor: string
    cliente_id: string
  }
}

interface UseCampanhaNotificacoesOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useCampanhaNotificacoes(options: UseCampanhaNotificacoesOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options
  
  const [notificacoes, setNotificacoes] = useState<CampanhaNotificacao[]>([])
  const [pendentes, setPendentes] = useState<CampanhaNotificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar notificações pendentes
  const fetchPendentes = useCallback(async () => {
    try {
      const res = await fetch('/api/campanhas/notificacoes?pendentes=true')
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      setPendentes(data.data || [])
      return data.data
    } catch (err: any) {
      setError(err.message)
      return []
    }
  }, [])

  // Buscar todas as notificações
  const fetchNotificacoes = useCallback(async (campanhaId?: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (campanhaId) params.append('campanha_id', campanhaId)
      
      const res = await fetch(`/api/campanhas/notificacoes?${params}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      setNotificacoes(data.data || [])
      return data.data
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Marcar notificações como enviadas
  const marcarEnviadas = useCallback(async (ids: string[]) => {
    try {
      const res = await fetch('/api/campanhas/notificacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'marcar_enviadas',
          notificacao_ids: ids 
        }),
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      // Atualizar listas locais
      setPendentes(prev => prev.filter(n => !ids.includes(n.id)))
      setNotificacoes(prev => 
        prev.map(n => 
          ids.includes(n.id) 
            ? { ...n, enviada: true, enviada_em: new Date().toISOString() }
            : n
        )
      )
      
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [])

  // Carregar inicial
  useEffect(() => {
    fetchPendentes()
    setLoading(false)
  }, [fetchPendentes])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPendentes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchPendentes])

  return {
    // State
    notificacoes,
    pendentes,
    loading,
    error,
    temPendentes: pendentes.length > 0,
    countPendentes: pendentes.length,
    
    // Actions
    fetchNotificacoes,
    fetchPendentes,
    marcarEnviadas,
    
    // Helpers
    refresh: fetchPendentes,
  }
}

// Hook para integrar com sistema de notificações existente
export function useCampanhaNotificacoesIntegration() {
  const { pendentes, marcarEnviadas, fetchPendentes } = useCampanhaNotificacoes({
    autoRefresh: true,
    refreshInterval: 30000 // 30 segundos
  })

  // Processar notificações pendentes
  const processarPendentes = useCallback(async () => {
    if (pendentes.length === 0) return

    // Aqui você pode integrar com o sistema de notificações existente
    // Por exemplo, criar notificações na tabela `notifications`
    
    for (const notif of pendentes) {
      // TODO: Integrar com sistema de notificações existente
      // await criarNotificacaoNoSistema(notif)
      console.log('Notificação de campanha:', notif.titulo)
    }

    // Marcar todas como enviadas
    await marcarEnviadas(pendentes.map(n => n.id))
  }, [pendentes, marcarEnviadas])

  return {
    pendentes,
    processarPendentes,
    refresh: fetchPendentes,
  }
}
