import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api-auth'

// GET /api/aprovadores?empresa_slug=nechio&tipo=interno&nivel=1
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = auth

  const { searchParams } = new URL(request.url)
  const empresa_slug = searchParams.get('empresa_slug')
  const empresa_id = searchParams.get('empresa_id')
  const tipo = searchParams.get('tipo')
  const nivel = searchParams.get('nivel')
  const ativo = searchParams.get('ativo') !== 'false'

  const supabase = createServiceClient()

  let resolvedEmpresaId: string | null = empresa_id

  if (empresa_slug) {
    // Look up by slug, but only within the user's org
    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('slug', empresa_slug)
      .eq('org_id', orgId)
      .single()
    if (!empresa) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    resolvedEmpresaId = empresa.id
  } else if (empresa_id) {
    // Validate the empresa belongs to user's org
    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', empresa_id)
      .eq('org_id', orgId)
      .single()
    if (!empresa) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  let query = supabase
    .from('aprovadores')
    .select(`
      *,
      empresas (id, nome, slug)
    `)
    .eq('ativo', ativo)
    .order('nivel')
    .order('nome')

  if (resolvedEmpresaId) {
    query = query.eq('empresa_id', resolvedEmpresaId)
  } else {
    // No empresa filter — scope to all clientes of user's org
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id')
      .eq('org_id', orgId)
    const ids = clientes?.map((c: { id: string }) => c.id) || []
    if (ids.length === 0) return NextResponse.json([])
    query = query.in('empresa_id', ids)
  }

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  if (nivel) {
    query = query.eq('nivel', Number(nivel))
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/aprovadores - Criar novo aprovador
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await request.json()
    const { empresa_id, nome, email, whatsapp, tipo, nivel, pode_editar_legenda, recebe_notificacao } = body

    if (!empresa_id || !nome || !whatsapp || !tipo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: empresa_id, nome, whatsapp, tipo' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Validate empresa belongs to user's org
    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', empresa_id)
      .eq('org_id', orgId)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const whatsappFormatado = whatsapp.replace(/\D/g, '')
    const whatsappFinal = whatsappFormatado.startsWith('55') ? whatsappFormatado : `55${whatsappFormatado}`

    const { data, error } = await supabase
      .from('aprovadores')
      .insert({
        empresa_id,
        nome,
        email: email || null,
        whatsapp: whatsappFinal,
        pais: '+55',
        tipo,
        nivel: nivel || 1,
        pode_editar_legenda: pode_editar_legenda || false,
        recebe_notificacao: recebe_notificacao !== false,
        ativo: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
