import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { dispararNotificacao, gerarLinkAprovacao, TipoNotificacao } from '@/lib/approval-notifications'

// POST /api/aprovacao/action
// Body: { conteudo_id, acao, aprovador_id?, comentario?, nivel_atual? }
// acao: 'aprovar' | 'ajuste' | 'reprovar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conteudo_id, acao, aprovador_id, comentario, nivel_atual = 1 } = body

    if (!conteudo_id || !acao) {
      return NextResponse.json({ error: 'conteudo_id e acao obrigatórios' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Buscar conteúdo
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

    const empresaData = conteudo.empresas as unknown as { id: string; nome: string; slug: string } | null

    // Verificar quantos níveis existem para esta empresa
    const { data: niveisData } = await supabase
      .from('aprovadores')
      .select('nivel')
      .eq('empresa_id', conteudo.empresa_id)
      .eq('ativo', true)
      .order('nivel', { ascending: false })
      .limit(1)

    const maxNivel = niveisData?.[0]?.nivel || 1

    let novoStatus: string
    let tipoNotificacao: TipoNotificacao
    let proximoNivel: number | null = null

    switch (acao) {
      case 'aprovar':
        if (nivel_atual < maxNivel) {
          // Ainda tem mais níveis
          proximoNivel = nivel_atual + 1
          novoStatus = `aguardando_nivel_${proximoNivel}`
          tipoNotificacao = 'nivel_aprovado'
        } else {
          // Último nível - aprovação final
          novoStatus = 'aprovado'
          tipoNotificacao = 'aprovado_final'
        }
        break

      case 'ajuste':
        novoStatus = 'ajuste_solicitado'
        tipoNotificacao = 'ajuste_solicitado'
        break

      case 'reprovar':
        novoStatus = 'reprovado'
        tipoNotificacao = 'ajuste_solicitado' // Usar mesmo template
        break

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Atualizar status do conteúdo
    const { error: updateError } = await supabase
      .from('conteudos')
      .update({ 
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', conteudo_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Registrar histórico de aprovação (ignorar erros se tabela não existir)
    try {
      await supabase.from('historico_aprovacao').insert({
        conteudo_id,
        acao,
        nivel: nivel_atual,
        aprovador_id: aprovador_id || null,
        comentario: comentario || null,
        status_anterior: conteudo.status,
        status_novo: novoStatus,
        created_at: new Date().toISOString()
      })
    } catch {
      // Tabela pode não existir ainda
    }

    // Buscar aprovadores para notificar
    let nivelParaNotificar = proximoNivel
    if (acao === 'ajuste' || acao === 'reprovar') {
      // Notificar designers (nível 0 ou tipo designer)
      nivelParaNotificar = 1 // Ou buscar designers especificamente
    }

    if (nivelParaNotificar || tipoNotificacao === 'aprovado_final') {
      const { data: aprovadores } = await supabase
        .from('aprovadores')
        .select('*')
        .eq('empresa_id', conteudo.empresa_id)
        .eq('ativo', true)
        .eq('recebe_notificacao', true)
        .eq(tipoNotificacao === 'ajuste_solicitado' ? 'tipo' : 'nivel', 
            tipoNotificacao === 'ajuste_solicitado' ? 'designer' : nivelParaNotificar)

      if (aprovadores && aprovadores.length > 0) {
        await dispararNotificacao({
          tipo: tipoNotificacao,
          conteudo: {
            id: conteudo.id,
            titulo: conteudo.titulo || 'Sem título',
            legenda: conteudo.legenda?.substring(0, 200) || '',
            status: novoStatus,
            link_aprovacao: gerarLinkAprovacao(conteudo_id)
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
          nivel: nivelParaNotificar || nivel_atual,
          timestamp: new Date().toISOString()
        })
      }
    }

    return NextResponse.json({
      success: true,
      status_anterior: conteudo.status,
      status_novo: novoStatus,
      proximo_nivel: proximoNivel,
      aprovacao_final: novoStatus === 'aprovado'
    })

  } catch (e: any) {
    console.error('Erro em /api/aprovacao/action:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/aprovacao/action?conteudo_id=xxx
// Retorna status atual e próximos passos
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conteudo_id = searchParams.get('conteudo_id')

  if (!conteudo_id) {
    return NextResponse.json({ error: 'conteudo_id obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Buscar conteúdo
  const { data: conteudo } = await supabase
    .from('conteudos')
    .select('id, titulo, status, empresa_id')
    .eq('id', conteudo_id)
    .single()

  if (!conteudo) {
    return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
  }

  // Buscar níveis configurados
  const { data: niveisData } = await supabase
    .from('aprovadores')
    .select('nivel')
    .eq('empresa_id', conteudo.empresa_id)
    .eq('ativo', true)
    .order('nivel', { ascending: true })

  const niveis = [...new Set(niveisData?.map(n => n.nivel) || [])]
  const maxNivel = Math.max(...niveis, 0)

  // Extrair nível atual do status
  const match = conteudo.status?.match(/aguardando_nivel_(\d+)/)
  const nivelAtual = match ? parseInt(match[1]) : 
                     conteudo.status === 'aprovacao_cliente' ? 1 : 0

  return NextResponse.json({
    conteudo_id,
    status_atual: conteudo.status,
    nivel_atual: nivelAtual,
    max_nivel: maxNivel,
    niveis_configurados: niveis,
    pode_aprovar: conteudo.status?.includes('aguardando') || conteudo.status === 'aprovacao_cliente'
  })
}
