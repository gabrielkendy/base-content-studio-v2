import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Retorna mapa { user_id: email } para todos os membros da org do usuário logado
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient()

    // Verifica que é admin/gestor
    const { data: requester } = await admin
      .from('members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!requester || !['admin', 'gestor'].includes(requester.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Busca todos os membros da org
    const { data: members } = await admin
      .from('members')
      .select('id, user_id')
      .eq('org_id', requester.org_id)
      .eq('status', 'active')

    if (!members?.length) return NextResponse.json({ emails: {} })

    // Busca email de cada membro via admin API
    const emailMap: Record<string, string> = {}
    await Promise.all(
      members.map(async (m) => {
        try {
          const { data } = await admin.auth.admin.getUserById(m.user_id)
          if (data?.user?.email) emailMap[m.user_id] = data.user.email
        } catch {}
      })
    )

    return NextResponse.json({ emails: emailMap })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
