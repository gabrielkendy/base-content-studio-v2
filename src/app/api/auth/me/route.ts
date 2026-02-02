import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Get user from cookies (anon key, validates JWT)
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // read-only in GET
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ user: null, member: null, org: null }, { status: 401 })
    }

    // 2. Get member + org using service_role (bypasses RLS)
    const admin = createServiceClient()
    
    const { data: memberData, error: memberError } = await admin
      .from('members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (memberError) {
      console.error('Member query error:', memberError.message)
      return NextResponse.json({ user, member: null, org: null, error: memberError.message })
    }

    // 3. Auto-create org if needed
    if (!memberData) {
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
      const slug = userName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + user.id.slice(0, 8)

      const { data: newOrg, error: orgError } = await admin
        .from('organizations')
        .insert({ name: userName + "'s Workspace", slug })
        .select()
        .single()

      if (orgError) {
        return NextResponse.json({ user, member: null, org: null, error: orgError.message })
      }

      const { data: newMember, error: memError } = await admin
        .from('members')
        .insert({
          user_id: user.id,
          org_id: newOrg.id,
          role: 'admin',
          display_name: userName,
          status: 'active'
        })
        .select('*, organizations(*)')
        .single()

      if (memError) {
        return NextResponse.json({ user, member: null, org: newOrg, error: memError.message })
      }

      return NextResponse.json({
        user,
        member: newMember,
        org: (newMember as any)?.organizations || newOrg,
      })
    }

    return NextResponse.json({
      user,
      member: memberData,
      org: (memberData as any)?.organizations || null,
    })
  } catch (err: any) {
    console.error('Auth /api/auth/me error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
