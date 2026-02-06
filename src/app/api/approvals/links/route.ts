import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Buscar links de aprovação com tracking
export async function GET(request: NextRequest) {
  try {
    const conteudoId = request.nextUrl.searchParams.get('conteudo_id')

    if (!conteudoId) {
      return NextResponse.json({ error: 'conteudo_id é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('aprovacoes_links')
      .select('token, status, view_count, last_viewed_at, views, created_at, comentario_cliente, cliente_nome')
      .eq('conteudo_id', conteudoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Links GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Links GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
