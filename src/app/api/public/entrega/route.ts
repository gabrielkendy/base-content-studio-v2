import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: link, error } = await supabase
      .from('aprovacoes_links')
      .select('*, conteudo:conteudos(*, empresa:clientes(*))')
      .eq('token', token)
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Link inválido ou não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: link })
  } catch (err: any) {
    console.error('Public entrega GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
