'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare
} from 'lucide-react'
import type { Conteudo, Member } from '@/types/database'

interface InternalApprovalActionsProps {
  conteudo: Conteudo
  currentUser: { id: string; display_name: string; role: string }
  orgId: string
  onSuccess?: () => void
  className?: string
}

export function InternalApprovalActions({
  conteudo,
  currentUser,
  orgId,
  onSuccess,
  className = '',
}: InternalApprovalActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectComment, setRejectComment] = useState('')

  const isGestor = ['admin', 'gestor'].includes(currentUser.role)
  const isDesigner = ['designer', 'admin', 'gestor'].includes(currentUser.role)

  // Determinar estado atual
  const canSubmitForReview = 
    conteudo.status === 'producao' && 
    !conteudo.internal_approved &&
    isDesigner

  const canReview = 
    conteudo.status === 'producao' && 
    isGestor

  const isApproved = conteudo.internal_approved

  async function handleAction(action: 'submit' | 'approve' | 'reject') {
    if (action === 'reject' && !rejectComment.trim()) {
      toast('Digite um comentário para o ajuste', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/approvals/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudo_id: conteudo.id,
          org_id: orgId,
          action,
          reviewer_id: action !== 'submit' ? currentUser.id : null,
          reviewer_name: action !== 'submit' ? currentUser.display_name : null,
          comment: action === 'reject' ? rejectComment : null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao processar aprovação')
      }

      const messages = {
        submit: '📤 Enviado para aprovação interna!',
        approve: '✅ Aprovado internamente! Pronto para enviar ao cliente.',
        reject: '🔄 Ajuste solicitado. Conteúdo voltou para produção.',
      }

      toast(messages[action], 'success')
      setShowRejectForm(false)
      setRejectComment('')
      onSuccess?.()
    } catch (err: any) {
      toast(err.message || 'Erro ao processar', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Se já foi aprovado internamente
  if (isApproved) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 ${className}`}>
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">Aprovado Internamente</p>
          {conteudo.internal_approved_at && (
            <p className="text-xs text-green-600">
              {new Date(conteudo.internal_approved_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Designer pode enviar para aprovação
  if (canSubmitForReview && !canReview) {
    return (
      <div className={className}>
        <Button
          onClick={() => handleAction('submit')}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Enviar para Aprovação Interna
        </Button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          O gestor irá revisar antes de enviar ao cliente
        </p>
      </div>
    )
  }

  // Gestor pode aprovar ou pedir ajuste
  if (canReview) {
    return (
      <div className={`space-y-3 ${className}`}>
        {!showRejectForm ? (
          <>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction('approve')}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Aprovar
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                variant="outline"
                className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Pedir Ajuste
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Revisão interna antes de enviar ao cliente
            </p>
          </>
        ) : (
          <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium text-sm">Descreva o ajuste necessário:</span>
            </div>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Ex: Corrigir a cor do texto, ajustar o tamanho da imagem..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction('reject')}
                disabled={loading || !rejectComment.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Ajuste
              </Button>
              <Button
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectComment('')
                }}
                variant="outline"
                className="border-gray-300"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Sem ações disponíveis para este estado/usuário
  return null
}

export default InternalApprovalActions
