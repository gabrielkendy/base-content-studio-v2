import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { dispararNotificacao, getAppUrl, templatesWhatsApp, type CanalNotificacao } from '@/lib/approval-notifications'
import { zapiSendText } from '@/lib/zapi'
import { generateApprovalToken } from '@/lib/tokens'

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

    // Get user's org and Z-API credentials in parallel with other queries
    const [conteudoRes, empresaRes, aprovadoresRes, memberRes] = await Promise.all([
      admin.from('conteudos').select('id, titulo, legenda, status').eq('id', conteudo_id).single(),
      admin.from('clientes').select('id, nome, slug').eq('id', empresa_id).single(),
      admin.from('aprovadores')
        .select('nome, whatsapp, email, tipo, pode_editar_legenda')
        .eq('empresa_id', empresa_id)
        .eq('tipo', 'cliente')
        .eq('ativo', true)
        .eq('recebe_notificacao', true),
      admin.from('members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
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
    const token = generateApprovalToken()

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

    const conteudoInfo = {
      id: conteudo.id,
      titulo: conteudo.titulo || 'Sem título',
      legenda: conteudo.legenda || '',
      status: conteudo.status || '',
      link_aprovacao: link,
    }
    const empresaInfo = { id: empresa.id, nome: empresa.nome, slug: empresa.slug }

    // Try Z-API first if org has a connected instance
    let usedZapi = false
    const orgId = memberRes.data?.org_id
    if (orgId) {
      const { data: org } = await admin
        .from('organizations')
        .select('zapi_instance_id, zapi_token, zapi_status')
        .eq('id', orgId)
        .single()

      if (org?.zapi_instance_id && org?.zapi_token && org?.zapi_status === 'connected') {
        const message = templatesWhatsApp.nivel_aprovado(conteudoInfo, empresaInfo)
        const results = await Promise.allSettled(
          aprovadores
            .filter((a: { whatsapp: string | null }) => a.whatsapp)
            .map((a: { whatsapp: string }) =>
              zapiSendText(org.zapi_instance_id!, org.zapi_token!, a.whatsapp, message)
            )
        )
        const sent = results.filter(r => r.status === 'fulfilled').length
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) {
          console.warn(`Z-API: ${sent} enviados, ${failed} falharam para org ${orgId}`)
        }
        if (sent > 0) usedZapi = true
      }
    }

    // Fall back to n8n if Z-API was not used
    if (!usedZapi) {
      const result = await dispararNotificacao({
        tipo: 'nivel_aprovado',
        conteudo: conteudoInfo,
        empresa: empresaInfo,
        aprovadores: aprovadores.map((a: { nome: string; whatsapp: string; email: string | null; tipo: string; pode_editar_legenda: boolean; telegram_id?: string | null; canais_notificacao?: string[] }) => ({
          nome: a.nome,
          whatsapp: a.whatsapp,
          email: a.email,
          tipo: a.tipo as 'interno' | 'cliente' | 'designer',
          pode_editar_legenda: a.pode_editar_legenda,
          telegram_id: a.telegram_id ?? null,
          canais_notificacao: (a.canais_notificacao ?? ['whatsapp']) as CanalNotificacao[],
        })),
        nivel: 0,
        timestamp: new Date().toISOString(),
      })
      if (!result.success) {
        console.error('n8n webhook error:', result.error)
      }
    }

    return NextResponse.json({
      success: true,
      count: aprovadores.length,
      link,
      channel: usedZapi ? 'zapi' : 'n8n',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/approvals/send-whatsapp error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
