import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/aprovadores?empresa_slug=nechio&tipo=interno&nivel=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const empresa_slug = searchParams.get('empresa_slug')
  const empresa_id = searchParams.get('empresa_id')
  const tipo = searchParams.get('tipo')
  const nivel = searchParams.get('nivel')
  const ativo = searchParams.get('ativo') !== 'false' // default true

  const supabase = createServiceClient()

  let query = supabase
    .from('aprovadores')
    .select(`
      *,
      empresas (id, nome, slug)
    `)
    .eq('ativo', ativo)
    .order('nivel')
    .order('nome')

  // Filtrar por empresa (slug ou id)
  if (empresa_slug) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', empresa_slug)
      .single()
    
    if (empresa) {
      query = query.eq('empresa_id', empresa.id)
    }
  } else if (empresa_id) {
    query = query.eq('empresa_id', empresa_id)
  }

  // Filtrar por tipo
  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  // Filtrar por nível
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
    const body = await request.json()
    const { empresa_id, nome, email, whatsapp, tipo, nivel, pode_editar_legenda, recebe_notificacao } = body

    if (!empresa_id || !nome || !whatsapp || !tipo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: empresa_id, nome, whatsapp, tipo' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Formatar WhatsApp
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
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 })
  }
}
