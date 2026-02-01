'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea, Label } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TIPO_EMOJI, formatDateFull } from '@/lib/utils'
import type { Conteudo, Cliente } from '@/types/database'
import { Suspense } from 'react'

function AprovacaoContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [conteudo, setConteudo] = useState<Conteudo | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [status, setStatus] = useState<string>('pendente')
  const [comentario, setComentario] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) return
    async function load() {
      const { data: aprovacao } = await supabase
        .from('aprovacoes_links')
        .select('*, conteudo:conteudos(*), empresa:clientes(*)')
        .eq('token', token)
        .single()

      if (!aprovacao) { setExpired(true); setLoading(false); return }
      if (aprovacao.status !== 'pendente') { setSubmitted(true); setStatus(aprovacao.status); setLoading(false); return }
      if (new Date(aprovacao.expires_at) < new Date()) { setExpired(true); setLoading(false); return }

      setConteudo((aprovacao as any).conteudo)
      setCliente((aprovacao as any).empresa)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSubmit(aprovado: boolean) {
    const newStatus = aprovado ? 'aprovado' : 'ajuste'
    await supabase.from('aprovacoes_links').update({
      status: newStatus,
      comentario_cliente: comentario || null,
      cliente_nome: nomeCliente || null,
      aprovado_em: aprovado ? new Date().toISOString() : null,
    }).eq('token', token!)

    // Update content status
    if (aprovado && conteudo) {
      await supabase.from('conteudos').update({
        status: 'aprovado_agendado',
        updated_at: new Date().toISOString()
      }).eq('id', conteudo.id)
    } else if (conteudo) {
      await supabase.from('conteudos').update({
        status: 'ajustes',
        updated_at: new Date().toISOString()
      }).eq('id', conteudo.id)
    }

    setSubmitted(true)
    setStatus(newStatus)
  }

  if (!token) return <ErrorState msg="Link inválido" />
  if (loading) return <LoadingState />
  if (expired) return <ErrorState msg="Este link expirou ou é inválido" />

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">{status === 'aprovado' ? '🎉' : '📝'}</div>
          <h2 className="text-2xl font-bold text-zinc-900">
            {status === 'aprovado' ? 'Conteúdo Aprovado!' : 'Ajustes Solicitados'}
          </h2>
          <p className="text-sm text-zinc-500">
            {status === 'aprovado'
              ? 'Obrigado! O conteúdo será agendado para publicação.'
              : 'Seus comentários foram enviados para a equipe.'}
          </p>
        </div>
      </div>
    )
  }

  const primaria = cliente?.cores?.primaria || '#6366F1'

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
            style={{ backgroundColor: primaria }}
          >
            {cliente?.nome?.charAt(0) || 'B'}
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">{cliente?.nome}</h1>
          <p className="text-sm text-zinc-500 mt-1">Aprovação de conteúdo</p>
        </div>

        {conteudo && (
          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{TIPO_EMOJI[conteudo.tipo] || '📄'} {conteudo.tipo}</Badge>
                {conteudo.badge && <Badge variant="info">{conteudo.badge}</Badge>}
                <span className="text-xs text-zinc-400 ml-auto">📅 {formatDateFull(conteudo.data_publicacao)}</span>
              </div>

              <h2 className="text-xl font-bold text-zinc-900">{conteudo.titulo || 'Sem título'}</h2>

              {conteudo.descricao && (
                <div>
                  <Label>📝 Narrativa</Label>
                  <pre className="bg-zinc-50 rounded-lg p-4 text-sm whitespace-pre-wrap mt-1">{conteudo.descricao}</pre>
                </div>
              )}

              {conteudo.slides?.length > 0 && (
                <div>
                  <Label>📑 Slides ({conteudo.slides.length})</Label>
                  <div className="space-y-2 mt-1">
                    {conteudo.slides.map((s: string, i: number) => (
                      <div key={i} className="bg-zinc-50 rounded-lg p-3 text-sm">
                        <span className="text-xs text-zinc-400 block mb-1">Slide {i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conteudo.legenda && (
                <div>
                  <Label>📱 Legenda</Label>
                  <pre className="bg-zinc-50 rounded-lg p-4 text-sm whitespace-pre-wrap mt-1">{conteudo.legenda}</pre>
                </div>
              )}

              {conteudo.midia_urls?.length > 0 && (
                <div>
                  <Label>📎 Mídia</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {conteudo.midia_urls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Mídia ${i + 1}`} className="rounded-lg object-cover w-full h-40" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approval form */}
        <Card>
          <CardContent className="space-y-4 py-6">
            <h3 className="text-lg font-semibold text-zinc-900">Sua resposta</h3>
            <div>
              <Label>Seu nome</Label>
              <input
                value={nomeCliente}
                onChange={e => setNomeCliente(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Como quer ser identificado?"
              />
            </div>
            <div>
              <Label>Comentário (opcional para aprovação, obrigatório para ajustes)</Label>
              <Textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder="Observações, sugestões de ajuste..."
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => handleSubmit(true)}
              >
                ✅ Aprovar
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  if (!comentario.trim()) { alert('Por favor, descreva os ajustes necessários.'); return }
                  handleSubmit(false)
                }}
              >
                🔧 Solicitar Ajustes
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400 pb-6">
          BASE Content Studio · Link válido por 30 dias
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="spinner" />
    </div>
  )
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="text-center space-y-4">
        <div className="text-5xl">❌</div>
        <h2 className="text-xl font-bold text-zinc-900">{msg}</h2>
        <p className="text-sm text-zinc-500">Solicite um novo link à equipe.</p>
      </div>
    </div>
  )
}

export default function AprovacaoPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AprovacaoContent />
    </Suspense>
  )
}
