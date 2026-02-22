import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// API: /api/blog/[id]/publish
// Método: POST - Publicar artigo no WordPress
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

// Função auxiliar para fazer upload de imagem pro WordPress
async function uploadImageToWordPress(
  wpUrl: string,
  wpUser: string,
  wpPassword: string,
  imageUrl: string
): Promise<number | null> {
  try {
    // Download da imagem
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) return null

    const imageBlob = await imageResponse.blob()
    const filename = imageUrl.split('/').pop() || 'featured-image.jpg'

    // Upload pro WordPress
    const formData = new FormData()
    formData.append('file', imageBlob, filename)

    const credentials = Buffer.from(`${wpUser}:${wpPassword}`).toString('base64')
    
    const uploadResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      console.error('Erro upload imagem WP:', await uploadResponse.text())
      return null
    }

    const mediaData = await uploadResponse.json()
    return mediaData.id
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error)
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const admin = createServiceClient()

    // 1. Buscar artigo com dados do cliente
    const { data: artigo, error: artigoError } = await admin
      .from('conteudos')
      .select('*, empresa:clientes(*)')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .eq('categoria', 'blog')
      .single()

    if (artigoError || !artigo) {
      return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })
    }

    // 2. Verificar se cliente tem WordPress configurado
    const cliente = artigo.empresa
    if (!cliente?.wp_url || !cliente?.wp_user || !cliente?.wp_app_password) {
      return NextResponse.json({ 
        error: 'WordPress não configurado para este cliente. Configure em Configurações > Blog.' 
      }, { status: 400 })
    }

    const { wp_url, wp_user, wp_app_password, wp_default_status, wp_default_category_id } = cliente
    const credentials = Buffer.from(`${wp_user}:${wp_app_password}`).toString('base64')

    // 3. Upload da imagem destacada (se existir)
    let featuredMediaId: number | null = null
    if (artigo.midia_urls && artigo.midia_urls.length > 0) {
      featuredMediaId = await uploadImageToWordPress(
        wp_url,
        wp_user,
        wp_app_password,
        artigo.midia_urls[0]
      )
    }

    // 4. Criar post no WordPress
    const postData: Record<string, any> = {
      title: artigo.titulo || 'Sem título',
      content: artigo.descricao || '',
      status: wp_default_status || 'draft',
    }

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId
    }

    if (wp_default_category_id) {
      postData.categories = [wp_default_category_id]
    }

    const wpResponse = await fetch(`${wp_url}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    })

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text()
      console.error('Erro WordPress API:', errorText)
      return NextResponse.json({ 
        error: `Erro ao publicar no WordPress: ${wpResponse.status}`,
        details: errorText
      }, { status: 502 })
    }

    const wpPost = await wpResponse.json()

    // 5. Atualizar artigo no Supabase
    const { error: updateError } = await admin
      .from('conteudos')
      .update({
        status: 'publicado',
        wp_post_id: wpPost.id,
        wp_post_url: wpPost.link,
        wp_published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError)
      // Não retorna erro pois o post foi criado no WP
    }

    return NextResponse.json({
      success: true,
      message: 'Artigo publicado no WordPress!',
      wordpress: {
        post_id: wpPost.id,
        post_url: wpPost.link,
        status: wpPost.status,
      }
    })
  } catch (error: any) {
    console.error('POST /api/blog/[id]/publish error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
