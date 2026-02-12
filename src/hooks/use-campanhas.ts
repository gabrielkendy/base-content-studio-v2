'use client'

import { useState, useCallback } from 'react'
import type { 
  Campanha, 
  CampanhaComStats, 
  CampanhaInput, 
  CampanhaUpdateInput,
  PlanejamentoAnualStats,
  CampanhaHistorico,
  CampanhaStatus
} from '@/types/campanha'

// =====================================================
// HOOK: useCampanhas
// Gerencia campanhas de um cliente
// =====================================================

interface UseCampanhasOptions {
  clienteId: string
  ano?: number
}

export function useCampanhas({ clienteId, ano }: UseCampanhasOptions) {
  const [campanhas, setCampanhas] = useState<CampanhaComStats[]>([])
  const [stats, setStats] = useState<PlanejamentoAnualStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar campanhas
  const fetchCampanhas = useCallback(async (filters?: { status?: string; tipo?: string }) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ cliente_id: clienteId })
      if (ano) params.append('ano', ano.toString())
      if (filters?.status) params.append('status', filters.status)
      if (filters?.tipo) params.append('tipo', filters.tipo)

      const res = await fetch(`/api/campanhas?${params}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setCampanhas(json.data || [])
      return json.data
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [clienteId, ano])

  // Buscar stats
  const fetchStats = useCallback(async () => {
    if (!ano) return null

    try {
      const params = new URLSearchParams({ 
        cliente_id: clienteId, 
        ano: ano.toString() 
      })

      const res = await fetch(`/api/campanhas/stats?${params}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setStats(json.data)
      return json.data
    } catch (err: any) {
      console.error('Erro ao buscar stats:', err)
      return null
    }
  }, [clienteId, ano])

  // Criar campanha
  const createCampanha = useCallback(async (input: CampanhaInput) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      // Atualizar lista local
      await fetchCampanhas()
      await fetchStats()

      return { data: json.data, error: null }
    } catch (err: any) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [fetchCampanhas, fetchStats])

  // Atualizar campanha
  const updateCampanha = useCallback(async (id: string, input: CampanhaUpdateInput) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      // Atualizar lista local
      setCampanhas(prev => 
        prev.map(c => c.id === id ? { ...c, ...json.data } : c)
      )

      return { data: json.data, error: null }
    } catch (err: any) {
      setError(err.message)
      return { data: null, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // Atualizar status
  const updateStatus = useCallback(async (id: string, status: CampanhaStatus, progresso?: number) => {
    try {
      const res = await fetch(`/api/campanhas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, progresso }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      // Atualizar lista local
      setCampanhas(prev => 
        prev.map(c => c.id === id ? { ...c, status, progresso: progresso ?? c.progresso } : c)
      )
      await fetchStats()

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchStats])

  // Deletar campanha
  const deleteCampanha = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      // Remover da lista local
      setCampanhas(prev => prev.filter(c => c.id !== id))
      await fetchStats()

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [fetchStats])

  // Duplicar campanha
  const duplicateCampanha = useCallback(async (id: string, novoAno: number) => {
    try {
      const res = await fetch(`/api/campanhas/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_ano: novoAno }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      // Se duplicou pro mesmo ano, atualizar lista
      if (novoAno === ano) {
        await fetchCampanhas()
      }

      return { data: json.data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }, [ano, fetchCampanhas])

  return {
    // State
    campanhas,
    stats,
    loading,
    error,
    // Actions
    fetchCampanhas,
    fetchStats,
    createCampanha,
    updateCampanha,
    updateStatus,
    deleteCampanha,
    duplicateCampanha,
    // Helpers
    refresh: async () => {
      await Promise.all([fetchCampanhas(), fetchStats()])
    },
  }
}

// =====================================================
// HOOK: useCampanha
// Gerencia uma campanha específica
// =====================================================

export function useCampanha(campanhaId: string | null) {
  const [campanha, setCampanha] = useState<CampanhaComStats | null>(null)
  const [historico, setHistorico] = useState<CampanhaHistorico[]>([])
  const [conteudos, setConteudos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Buscar campanha
  const fetchCampanha = useCallback(async () => {
    if (!campanhaId) return null

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/campanhas/${campanhaId}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setCampanha(json.data)
      return json.data
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [campanhaId])

  // Buscar histórico
  const fetchHistorico = useCallback(async (limit = 50) => {
    if (!campanhaId) return []

    try {
      const res = await fetch(`/api/campanhas/${campanhaId}/historico?limit=${limit}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setHistorico(json.data || [])
      return json.data
    } catch (err: any) {
      console.error('Erro ao buscar histórico:', err)
      return []
    }
  }, [campanhaId])

  // Buscar conteúdos vinculados
  const fetchConteudos = useCallback(async () => {
    if (!campanhaId) return []

    try {
      const res = await fetch(`/api/campanhas/${campanhaId}/conteudos`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setConteudos(json.data || [])
      return json.data
    } catch (err: any) {
      console.error('Erro ao buscar conteúdos:', err)
      return []
    }
  }, [campanhaId])

  // Vincular conteúdos
  const vincularConteudos = useCallback(async (conteudoIds: string[]) => {
    if (!campanhaId) return { success: false, error: 'ID da campanha não definido' }

    try {
      const res = await fetch(`/api/campanhas/${campanhaId}/conteudos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo_ids: conteudoIds }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      await fetchConteudos()
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [campanhaId, fetchConteudos])

  // Adicionar conteúdo
  const adicionarConteudo = useCallback(async (conteudoId: string) => {
    if (!campanhaId) return { success: false, error: 'ID da campanha não definido' }

    try {
      const res = await fetch(`/api/campanhas/${campanhaId}/conteudos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo_id: conteudoId }),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      await fetchConteudos()
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }, [campanhaId, fetchConteudos])

  return {
    // State
    campanha,
    historico,
    conteudos,
    loading,
    error,
    // Actions
    fetchCampanha,
    fetchHistorico,
    fetchConteudos,
    vincularConteudos,
    adicionarConteudo,
    // Helpers
    refresh: async () => {
      await Promise.all([fetchCampanha(), fetchConteudos()])
    },
  }
}
