import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// API: /api/blog/wordpress/test
// Método: POST - Testar conexão com WordPress
// ============================================

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const body = await request.json()
    const { wp_url, wp_user, wp_app_password } = body

    if (!wp_url || !wp_user || !wp_app_password) {
      return NextResponse.json({ 
        error: 'wp_url, wp_user e wp_app_password são obrigatórios' 
      }, { status: 400 })
    }

    // Normalizar URL (remover trailing slash)
    const normalizedUrl = wp_url.replace(/\/+$/, '')

    // Testar conexão buscando informações do site
    const credentials = Buffer.from(`${wp_user}:${wp_app_password}`).toString('base64')

    // 1. Testar endpoint de usuários (verifica autenticação)
    const userResponse = await fetch(`${normalizedUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    })

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return NextResponse.json({ 
          success: false,
          error: 'Credenciais inválidas. Verifique usuário e Application Password.' 
        }, { status: 200 })
      }
      return NextResponse.json({ 
        success: false,
        error: `Erro ao conectar: ${userResponse.status} ${userResponse.statusText}` 
      }, { status: 200 })
    }

    const wpUser = await userResponse.json()

    // 2. Buscar informações do site
    const siteResponse = await fetch(`${normalizedUrl}/wp-json/`)
    const siteInfo = siteResponse.ok ? await siteResponse.json() : null

    // 3. Contar posts existentes
    const postsResponse = await fetch(`${normalizedUrl}/wp-json/wp/v2/posts?per_page=1`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    })
    const totalPosts = postsResponse.headers.get('X-WP-Total') || '0'

    return NextResponse.json({
      success: true,
      message: 'Conexão OK!',
      wordpress: {
        name: siteInfo?.name || 'WordPress',
        description: siteInfo?.description || '',
        url: normalizedUrl,
        user: {
          id: wpUser.id,
          name: wpUser.name,
          email: wpUser.email,
        },
        total_posts: parseInt(totalPosts),
      }
    })
  } catch (error: any) {
    console.error('POST /api/blog/wordpress/test error:', error)
    return NextResponse.json({ 
      success: false,
      error: `Erro de conexão: ${error.message}` 
    }, { status: 200 })
  }
}
