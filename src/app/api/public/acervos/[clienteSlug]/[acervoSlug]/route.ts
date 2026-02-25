import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * API Pública - Detalhes de um acervo específico com arquivos
 * GET: Retorna acervo com todos os arquivos
 * Não requer autenticação
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteSlug: string; acervoSlug: string }> }
) {
  try {
    const { clienteSlug, acervoSlug } = await params
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

    // Buscar acervo pelo slug
    const { data: acervo, error: acervoError } = await admin
      .from('acervos')
      .select(`
        id, 
        titulo, 
        slug, 
        descricao, 
        icone, 
        total_arquivos, 
        ultimo_sync,
        drive_folder_url,
        arquivos:acervo_arquivos(
          id,
          nome,
          tipo,
          tamanho,
          url_original,
          url_thumbnail,
          url_download,
          drive_file_id,
          ordem
        )
      `)
      .eq('cliente_id', cliente.id)
      .eq('slug', acervoSlug)
      .eq('visibilidade', 'publico')
      .eq('ativo', true)
      .single()

    if (acervoError || !acervo) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    // Ordenar arquivos
    const arquivosOrdenados = (acervo.arquivos || []).sort((a: any, b: any) => a.ordem - b.ordem)

    return NextResponse.json({ 
      cliente: {
        nome: cliente.nome,
        slug: cliente.slug,
        logo_url: cliente.logo_url
      },
      acervo: {
        ...acervo,
        arquivos: arquivosOrdenados
      },
      _meta: {
        total_arquivos: arquivosOrdenados.length
      }
    })

  } catch (error: any) {
    console.error('Public acervo detail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
