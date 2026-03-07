import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getAppUrl } from '@/lib/get-app-url'

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

const domain =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_DOMAIN
    ? `.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
    : undefined

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
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
              cookieStore.set(name, value, domain ? { ...options, domain } : options)
            })
          },
        },
      }
    )

    const next = searchParams.get('next')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Explicit next param (e.g. password recovery → /reset-password)
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Plan checkout flow takes priority
      if (plan && ['starter', 'pro', 'agency'].includes(plan)) {
        const admin = createServiceClient()
        const { data: member } = await admin
          .from('members')
          .select('org_id')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        if (member?.org_id) {
          return NextResponse.redirect(
            `${origin}/api/billing/checkout-redirect?plan=${plan}&interval=${interval}`
          )
        }
        return NextResponse.redirect(`${origin}/welcome?plan=${plan}&interval=${interval}`)
      }

      // Determine destination by role
      const admin = createServiceClient()
      const { data: memberData } = await admin
        .from('members')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      const role = memberData?.role || 'admin'
      const adminFlag = data.user.email ? isSystemAdmin(data.user.email) : false
      const dest = getAppUrl(role, adminFlag)

      // If dest is a full URL (production), redirect there
      // If it's a path (dev), resolve relative to origin
      const destUrl = dest.startsWith('http') ? dest : `${origin}${dest}`
      return NextResponse.redirect(destUrl)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
