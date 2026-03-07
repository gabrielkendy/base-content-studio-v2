import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api-auth'

// GET: Buscar links de aprovação com tracking
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const conteudoId = request.nextUrl.searchParams.get('conteudo_id')

    if (!conteudoId) {
      return NextResponse.json({ error: 'conteudo_id é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Verify conteudo belongs to user's org via empresa → clientes.org_id
    const { data: conteudo } = await supabase
      .from('conteudos')
      .select('empresa_id')
      .eq('id', conteudoId)
      .single()

    if (!conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', conteudo.empresa_id)
      .eq('org_id', orgId)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('Links GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
