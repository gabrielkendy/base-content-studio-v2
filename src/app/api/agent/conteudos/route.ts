/**
 * GET  /api/agent/conteudos     — Lista (?cliente=slug, ?status=, ?mes=, ?ano=)
 * POST /api/agent/conteudos     — Cria conteúdo (a "demanda" / card no workflow)
 *
 * Status válidos (alinhados com o app):
 *   backlog → ideia → producao → aprovacao_interna → aprovacao → agendado → publicado
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'

const VALID_STATUS = [
  'backlog',
  'ideia',
  'producao',
  'aprovacao_interna',
  'aprovacao',
  'agendado',
  'publicado',
]

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const clienteSlug = sp.get('cliente')
  const status = sp.get('status')
  const mes = sp.get('mes')
  const ano = sp.get('ano')

  const admin = createServiceClient()
  let query = admin
    .from('conteudos')
    .select('*, empresa:clientes(id, nome, slug)')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (clienteSlug) {
    const cliente = await resolveCliente(auth.orgId, { slug: clienteSlug })
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    query = query.eq('empresa_id', cliente.id)
  }
  if (status) query = query.eq('status', status)
  if (mes) query = query.eq('mes', parseInt(mes, 10))
  if (ano) query = query.eq('ano', parseInt(ano, 10))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ conteudos: data || [], count: data?.length || 0 })
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
    legenda,
    tipo = 'post_social',
    categoria = 'post_social',
    status = 'producao',
    canais = [],
    midia_urls = [],
    capa_url,
    data_publicacao,
    hora_publicacao,
    badge,
    prompts_imagem = [],
    prompts_video = [],
    slides = [],
    assigned_to,
  } = body as Record<string, any>

  // Resolve cliente
  const target = await resolveCliente(auth.orgId, {
    id: cliente_id || cliente?.id,
    slug: cliente_slug || cliente?.slug || (typeof cliente === 'string' ? cliente : undefined),
    nome: cliente_nome || cliente?.nome,
  })
  if (!target) {
    return NextResponse.json({ error: 'Cliente não encontrado (use cliente, cliente_id ou cliente_slug)' }, { status: 404 })
  }

  if (!titulo && !legenda && !descricao) {
    return NextResponse.json({ error: 'Informe pelo menos `titulo`, `legenda` ou `descricao`' }, { status: 400 })
  }

  if (status && !VALID_STATUS.includes(status)) {
    return NextResponse.json({
      error: `Status inválido. Use um de: ${VALID_STATUS.join(', ')}`,
    }, { status: 400 })
  }

  // Mes/ano default = data de publicação ou hoje
  let mes: number, ano: number
  if (data_publicacao) {
    const d = new Date(data_publicacao)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'data_publicacao inválida (use YYYY-MM-DD)' }, { status: 400 })
    }
    mes = d.getMonth() + 1
    ano = d.getFullYear()
  } else {
    const now = new Date()
    mes = now.getMonth() + 1
    ano = now.getFullYear()
  }

  const admin = createServiceClient()
  const { data: conteudo, error } = await admin
    .from('conteudos')
    .insert({
      org_id: auth.orgId,
      empresa_id: target.id,
      mes,
      ano,
      data_publicacao: data_publicacao || null,
      hora_publicacao: hora_publicacao || null,
      titulo: titulo || null,
      legenda: legenda || null,
      descricao: descricao || null,
      tipo,
      categoria,
      status,
      sub_status: null,
      ordem: 0,
      midia_urls: Array.isArray(midia_urls) ? midia_urls : [],
      capa_url: capa_url || null,
      canais: Array.isArray(canais) ? canais : [],
      badge: badge || null,
      prompts_imagem,
      prompts_video,
      slides,
      assigned_to: assigned_to || null,
      internal_approved: false,
      internal_approved_by: null,
      internal_approved_at: null,
    })
    .select('*')
    .single()

  if (error || !conteudo) {
    console.error('[agent/conteudos] insert error:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao criar conteúdo' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    conteudo,
    cliente: target,
  })
}
