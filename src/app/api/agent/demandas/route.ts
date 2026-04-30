/**
 * GET  /api/agent/demandas       — Lista solicitações (?cliente=slug, ?status=)
 * POST /api/agent/demandas       — Cria solicitação/demanda pra um cliente
 *
 * Diferença pra `/api/agent/conteudos`:
 *   - `solicitacoes` = pedido vindo do cliente (briefing, ideia inicial)
 *   - `conteudos`    = card no workflow de produção
 *
 * Use `demandas` quando o cliente pedir algo (ex: "preciso de um post sobre X").
 * Use `conteudos` quando a equipe vai começar a produzir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_STATUS = ['pendente', 'aceita', 'em_producao', 'concluida', 'cancelada', 'recusada']
const VALID_PRIORIDADE = ['baixa', 'normal', 'alta', 'urgente']
const VALID_CATEGORIA = ['post_social', 'material_grafico', 'apresentacao', 'video_offline']

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const clienteSlug = sp.get('cliente')
  const status = sp.get('status')

  const admin = createServiceClient()
  let query = admin
    .from('solicitacoes')
    .select('*, cliente:clientes(id, nome, slug)')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (clienteSlug) {
    const cliente = await resolveCliente(auth.orgId, { slug: clienteSlug })
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    query = query.eq('cliente_id', cliente.id)
  }
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ demandas: data || [], count: data?.length || 0 })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    cliente,
    cliente_id,
    cliente_slug,
    cliente_nome,
    titulo,
    descricao,
    categoria = 'post_social',
    tipo,
    prioridade = 'normal',
    prazo_desejado,
    referencias = [],
    arquivos_ref = [],
    status = 'pendente',
  } = body as Record<string, any>

  const target = await resolveCliente(auth.orgId, {
    id: cliente_id || cliente?.id,
    slug: cliente_slug || cliente?.slug || (typeof cliente === 'string' ? cliente : undefined),
    nome: cliente_nome || cliente?.nome,
  })
  if (!target) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  if (!titulo || !titulo.trim()) {
    return NextResponse.json({ error: '`titulo` é obrigatório' }, { status: 400 })
  }
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: `status inválido. Use: ${VALID_STATUS.join(', ')}` }, { status: 400 })
  }
  if (!VALID_PRIORIDADE.includes(prioridade)) {
    return NextResponse.json({ error: `prioridade inválida. Use: ${VALID_PRIORIDADE.join(', ')}` }, { status: 400 })
  }
  if (!VALID_CATEGORIA.includes(categoria)) {
    return NextResponse.json({ error: `categoria inválida. Use: ${VALID_CATEGORIA.join(', ')}` }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data: demanda, error } = await admin
    .from('solicitacoes')
    .insert({
      org_id: auth.orgId,
      cliente_id: target.id,
      categoria,
      tipo: tipo || null,
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      referencias: Array.isArray(referencias) ? referencias : [],
      arquivos_ref: Array.isArray(arquivos_ref) ? arquivos_ref : [],
      prioridade,
      prazo_desejado: prazo_desejado || null,
      status,
    })
    .select('*')
    .single()

  if (error || !demanda) {
    console.error('[agent/demandas] insert error:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao criar demanda' }, { status: 500 })
  }

  return NextResponse.json({ success: true, demanda, cliente: target })
}
