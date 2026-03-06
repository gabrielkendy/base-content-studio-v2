import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient()

    // Look up aprovadores by user email to find their associated empresa
    const { data: aprovador } = await admin
      .from('aprovadores')
      .select('empresa_id')
      .eq('email', user.email)
      .eq('tipo', 'cliente')
      .eq('ativo', true)
      .maybeSingle()

    if (!aprovador?.empresa_id) {
      return NextResponse.json({ clienteId: null, clienteSlug: null, clienteNome: null })
    }

    const { data: cliente } = await admin
      .from('clientes')
      .select('id, nome, slug')
      .eq('id', aprovador.empresa_id)
      .single()

    return NextResponse.json({
      clienteId: aprovador.empresa_id,
      clienteSlug: cliente?.slug || null,
      clienteNome: cliente?.nome || null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('/api/portal/me error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
