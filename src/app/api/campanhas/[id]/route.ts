import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { campanhaUpdateSchema, validateCampanha } from '@/lib/validations/campanha'

type RouteContext = { params: Promise<{ id: string }> }

// Helper para verificar acesso à campanha
async function checkCampanhaAccess(campanhaId: string, userId: string, requireWrite = false) {
  const admin = createServiceClient()

  // Buscar campanha com org_id
  const { data: campanha } = await admin
    .from('campanhas')
    .select('id, org_id')
    .eq('id', campanhaId)
    .single()

  if (!campanha) {
    return { error: 'Campanha não encontrada', status: 404 }
  }

  // Verificar membership
  const { data: member } = await admin
    .from('members')
    .select('id, role')
    .eq('user_id', userId)
    .eq('org_id', campanha.org_id)
    .eq('status', 'active')
    .single()

  if (!member) {
    return { error: 'Acesso negado', status: 403 }
  }

  // Se precisa de permissão de escrita, verificar se não é cliente
  if (requireWrite && member.role === 'cliente') {
    return { error: 'Sem permissão para esta ação', status: 403 }
  }

  return { campanha, member, admin }
}

// =====================================================
// GET /api/campanhas/[id]
// Busca campanha por ID
// =====================================================
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

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

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check access
    const access = await checkCampanhaAccess(id, user.id)
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    // Buscar campanha completa com stats
    const { data, error } = await access.admin
      .from('v_campanhas_stats')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar campanha:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('GET /api/campanhas/[id] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// PATCH /api/campanhas/[id]
// Atualiza campanha
// =====================================================
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

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

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check access (require write)
    const access = await checkCampanhaAccess(id, user.id, true)
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    // Parse body
    const body = await request.json()
    
    // Validate
    const validation = validateCampanha(campanhaUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error,
        issues: validation.issues 
      }, { status: 400 })
    }

    // Atualizar campanha
    const { data, error } = await access.admin
      .from('campanhas')
      .update({
        ...validation.data,
        updated_by: user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar campanha:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('PATCH /api/campanhas/[id] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// =====================================================
// DELETE /api/campanhas/[id]
// Deleta campanha
// =====================================================
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

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

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check access (require write)
    const access = await checkCampanhaAccess(id, user.id, true)
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    // Verificar se é admin ou gestor
    if (!['admin', 'gestor'].includes(access.member.role)) {
      return NextResponse.json({ error: 'Apenas admins e gestores podem deletar campanhas' }, { status: 403 })
    }

    // Deletar campanha
    const { error } = await access.admin
      .from('campanhas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar campanha:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/campanhas/[id] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
