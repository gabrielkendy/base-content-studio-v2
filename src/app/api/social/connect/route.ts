import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ensureProfile, generateJwtUrl, buildUsername } from '@/lib/upload-post'

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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { clienteSlug, platforms } = await request.json()
    if (!clienteSlug) return NextResponse.json({ error: 'clienteSlug is required' }, { status: 400 })

    const admin = createServiceClient()

    // Get client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('slug', clienteSlug)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Get org info for logo
    const { data: org } = await admin
      .from('organizations')
      .select('logo_url, name')
      .eq('id', membership.org_id)
      .single()

    const username = buildUsername(membership.org_id, cliente.id, cliente.slug)

    // Lazy creation: ensure profile exists
    const profileResult = await ensureProfile(username)
    if (!profileResult.success) {
      return NextResponse.json({ error: profileResult.error || 'Erro ao criar perfil' }, { status: 500 })
    }

    // Generate JWT URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${appUrl}/clientes/${cliente.slug}/redes?connected=true`

    const jwtResult = await generateJwtUrl({
      username,
      redirect_url: redirectUrl,
      logo_image: org?.logo_url || undefined,
      connect_title: 'Conectar Redes Sociais',
      connect_description: `Conecte as redes sociais de ${cliente.nome} para publicar conteúdo.`,
      platforms: platforms || undefined,
      show_calendar: false,
    })

    // Se JWT falhar (plano Basic sem Whitelabel), redireciona pro painel do Upload-Post
    if (!jwtResult.success) {
      // Fallback: redireciona pro painel do Upload-Post diretamente
      const fallbackUrl = `https://app.upload-post.com/dashboard/managed-users?profile=${encodeURIComponent(username)}&redirect=${encodeURIComponent(redirectUrl)}`
      return NextResponse.json({
        success: true,
        access_url: fallbackUrl,
        fallback: true,
        message: 'Redirecionando para o painel do Upload-Post. Conecte as redes e volte para sincronizar.'
      })
    }

    return NextResponse.json({
      success: true,
      access_url: jwtResult.access_url,
    })
  } catch (error: any) {
    console.error('Connect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
