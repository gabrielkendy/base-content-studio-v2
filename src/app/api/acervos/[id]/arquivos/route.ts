import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API para listar arquivos de um acervo
 * GET: Lista arquivos do acervo
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

// GET - Listar arquivos do acervo
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

    // Verificar se acervo pertence à org
    const { data: acervo } = await admin
      .from('acervos')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!acervo) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    // Buscar arquivos
    const { data: arquivos, error } = await admin
      .from('acervo_arquivos')
      .select('*')
      .eq('acervo_id', id)
      .order('ordem', { ascending: true })

    if (error) {
      console.error('Error fetching arquivos:', error)
      return NextResponse.json({ error: 'Erro ao buscar arquivos' }, { status: 500 })
    }

    return NextResponse.json({ 
      data: arquivos,
      _meta: {
        total: arquivos?.length || 0
      }
    })

  } catch (error: any) {
    console.error('List arquivos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
