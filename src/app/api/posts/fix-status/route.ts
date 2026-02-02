import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// One-time fix: link existing conteúdos to their solicitações and fix status
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()

  // Get membership
  const { data: membership } = await admin
    .from('members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  // Get all solicitações that are em_producao
  const { data: sols } = await admin
    .from('solicitacoes')
    .select('id, titulo, cliente_id, respondido_por')
    .eq('org_id', membership.org_id)
    .eq('status', 'em_producao')

  if (!sols?.length) return NextResponse.json({ fixed: 0, message: 'No solicitações em_producao' })

  let fixed = 0

  for (const sol of sols) {
    // Find conteúdo with same title + cliente that has no solicitacao_id
    const { data: conteudos } = await admin
      .from('conteudos')
      .select('id, status, solicitacao_id')
      .eq('empresa_id', sol.cliente_id)
      .eq('titulo', sol.titulo)
      .eq('org_id', membership.org_id)
      .limit(1)

    if (conteudos?.length) {
      const c = conteudos[0]
      const updates: Record<string, any> = { updated_at: new Date().toISOString() }

      // Link to solicitação if not linked
      if (!c.solicitacao_id) updates.solicitacao_id = sol.id

      // Fix status if still rascunho
      if (c.status === 'rascunho') updates.status = 'producao'

      if (Object.keys(updates).length > 1) {
        await admin.from('conteudos').update(updates).eq('id', c.id)
        fixed++
      }
    }
  }

  return NextResponse.json({ fixed, total: sols.length })
}
