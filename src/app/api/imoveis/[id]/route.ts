import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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

// GET - Buscar imóvel por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { id } = await params
    const admin = createServiceClient()

    const { data, error } = await admin
      .from('imoveis')
      .select('*, cliente:clientes(id, nome, slug, cores)')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('GET imovel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Atualizar imóvel
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const admin = createServiceClient()

    // Verificar se o imóvel existe e pertence à org
    const { data: existing } = await admin
      .from('imoveis')
      .select('id')
      .eq('id', id)
      .eq('org_id', membership.org_id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }

    // Remover campos que não devem ser atualizados diretamente
    const { id: _id, org_id, created_at, created_by, ...updateData } = body

    const { data, error } = await admin
      .from('imoveis')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating imovel:', error)
      return NextResponse.json({ error: 'Erro ao atualizar imóvel' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('PATCH imovel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Excluir imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { id } = await params
    const admin = createServiceClient()

    const { error } = await admin
      .from('imoveis')
      .delete()
      .eq('id', id)
      .eq('org_id', membership.org_id)

    if (error) {
      console.error('Error deleting imovel:', error)
      return NextResponse.json({ error: 'Erro ao excluir imóvel' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE imovel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
