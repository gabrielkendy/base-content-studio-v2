import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { campanhaDuplicateSchema, validateCampanha } from '@/lib/validations/campanha'

type RouteContext = { params: Promise<{ id: string }> }

// =====================================================
// POST /api/campanhas/[id]/duplicate
// Duplica campanha para outro ano
// =====================================================
export async function POST(request: NextRequest, context: RouteContext) {
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
    const validation = validateCampanha(campanhaDuplicateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: validation.error,
        issues: validation.issues 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Buscar campanha original
    const { data: original, error: fetchError } = await admin
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Verificar membership
    const { data: member } = await admin
      .from('members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', original.org_id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (member.role === 'cliente') {
      return NextResponse.json({ error: 'Clientes não podem duplicar campanhas' }, { status: 403 })
    }

    // Criar cópia (excluir campos que não devem ser copiados)
    const { 
      id: _, 
      created_at, 
      updated_at, 
      slug,
      ...campanhaData 
    } = original

    const { data, error } = await admin
      .from('campanhas')
      .insert({
        ...campanhaData,
        ano: validation.data.novo_ano,
        nome: `${original.nome} (${validation.data.novo_ano})`,
        slug: null, // Trigger vai gerar novo
        status: 'planejada',
        progresso: 0,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao duplicar campanha:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/campanhas/[id]/duplicate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
