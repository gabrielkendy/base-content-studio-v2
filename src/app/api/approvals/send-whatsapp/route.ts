import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { dispararNotificacao, getAppUrl } from '@/lib/approval-notifications'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { conteudo_id, empresa_id } = body
    if (!conteudo_id || !empresa_id) {
      return NextResponse.json({ error: 'conteudo_id e empresa_id são obrigatórios' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Fetch conteudo, empresa and client approvers in parallel
    const [conteudoRes, empresaRes, aprovadoresRes] = await Promise.all([
      admin.from('conteudos').select('id, titulo, legenda, status').eq('id', conteudo_id).single(),
      admin.from('clientes').select('id, nome, slug').eq('id', empresa_id).single(),
      admin.from('aprovadores')
        .select('nome, whatsapp, email, tipo, pode_editar_legenda')
        .eq('empresa_id', empresa_id)
        .eq('tipo', 'cliente')
        .eq('ativo', true)
        .eq('recebe_notificacao', true),
    ])

    if (!conteudoRes.data) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    if (!empresaRes.data) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const conteudo = conteudoRes.data
    const empresa = empresaRes.data
    const aprovadores = aprovadoresRes.data || []

    if (aprovadores.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum aprovador cliente com WhatsApp ativo configurado para este cliente' },
        { status: 404 }
      )
    }

    // Generate token and create approval link
    const token = Array.from({ length: 32 }, () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
    ).join('')

    const { error: insertError } = await admin.from('aprovacoes_links').insert({
      conteudo_id,
      empresa_id,
      token,
      status: 'pendente',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    if (insertError) throw new Error(insertError.message)

    const APP_URL = getAppUrl()
    const link = `${APP_URL}/aprovacao?token=${token}`

    // Send WhatsApp via n8n
    const result = await dispararNotificacao({
      tipo: 'nivel_aprovado',
      conteudo: {
        id: conteudo.id,
        titulo: conteudo.titulo || 'Sem título',
        legenda: conteudo.legenda || '',
        status: conteudo.status || '',
        link_aprovacao: link,
      },
      empresa: { id: empresa.id, nome: empresa.nome, slug: empresa.slug },
      aprovadores: aprovadores.map((a: any) => ({
        nome: a.nome,
        whatsapp: a.whatsapp,
        email: a.email,
        tipo: a.tipo,
        pode_editar_legenda: a.pode_editar_legenda,
      })),
      nivel: 0,
      timestamp: new Date().toISOString(),
    })

    if (!result.success) {
      console.error('n8n webhook error:', result.error)
      // Still return success if token was created — WhatsApp may be delayed
    }

    return NextResponse.json({ success: true, count: aprovadores.length, link })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/approvals/send-whatsapp error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
