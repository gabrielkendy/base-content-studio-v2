'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PeriodoSelector } from './periodo-selector'
import { 
  CAMPANHA_TIPOS, 
  CAMPANHA_STATUS,
  CAMPANHA_PRIORIDADES,
  MESES,
  type CampanhaComStats,
  type CampanhaInput,
  type CampanhaTipo,
  type CampanhaStatus,
  type CampanhaPrioridade
} from '@/types/campanha'
import { Loader2 } from 'lucide-react'

interface CampanhaModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CampanhaInput) => Promise<{ error: string | null }>
  campanha?: CampanhaComStats | null
  clienteId: string
  ano: number
}

export function CampanhaModal({
  open,
  onClose,
  onSave,
  campanha,
  clienteId,
  ano
}: CampanhaModalProps) {
  const isEditing = !!campanha
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [metaPrincipal, setMetaPrincipal] = useState('')
  const [tipo, setTipo] = useState<CampanhaTipo>('campanha')
  const [cor, setCor] = useState('#3B82F6')
  const [prioridade, setPrioridade] = useState<CampanhaPrioridade>(2)
  const [status, setStatus] = useState<CampanhaStatus>('planejada')
  const [mesInicio, setMesInicio] = useState(1)
  const [mesFim, setMesFim] = useState(1)
  const [orcamento, setOrcamento] = useState('')

  // Reset form quando abrir/fechar ou trocar campanha
  useEffect(() => {
    if (open) {
      if (campanha) {
        setNome(campanha.nome)
        setDescricao(campanha.descricao || '')
        setObjetivo(campanha.objetivo || '')
        setMetaPrincipal(campanha.meta_principal || '')
        setTipo(campanha.tipo)
        setCor(campanha.cor)
        setPrioridade(campanha.prioridade as CampanhaPrioridade)
        setStatus(campanha.status)
        setMesInicio(campanha.mes_inicio)
        setMesFim(campanha.mes_fim)
        setOrcamento(campanha.orcamento?.toString() || '')
      } else {
        // Reset para valores padrão
        setNome('')
        setDescricao('')
        setObjetivo('')
        setMetaPrincipal('')
        setTipo('campanha')
        setCor('#3B82F6')
        setPrioridade(2)
        setStatus('planejada')
        setMesInicio(new Date().getMonth() + 1)
        setMesFim(new Date().getMonth() + 1)
        setOrcamento('')
      }
      setError(null)
    }
  }, [open, campanha])

  // Atualizar cor quando mudar tipo
  useEffect(() => {
    if (!isEditing) {
      setCor(CAMPANHA_TIPOS[tipo].cor)
    }
  }, [tipo, isEditing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      const data: CampanhaInput = {
        nome: nome.trim(),
        cliente_id: clienteId,
        ano,
        mes_inicio: mesInicio,
        mes_fim: mesFim,
        descricao: descricao.trim() || null,
        objetivo: objetivo.trim() || null,
        meta_principal: metaPrincipal.trim() || null,
        tipo,
        cor,
        prioridade,
        status,
        orcamento: orcamento ? parseFloat(orcamento) : null,
      }

      const result = await onSave(data)
      
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Campanha' : 'Nova Campanha'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Nome */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700">
            Nome da Campanha *
          </label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Black Friday 2026"
            required
          />
        </div>

        {/* Tipo e Cor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CAMPANHA_TIPOS).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key as CampanhaTipo)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                    tipo === key 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-zinc-200 hover:border-zinc-300'
                  )}
                >
                  <span>{info.icone}</span>
                  <span className="truncate">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Cor
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-zinc-200 cursor-pointer"
              />
              <div className="flex flex-wrap gap-2">
                {['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#8B5CF6', '#EAB308'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all',
                      cor === c ? 'ring-2 ring-offset-2 ring-zinc-400' : ''
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Período */}
        <PeriodoSelector
          mesInicio={mesInicio}
          mesFim={mesFim}
          onChangeMesInicio={setMesInicio}
          onChangeMesFim={(m) => setMesFim(Math.max(mesInicio, m))}
        />

        {/* Prioridade e Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Prioridade
            </label>
            <div className="flex gap-2">
              {([1, 2, 3] as CampanhaPrioridade[]).map((p) => {
                const info = CAMPANHA_PRIORIDADES[p]
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridade(p)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                      prioridade === p 
                        ? 'border-zinc-900 bg-zinc-900 text-white' 
                        : 'border-zinc-200 hover:border-zinc-300'
                    )}
                  >
                    {info.label}
                  </button>
                )
              })}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampanhaStatus)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CAMPANHA_STATUS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.icone} {info.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700">
            Descrição
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva a campanha..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Meta Principal */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700">
            🎯 Meta Principal
          </label>
          <Input
            value={metaPrincipal}
            onChange={(e) => setMetaPrincipal(e.target.value)}
            placeholder="Ex: Aumentar vendas em 30%"
          />
        </div>

        {/* Orçamento */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700">
            Orçamento (R$)
          </label>
          <Input
            type="number"
            value={orcamento}
            onChange={(e) => setOrcamento(e.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar Campanha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// Modal de confirmação de exclusão
interface DeleteCampanhaModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  campanha: CampanhaComStats | null
}

export function DeleteCampanhaModal({
  open,
  onClose,
  onConfirm,
  campanha
}: DeleteCampanhaModalProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!campanha) return null

  return (
    <Modal open={open} onClose={onClose} title="Excluir Campanha" size="sm">
      <div className="space-y-4">
        <p className="text-zinc-600">
          Tem certeza que deseja excluir a campanha <strong>{campanha.nome}</strong>?
        </p>
        <p className="text-sm text-zinc-500">
          Esta ação não pode ser desfeita. Todos os vínculos com conteúdos serão removidos.
        </p>
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Modal de duplicar campanha
interface DuplicateCampanhaModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (novoAno: number) => Promise<void>
  campanha: CampanhaComStats | null
}

export function DuplicateCampanhaModal({
  open,
  onClose,
  onConfirm,
  campanha
}: DuplicateCampanhaModalProps) {
  const [loading, setLoading] = useState(false)
  const [novoAno, setNovoAno] = useState(new Date().getFullYear() + 1)

  useEffect(() => {
    if (campanha) {
      setNovoAno(campanha.ano + 1)
    }
  }, [campanha])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(novoAno)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!campanha) return null

  return (
    <Modal open={open} onClose={onClose} title="Duplicar Campanha" size="sm">
      <div className="space-y-4">
        <p className="text-zinc-600">
          Duplicar <strong>{campanha.nome}</strong> para outro ano:
        </p>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700">
            Ano de destino
          </label>
          <Input
            type="number"
            value={novoAno}
            onChange={(e) => setNovoAno(parseInt(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>

        <p className="text-sm text-zinc-500">
          A campanha será criada com status "Planejada" e progresso 0%.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Duplicar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
