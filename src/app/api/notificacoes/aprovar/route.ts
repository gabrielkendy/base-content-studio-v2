import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dispararNotificacao, gerarLinkAprovacao, TipoNotificacao } from '@/lib/approval-notifications'

// POST /api/notificacoes/aprovar
// Dispara notificação para aprovadores de um conteúdo
// Body: { conteudo_id, nivel?, tipo_notificacao }
// tipo_notificacao: 'novo_conteudo' | 'nivel_aprovado' | 'ajuste_solicitado' | 'aprovado_final'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conteudo_id, nivel = 1, tipo_notificacao = 'novo_conteudo' } = body

    if (!conteudo_id) {
      return NextResponse.json({ error: 'conteudo_id obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Buscar conteúdo com info da empresa
    const { data: conteudo, error: conteudoError } = await supabase
      .from('conteudos')
      .select(`
        id,
        titulo,
        legenda,
        status,
        empresa_id,
        empresas (id, nome, slug)
      `)
      .eq('id', conteudo_id)
      .single()

    if (conteudoError || !conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    // Buscar aprovadores do nível especificado para esta empresa
    const { data: aprovadores, error: aprovadoresError } = await supabase
      .from('aprovadores')
      .select('*')
      .eq('empresa_id', conteudo.empresa_id)
      .eq('nivel', nivel)
      .eq('ativo', true)
      .eq('recebe_notificacao', true)

    if (aprovadoresError) {
      return NextResponse.json({ error: aprovadoresError.message }, { status: 500 })
    }

    if (!aprovadores || aprovadores.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum aprovador configurado para este nível',
        aprovadores_notificados: 0 
      })
    }

    // Gerar link de aprovação
    const linkAprovacao = gerarLinkAprovacao(conteudo_id)

    // Preparar payload e disparar via serviço
    const empresaData = conteudo.empresas as unknown as { id: string; nome: string; slug: string } | null
    
    const result = await dispararNotificacao({
      tipo: tipo_notificacao as TipoNotificacao,
      conteudo: {
        id: conteudo.id,
        titulo: conteudo.titulo || 'Sem título',
        legenda: conteudo.legenda?.substring(0, 200) || '',
        status: conteudo.status,
        link_aprovacao: linkAprovacao
      },
      empresa: {
        id: empresaData?.id || '',
        nome: empresaData?.nome || '',
        slug: empresaData?.slug || ''
      },
      aprovadores: aprovadores.map(a => ({
        nome: a.nome,
        whatsapp: a.whatsapp,
        email: a.email,
        tipo: a.tipo,
        pode_editar_legenda: a.pode_editar_legenda
      })),
      nivel,
      timestamp: new Date().toISOString()
    })

    if (!result.success) {
      console.error('Erro ao disparar notificação:', result.error)
    }

    return NextResponse.json({
      success: true,
      aprovadores_notificados: aprovadores.length,
      aprovadores: aprovadores.map(a => ({ nome: a.nome, whatsapp: a.whatsapp?.slice(-4) }))
    })

  } catch (e: any) {
    console.error('Erro em /api/notificacoes/aprovar:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/notificacoes/aprovar?conteudo_id=xxx
// Retorna aprovadores que serão notificados
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conteudo_id = searchParams.get('conteudo_id')
  const nivel = parseInt(searchParams.get('nivel') || '1')

  if (!conteudo_id) {
    return NextResponse.json({ error: 'conteudo_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Buscar empresa do conteúdo
  const { data: conteudo } = await supabase
    .from('conteudos')
    .select('empresa_id')
    .eq('id', conteudo_id)
    .single()

  if (!conteudo) {
    return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
  }

  // Buscar aprovadores
  const { data: aprovadores } = await supabase
    .from('aprovadores')
    .select('id, nome, email, whatsapp, tipo, nivel, recebe_notificacao')
    .eq('empresa_id', conteudo.empresa_id)
    .eq('nivel', nivel)
    .eq('ativo', true)

  return NextResponse.json({
    nivel,
    aprovadores: aprovadores || [],
    total: aprovadores?.length || 0
  })
}
