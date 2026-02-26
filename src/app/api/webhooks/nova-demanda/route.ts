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
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_DEMANDA_SECRET || 'base-demanda-2026'

// Mapeamento cliente_slug → empresa_id
const CLIENTES: Record<string, string> = {
  'nechio': '5768ef08-e571-43f2-981a-fc9ae54c81e4',
  'manchester': '6600751f-e914-4523-8ad0-29560c888e12',
  'grupo-manchester': '6600751f-e914-4523-8ad0-29560c888e12',
  'flexbyo': '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead',
  'itb': 'ITB_ID_AQUI', // Atualizar com ID real
  'beat': 'BEAT_ID_AQUI', // Atualizar com ID real
  'beat-club': 'BEAT_ID_AQUI',
  'just-burn': 'JUST_ID_AQUI', // Atualizar com ID real
  'rt': 'RT_ID_AQUI', // Atualizar com ID real
  'rovertraining': 'RT_ID_AQUI',
}

// Mapeamento tipo form → tipo sistema
const TIPOS: Record<string, string> = {
  'Post Feed': 'post',
  'Stories': 'stories',
  'Carrossel': 'carrossel',
  'Reels': 'reels',
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
    const { cliente_slug, titulo, tipo, legenda, midia_url, midia_urls, psd_url } = body

    // Normalizar mídia: aceita array (midia_urls) ou string única (midia_url)
    let midias: string[] = []
    
    if (midia_urls && Array.isArray(midia_urls)) {
      // Novo formato: array de URLs
      midias = midia_urls.filter((url: string) => url && url.trim())
    } else if (midia_url) {
      // Formato legado: URL única
      midias = [midia_url]
    }

    // Validações
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

    const supabase = createServiceClient()

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
        midia_urls: midias, // Agora usa o array normalizado
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
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 dias

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
      // Não falha, só loga
    }

    const linkAprovacao = aprovacao 
      ? `https://base-content-studio-v2.vercel.app/aprovacao?token=${token}`
      : null

    return NextResponse.json({
      success: true,
      conteudo_id: conteudo.id,
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
    campos: {
      cliente_slug: 'string (obrigatório)',
      titulo: 'string (obrigatório)',
      tipo: 'string (obrigatório) - Post Feed, Stories, Carrossel, Reels, Material Gráfico',
      legenda: 'string (opcional)',
      midia_urls: 'string[] (obrigatório) - Array de URLs dos arquivos',
      midia_url: 'string (legado) - URL única (aceito para retrocompatibilidade)',
      psd_url: 'string (opcional) - URL do PSD',
    },
    exemplo: {
      cliente_slug: 'nechio',
      titulo: 'Post Carnaval',
      tipo: 'Carrossel',
      legenda: 'Aproveite as promoções!',
      midia_urls: [
        'https://drive.google.com/file1.jpg',
        'https://drive.google.com/file2.jpg',
        'https://drive.google.com/file3.jpg'
      ]
    }
  })
}
