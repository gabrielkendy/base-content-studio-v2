import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: aprovacao, error } = await supabase
      .from('aprovacoes_links')
      .select('*, conteudo:conteudos(*), empresa:clientes(*)')
      .eq('token', token)
      .single()

    if (error || !aprovacao) {
      return NextResponse.json({ error: 'Link inválido ou não encontrado' }, { status: 404 })
    }

    // Check expiry
    if (aprovacao.expires_at && new Date(aprovacao.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 410 })
    }

    return NextResponse.json({ data: aprovacao })
  } catch (err: any) {
    console.error('Public aprovacao GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, status, comentario, cliente_nome } = body

    if (!token || !status) {
      return NextResponse.json({ error: 'Token e status são obrigatórios' }, { status: 400 })
    }

    if (!['aprovado', 'ajuste'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch the approval link to validate
    const { data: aprovacao, error: fetchError } = await supabase
      .from('aprovacoes_links')
      .select('*, conteudo:conteudos(*)')
      .eq('token', token)
      .single()

    if (fetchError || !aprovacao) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
    }

    if (aprovacao.status !== 'pendente') {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 409 })
    }

    if (aprovacao.expires_at && new Date(aprovacao.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
    }

    // Update aprovacoes_links
    const { error: updateError } = await supabase
      .from('aprovacoes_links')
      .update({
        status,
        comentario_cliente: comentario || null,
        cliente_nome: cliente_nome || null,
        aprovado_em: status === 'aprovado' ? new Date().toISOString() : null,
      })
      .eq('token', token)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update content status
    const conteudo = aprovacao.conteudo as any
    if (conteudo) {
      const newContentStatus = status === 'aprovado' ? 'aprovado_agendado' : 'ajustes'
      await supabase
        .from('conteudos')
        .update({
          status: newContentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conteudo.id)

      // Dispatch webhook (server-side, using internal fetch)
      if (conteudo.org_id) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'
          
          await fetch(`${baseUrl}/api/webhooks/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: conteudo.org_id,
              event_type: status === 'aprovado' ? 'content.approved' : 'content.adjustment_requested',
              data: {
                conteudo_id: conteudo.id,
                titulo: conteudo.titulo,
                new_status: status === 'aprovado' ? 'aprovado_agendado' : 'ajustes',
                comentario: comentario || null,
                cliente_nome: cliente_nome || null,
              },
            }),
          })
        } catch (webhookErr) {
          // Fire and forget
          console.error('Webhook dispatch error:', webhookErr)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Public aprovacao POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
