import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * API Pública - Lista acervos de um cliente (por slug)
 * GET: Retorna todos os acervos públicos do cliente
 * Não requer autenticação
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteSlug: string }> }
) {
  try {
    const { clienteSlug } = await params
    const admin = createServiceClient()

    // Buscar cliente pelo slug
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, logo_url')
      .eq('slug', clienteSlug)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Buscar acervos públicos e ativos do cliente
    const { data: acervos, error: acervosError } = await admin
      .from('acervos')
      .select('id, titulo, slug, descricao, icone, total_arquivos, ultimo_sync')
      .eq('cliente_id', cliente.id)
      .eq('visibilidade', 'publico')
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (acervosError) {
      console.error('Error fetching acervos:', acervosError)
      return NextResponse.json({ error: 'Erro ao buscar acervos' }, { status: 500 })
    }

    return NextResponse.json({ 
      cliente: {
        nome: cliente.nome,
        slug: cliente.slug,
        logo_url: cliente.logo_url
      },
      acervos: acervos || [],
      _meta: {
        total: acervos?.length || 0
      }
    })

  } catch (error: any) {
    console.error('Public acervos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
