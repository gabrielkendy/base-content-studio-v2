import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { campanhaStatusSchema, validateCampanha } from '@/lib/validations/campanha'

type RouteContext = { params: Promise<{ id: string }> }

// =====================================================
// PATCH /api/campanhas/[id]/status
// Atualiza apenas o status (e opcionalmente progresso)
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

    // Parse body
    const body = await request.json()
    
    // Validate
    const validation = validateCampanha(campanhaStatusSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error,
        issues: validation.issues 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar campanha
    const { data: campanha } = await admin
      .from('campanhas')
      .select('id, org_id, status')
      .eq('id', id)
      .single()

    if (!campanha) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', campanha.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (member.role === 'cliente') {
      return NextResponse.json({ error: 'Clientes não podem alterar status' }, { status: 403 })
    }

    // Preparar dados de atualização
    const updateData: any = {
      status: validation.data.status,
      updated_by: user.id,
    }

    // Se passou progresso, usar ele
    if (validation.data.progresso !== undefined) {
      updateData.progresso = validation.data.progresso
    }
    
    // Auto-completar progresso se status for concluída
    if (validation.data.status === 'concluida') {
      updateData.progresso = 100
    }

    // Atualizar
    const { data, error } = await admin
      .from('campanhas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('PATCH /api/campanhas/[id]/status error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
