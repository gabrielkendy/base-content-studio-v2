import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || searchParams.get('redirect') || '/dashboard'
  const plan = searchParams.get('plan')
  const interval = searchParams.get('interval') || 'year'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      // Se tem um plano selecionado (vindo do signup), redirecionar para checkout
      if (plan && ['starter', 'pro', 'agency'].includes(plan)) {
        // Primeiro verificar se já tem organização
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', data.user.id)
          .single()

        if (member?.organization_id) {
          // Já tem org, redirecionar para checkout
          return NextResponse.redirect(
            `${origin}/api/billing/checkout-redirect?plan=${plan}&interval=${interval}`
          )
        } else {
          // Precisa criar org primeiro - vai para onboarding
          return NextResponse.redirect(`${origin}/welcome?plan=${plan}&interval=${interval}`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
