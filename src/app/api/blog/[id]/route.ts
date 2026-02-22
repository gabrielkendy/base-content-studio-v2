import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// ============================================
// API: /api/blog/[id]
// Métodos: GET (detalhes), PUT (atualizar), DELETE (excluir)
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

// GET: Detalhes do artigo
export async function GET(
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

    const { data: artigo, error } = await admin
      .from('conteudos')
      .select('*, empresa:clientes(*)')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .eq('categoria', 'blog')
      .single()

    if (error || !artigo) {
      return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ artigo })
  } catch (error: any) {
    console.error('GET /api/blog/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Atualizar artigo
export async function PUT(
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

    const body = await request.json()
    const { titulo, conteudo_html, imagem_url, status } = body

    const admin = createServiceClient()

    // Verificar se artigo existe
    const { data: existing, error: fetchError } = await admin
      .from('conteudos')
      .select('id')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .eq('categoria', 'blog')
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })
    }

    // Montar update
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (titulo !== undefined) updates.titulo = titulo
    if (conteudo_html !== undefined) updates.descricao = conteudo_html
    if (status !== undefined) updates.status = status
    if (imagem_url !== undefined) {
      updates.midia_urls = imagem_url ? [imagem_url] : []
    }

    const { data: artigo, error: updateError } = await admin
      .from('conteudos')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Erro ao atualizar:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar artigo' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      artigo,
      message: 'Artigo atualizado!'
    })
  } catch (error: any) {
    console.error('PUT /api/blog/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Excluir artigo
export async function DELETE(
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

    const { error } = await admin
      .from('conteudos')
      .delete()
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .eq('categoria', 'blog')

    if (error) {
      console.error('Erro ao excluir:', error)
      return NextResponse.json({ error: 'Erro ao excluir artigo' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Artigo excluído!'
    })
  } catch (error: any) {
    console.error('DELETE /api/blog/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
