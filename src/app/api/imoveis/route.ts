import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { gerarCarrossel, gerarLegenda, gerarRoteiro, gerarEmailKendy, gerarEmailEquipe } from '@/lib/imoveis-templates'
import { sendRawEmail } from '@/lib/email'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data
}

// GET - Listar imóveis
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const admin = createServiceClient()
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('cliente_id')
    const status = searchParams.get('status')

    let query = admin
      .from('imoveis')
      .select('*, cliente:clientes(id, nome, slug)')
      .eq('org_id', membership.org_id)
      .order('created_at', { ascending: false })

    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching imoveis:', error)
      return NextResponse.json({ error: 'Erro ao buscar imóveis' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('GET imoveis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Criar imóvel + gerar conteúdo + enviar emails
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const body = await request.json()
    const admin = createServiceClient()

    // Validações básicas
    if (!body.cliente_id) {
      return NextResponse.json({ error: 'Cliente é obrigatório' }, { status: 400 })
    }
    if (!body.titulo) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
    }

    // 1. Gerar conteúdo automaticamente
    const carrossel = gerarCarrossel(body)
    const legenda = gerarLegenda(body)
    const roteiro = gerarRoteiro(body)

    // 2. Inserir imóvel
    const { data: imovel, error: insertError } = await admin
      .from('imoveis')
      .insert({
        org_id: membership.org_id,
        cliente_id: body.cliente_id,
        codigo: body.codigo || null,
        titulo: body.titulo,
        tipo: body.tipo || 'apartamento',
        endereco: body.endereco || null,
        numero: body.numero || null,
        complemento: body.complemento || null,
        bairro: body.bairro || null,
        cidade: body.cidade || null,
        estado: body.estado || null,
        cep: body.cep || null,
        area_total: body.area_total || null,
        area_construida: body.area_construida || null,
        quartos: body.quartos || 0,
        suites: body.suites || 0,
        banheiros: body.banheiros || 0,
        vagas: body.vagas || 0,
        preco: body.preco || null,
        preco_condominio: body.preco_condominio || null,
        preco_iptu: body.preco_iptu || null,
        tipo_negocio: body.tipo_negocio || 'venda',
        descricao: body.descricao || null,
        diferenciais: body.diferenciais || [],
        fotos: body.fotos || [],
        video_url: body.video_url || null,
        tour_virtual_url: body.tour_virtual_url || null,
        carrossel_gerado: carrossel,
        legenda_gerada: legenda,
        roteiro_video: roteiro,
        status: 'conteudo_criado',
        created_by: user.id,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Error creating imovel:', insertError)
      return NextResponse.json({ error: 'Erro ao criar imóvel' }, { status: 500 })
    }

    // 3. Buscar configurações de email
    const { data: config } = await admin
      .from('imoveis_config')
      .select('*')
      .eq('cliente_id', body.cliente_id)
      .maybeSingle()

    // 4. Criar solicitação no Content Studio
    let solicitacaoId = null
    try {
      const { data: solicitacao } = await admin
        .from('solicitacoes')
        .insert({
          org_id: membership.org_id,
          cliente_id: body.cliente_id,
          categoria: 'post_social',
          tipo: 'carrossel',
          titulo: `[IMÓVEL] ${body.titulo}`,
          descricao: `Carrossel para imóvel: ${body.titulo}\n\nLegenda gerada automaticamente.\n\nVer detalhes no módulo de imóveis.`,
          prioridade: 'normal',
          status: 'nova',
        })
        .select('id')
        .single()
      
      if (solicitacao) {
        solicitacaoId = solicitacao.id
        await admin
          .from('imoveis')
          .update({ solicitacao_id: solicitacaoId })
          .eq('id', imovel.id)
      }
    } catch (e) {
      console.error('Error creating solicitacao:', e)
    }

    // 5. Enviar emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-content-studio-v2.vercel.app'
    const respondUrl = `${baseUrl}/api/imoveis/${imovel.id}/responder`

    // Email para Kendy (gestor)
    const emailGestor = config?.email_gestor || 'contato@kendyproducoes.com.br'
    const emailKendyContent = gerarEmailKendy(body, carrossel, legenda)
    
    try {
      await sendRawEmail({
        to: emailGestor,
        subject: emailKendyContent.subject,
        html: emailKendyContent.html,
      })
      await admin
        .from('imoveis')
        .update({ email_kendy_enviado: true })
        .eq('id', imovel.id)
    } catch (e) {
      console.error('Error sending email to gestor:', e)
    }

    // Email para equipe
    const emailsEquipe = config?.emails_equipe || []
    if (emailsEquipe.length > 0) {
      const emailEquipeContent = gerarEmailEquipe(body, roteiro, respondUrl)
      
      try {
        for (const email of emailsEquipe) {
          await sendRawEmail({
            to: email,
            subject: emailEquipeContent.subject,
            html: emailEquipeContent.html,
          })
        }
        await admin
          .from('imoveis')
          .update({ email_equipe_enviado: true })
          .eq('id', imovel.id)
      } catch (e) {
        console.error('Error sending email to equipe:', e)
      }
    }

    return NextResponse.json({
      success: true,
      imovel,
      carrossel,
      legenda,
      roteiro,
      solicitacao_id: solicitacaoId,
      emails: {
        kendy: true,
        equipe: emailsEquipe.length > 0,
      },
    })
  } catch (error: any) {
    console.error('POST imovel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
