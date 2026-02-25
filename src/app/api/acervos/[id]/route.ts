import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API de Acervo Individual
 * GET: Detalhes do acervo
 * PUT: Atualizar acervo
 * DELETE: Excluir acervo
 */

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

// GET - Detalhes do acervo
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
    const orgId = membership.org_id

    const { data: acervo, error } = await admin
      .from('acervos')
      .select(`
        *,
        cliente:clientes(id, nome, slug),
        arquivos:acervo_arquivos(*)
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error || !acervo) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: acervo })

  } catch (error: any) {
    console.error('Get acervo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Atualizar acervo
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

    const admin = createServiceClient()
    const orgId = membership.org_id
    
    // Verificar se acervo existe e pertence à org
    const { data: existing } = await admin
      .from('acervos')
      .select('id, cliente_id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      titulo, 
      slug, 
      descricao, 
      icone, 
      tipo_origem,
      drive_folder_id,
      drive_folder_url,
      visibilidade,
      ordem,
      ativo 
    } = body

    // Preparar dados para update
    const updateData: any = {}
    
    if (titulo !== undefined) updateData.titulo = titulo
    if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/\s+/g, '-')
    if (descricao !== undefined) updateData.descricao = descricao
    if (icone !== undefined) updateData.icone = icone
    if (tipo_origem !== undefined) updateData.tipo_origem = tipo_origem
    if (drive_folder_url !== undefined) {
      updateData.drive_folder_url = drive_folder_url
      // Extrair folder_id do URL
      if (drive_folder_url) {
        const match = drive_folder_url.match(/folders\/([a-zA-Z0-9_-]+)/)
        if (match) {
          updateData.drive_folder_id = match[1]
        }
      }
    }
    if (drive_folder_id !== undefined) updateData.drive_folder_id = drive_folder_id
    if (visibilidade !== undefined) updateData.visibilidade = visibilidade
    if (ordem !== undefined) updateData.ordem = ordem
    if (ativo !== undefined) updateData.ativo = ativo

    // Verificar slug único (se mudou)
    if (updateData.slug) {
      const { data: slugExists } = await admin
        .from('acervos')
        .select('id')
        .eq('cliente_id', existing.cliente_id)
        .eq('slug', updateData.slug)
        .neq('id', id)
        .maybeSingle()

      if (slugExists) {
        return NextResponse.json({ error: 'Já existe um acervo com esse slug' }, { status: 400 })
      }
    }

    const { data: acervo, error } = await admin
      .from('acervos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        cliente:clientes(id, nome, slug)
      `)
      .single()

    if (error) {
      console.error('Error updating acervo:', error)
      return NextResponse.json({ error: 'Erro ao atualizar acervo' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: acervo,
      message: 'Acervo atualizado com sucesso'
    })

  } catch (error: any) {
    console.error('Update acervo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Excluir acervo
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
    const orgId = membership.org_id

    // Verificar se acervo existe e pertence à org
    const { data: existing } = await admin
      .from('acervos')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    // Excluir (cascade vai deletar arquivos também)
    const { error } = await admin
      .from('acervos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting acervo:', error)
      return NextResponse.json({ error: 'Erro ao excluir acervo' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Acervo excluído com sucesso'
    })

  } catch (error: any) {
    console.error('Delete acervo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
