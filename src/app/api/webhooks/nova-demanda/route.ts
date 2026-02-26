import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * POST /api/webhooks/nova-demanda
 * Recebe novas demandas do n8n (Forms Agência)
 * 
 * Headers:
 *   X-Webhook-Secret: {secret definido no n8n}
 * 
 * Body:
 *   - cliente_slug: string (nechio, manchester, flexbyo, itb, etc)
 *   - titulo: string
 *   - tipo: string (Post Feed, Stories, Carrossel, Reels, Material Gráfico)
 *   - legenda?: string
 *   - midia_urls?: string[] (array de URLs) - PREFERIDO
 *   - midia_url?: string (URL única - legado, aceito para retrocompatibilidade)
 *   - psd_url?: string (URL do PSD no Drive)
 *   - demanda_id?: number (opcional - se informado, ATUALIZA demanda existente)
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_DEMANDA_SECRET || 'base-demanda-2026'

// Mapeamento cliente_slug → empresa_id
const CLIENTES: Record<string, string> = {
  'nechio': '5768ef08-e571-43f2-981a-fc9ae54c81e4',
  'manchester': '6600751f-e914-4523-8ad0-29560c888e12',
  'grupo-manchester': '6600751f-e914-4523-8ad0-29560c888e12',
  'flexbyo': '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead',
  'itb': 'fd605200-cb68-45db-b566-7713e6aca52f',
  'beat': 'ef2dff35-c584-491a-a400-beeb656d3cc1',
  'beat-club': 'ef2dff35-c584-491a-a400-beeb656d3cc1',
  'thebeatlifeclub': 'ef2dff35-c584-491a-a400-beeb656d3cc1',
  'rovertraining': '41ed75a1-ae63-4e1b-8ba5-6cb6ed18e183',
  'rt': '41ed75a1-ae63-4e1b-8ba5-6cb6ed18e183',
  'kendyproducoes': 'a37e8074-acc9-431c-a421-7e05910c4356',
  'just-burn': 'JUST_BURN_ID_AQUI',
  'portella': 'PORTELLA_ID_AQUI',
  'alliance-autos': 'ALLIANCE_AUTOS_ID_AQUI',
  'alliance-financiamentos': 'ALLIANCE_FIN_ID_AQUI',
}

// Mapeamento tipo form → tipo sistema
const TIPOS: Record<string, string> = {
  'Post Feed': 'post',
  'Post': 'post',
  'Stories': 'stories',
  'Carrossel': 'carrossel',
  'Reels': 'reels',
  'Vídeo': 'video',
  'Video': 'video',
  'Material Gráfico': 'material_grafico',
}

export async function POST(req: NextRequest) {
  try {
    // Verificar secret
    const secret = req.headers.get('X-Webhook-Secret')
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { cliente_slug, titulo, tipo, legenda, midia_url, midia_urls, psd_url, demanda_id } = body

    // Normalizar mídia: aceita array (midia_urls) ou string única (midia_url)
    let midias: string[] = []
    
    if (midia_urls && Array.isArray(midia_urls)) {
      midias = midia_urls.filter((url: string) => url && url.trim())
    } else if (midia_url) {
      midias = [midia_url]
    }

    const supabase = createServiceClient()

    // ========================================
    // MODO ATUALIZAÇÃO: Se demanda_id foi informado
    // ========================================
    if (demanda_id) {
      console.log(`[nova-demanda] Atualizando demanda #${demanda_id}`)
      
      // Buscar demanda existente
      const { data: demandaExistente, error: buscaError } = await supabase
        .from('conteudos')
        .select('id, titulo, legenda, empresa_id')
        .eq('demanda_id', demanda_id)
        .single()
      
      if (buscaError || !demandaExistente) {
        return NextResponse.json({ 
          error: `Demanda #${demanda_id} não encontrada`,
          demanda_id 
        }, { status: 404 })
      }

      // Atualizar APENAS midia_urls e status (preserva legenda, titulo, etc)
      const { data: atualizado, error: updateError } = await supabase
        .from('conteudos')
        .update({
          midia_urls: midias,
          status: 'aprovacao_cliente', // Muda pra aprovação
          updated_at: new Date().toISOString(),
        })
        .eq('id', demandaExistente.id)
        .select()
        .single()

      if (updateError) {
        console.error('Erro ao atualizar demanda:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Gerar/atualizar link de aprovação
      const token = crypto.randomBytes(24).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Verificar se já existe link
      const { data: linkExistente } = await supabase
        .from('aprovacoes_links')
        .select('id')
        .eq('conteudo_id', demandaExistente.id)
        .single()

      if (linkExistente) {
        // Atualizar link existente
        await supabase
          .from('aprovacoes_links')
          .update({
            token,
            status: 'pendente',
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', linkExistente.id)
      } else {
        // Criar novo link
        await supabase
          .from('aprovacoes_links')
          .insert({
            conteudo_id: demandaExistente.id,
            empresa_id: demandaExistente.empresa_id,
            token,
            status: 'pendente',
            expires_at: expiresAt.toISOString(),
          })
      }

      const linkAprovacao = `https://base-content-studio-v2.vercel.app/aprovacao?token=${token}`

      return NextResponse.json({
        success: true,
        mode: 'update',
        demanda_id,
        conteudo_id: demandaExistente.id,
        link_aprovacao: linkAprovacao,
        total_midias: midias.length,
        message: `Demanda #${demanda_id} atualizada com ${midias.length} arquivo(s)! Legenda original preservada.`
      })
    }

    // ========================================
    // MODO CRIAÇÃO: Criar nova demanda
    // ========================================

    // Validações para criação
    if (!cliente_slug || !titulo || !tipo || midias.length === 0) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: cliente_slug, titulo, tipo, midia_urls (array) ou midia_url (string)' 
      }, { status: 400 })
    }

    // Buscar empresa_id
    const clienteKey = cliente_slug.toLowerCase().replace(/\s+/g, '-')
    const empresa_id = CLIENTES[clienteKey]
    
    if (!empresa_id || empresa_id.includes('_AQUI')) {
      return NextResponse.json({ 
        error: `Cliente não encontrado: ${cliente_slug}`,
        clientes_disponiveis: Object.keys(CLIENTES).filter(k => !CLIENTES[k].includes('_AQUI'))
      }, { status: 400 })
    }

    // Mapear tipo
    const tipoMapeado = TIPOS[tipo] || 'post'

    // Buscar org_id do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('org_id')
      .eq('id', empresa_id)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado no banco' }, { status: 404 })
    }

    // Criar conteúdo
    const now = new Date()
    const { data: conteudo, error: conteudoError } = await supabase
      .from('conteudos')
      .insert({
        org_id: cliente.org_id,
        empresa_id,
        titulo,
        tipo: tipoMapeado,
        legenda: legenda || '',
        midia_urls: midias,
        status: 'aprovacao_cliente',
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
        categoria: tipoMapeado === 'material_grafico' ? 'material_grafico' : 'post_social',
      })
      .select()
      .single()

    if (conteudoError) {
      console.error('Erro ao criar conteúdo:', conteudoError)
      return NextResponse.json({ error: conteudoError.message }, { status: 500 })
    }

    // Gerar link de aprovação
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: aprovacao, error: aprovacaoError } = await supabase
      .from('aprovacoes_links')
      .insert({
        conteudo_id: conteudo.id,
        empresa_id,
        token,
        status: 'pendente',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (aprovacaoError) {
      console.error('Erro ao criar link:', aprovacaoError)
    }

    const linkAprovacao = aprovacao 
      ? `https://base-content-studio-v2.vercel.app/aprovacao?token=${token}`
      : null

    return NextResponse.json({
      success: true,
      mode: 'create',
      conteudo_id: conteudo.id,
      demanda_id: (conteudo as any).demanda_id,
      link_aprovacao: linkAprovacao,
      total_midias: midias.length,
      message: `Demanda criada com sucesso! (${midias.length} arquivo${midias.length > 1 ? 's' : ''})`
    })

  } catch (err: any) {
    console.error('Webhook nova-demanda error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET para testar se está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: '/api/webhooks/nova-demanda',
    method: 'POST',
    modes: {
      create: 'Cria nova demanda (padrão)',
      update: 'Atualiza demanda existente (quando demanda_id é informado)'
    },
    campos: {
      cliente_slug: 'string (obrigatório para criar)',
      titulo: 'string (obrigatório para criar)',
      tipo: 'string (obrigatório) - Post, Carrossel, Vídeo, etc',
      legenda: 'string (opcional)',
      midia_urls: 'string[] (obrigatório) - Array de URLs dos arquivos',
      midia_url: 'string (legado) - URL única',
      psd_url: 'string (opcional) - URL do PSD',
      demanda_id: 'number (opcional) - Se informado, ATUALIZA demanda existente preservando legenda'
    },
    exemplo_criar: {
      cliente_slug: 'nechio',
      titulo: 'Post Carnaval',
      tipo: 'Carrossel',
      legenda: 'Aproveite as promoções!',
      midia_urls: ['https://...', 'https://...']
    },
    exemplo_atualizar: {
      demanda_id: 247,
      midia_urls: ['https://...', 'https://...'],
      tipo: 'Carrossel'
    }
  })
}
