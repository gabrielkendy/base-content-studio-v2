import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import * as UP from '@/lib/upload-post-v2'

// Auth helper
async function getAuth() {
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
  if (!user) return null

  const admin = createServiceClient()
  const { data: member } = await admin
    .from('members')
    .select('id, org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  return member ? { user, member, admin } : null
}

// GET /api/v2/social?action=perfis|conexoes&cliente=slug
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const clienteSlug = searchParams.get('cliente')

    // Listar todos os perfis
    if (action === 'perfis') {
      const result = await UP.listarPerfis()
      return NextResponse.json(result)
    }

    // Verificar conexões de um cliente
    if (action === 'conexoes' && clienteSlug) {
      const contas = await UP.verificarConexoes(clienteSlug)
      return NextResponse.json({ success: true, contas })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/v2/social
// body: { action: 'criar'|'link'|'postar', ... }
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    // ==========================================
    // AÇÃO: Criar perfil do cliente
    // ==========================================
    if (action === 'criar') {
      const { clienteSlug } = body
      if (!clienteSlug) {
        return NextResponse.json({ error: 'clienteSlug obrigatório' }, { status: 400 })
      }

      const result = await UP.criarPerfil(clienteSlug)
      
      // 409 = já existe (ok, não é erro)
      if (result.success || result.error?.includes('already exists')) {
        return NextResponse.json({ success: true, username: clienteSlug })
      }
      
      return NextResponse.json(result, { status: 400 })
    }

    // ==========================================
    // AÇÃO: Gerar link de conexão
    // ==========================================
    if (action === 'link') {
      const { clienteSlug, clienteNome } = body
      if (!clienteSlug) {
        return NextResponse.json({ error: 'clienteSlug obrigatório' }, { status: 400 })
      }

      // Garante que perfil existe
      await UP.criarPerfil(clienteSlug)

      // Busca org para branding
      const { data: org } = await auth.admin
        .from('orgs')
        .select('name, logo_url')
        .eq('id', auth.member.org_id)
        .single()

      const result = await UP.gerarLinkConexao({
        username: clienteSlug,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://base-content-studio-v2.vercel.app'}/clientes/${clienteSlug}/redes?connected=true`,
        logoUrl: org?.logo_url || undefined,
        titulo: `Conectar Redes - ${org?.name || 'BASE'}`,
        descricao: `Conecte as redes sociais de ${clienteNome || clienteSlug}`,
        plataformas: ['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin'],
      })

      if (!result.success || !result.access_url) {
        return NextResponse.json({ error: 'Falha ao gerar link', details: result }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        url: result.access_url,
        expira: result.duration || '48h'
      })
    }

    // ==========================================
    // AÇÃO: Postar/Agendar
    // ==========================================
    if (action === 'postar') {
      const { 
        clienteSlug, 
        plataformas, 
        legenda, 
        fotoUrls, 
        videoUrl,
        dataAgendamento,
        timezone,
        primeiroComentario,
        facebookPageId,
      } = body

      if (!clienteSlug || !plataformas || !legenda) {
        return NextResponse.json({ 
          error: 'Campos obrigatórios: clienteSlug, plataformas, legenda' 
        }, { status: 400 })
      }

      if (!fotoUrls?.length && !videoUrl) {
        return NextResponse.json({ 
          error: 'Precisa de fotoUrls ou videoUrl' 
        }, { status: 400 })
      }

      const result = await UP.postar({
        username: clienteSlug,
        plataformas,
        legenda,
        fotoUrls,
        videoUrl,
        dataAgendamento,
        timezone: timezone || 'America/Sao_Paulo',
        primeiroComentario,
        facebookPageId,
        async: true,
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    console.error('Social API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
