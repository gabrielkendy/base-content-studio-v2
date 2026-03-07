import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { getAppUrl, getAppPath } from '@/lib/get-app-url'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN

const domain =
  process.env.NODE_ENV === 'production' && BASE_DOMAIN
    ? `.${BASE_DOMAIN}`
    : undefined

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

/**
 * POST /api/auth/login
 *
 * Performs signInWithPassword server-side, captures the auth cookies Supabase
 * wants to set, and writes them directly on the JSON response with the shared
 * `.agenciabase.tech` domain so all subdomains can authenticate the user.
 *
 * Falls back to path-based routing when the request host is not the custom
 * domain (e.g. Vercel preview / canonical URL), so login works even without
 * DNS set up.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const capturedCookies: CookieToSet[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => capturedCookies.push(c as CookieToSet))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const admin = createServiceClient()
    const { data: memberData } = await admin
      .from('members')
      .select('role, org_id')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const role = memberData?.role || 'admin'
    const adminFlag = data.user.email ? isSystemAdmin(data.user.email) : false

    // Use subdomain URL only when on the custom domain — otherwise fall back to
    // path so the redirect works on Vercel canonical URL (before DNS is set up)
    const host = request.headers.get('host') || ''
    const onCustomDomain = BASE_DOMAIN && host.endsWith(BASE_DOMAIN)
    const dest = onCustomDomain ? getAppUrl(role, adminFlag) : getAppPath(role, adminFlag)

    const response = NextResponse.json({ role, dest, isSystemAdmin: adminFlag })

    // Set auth cookies directly on the response (reliable in Route Handlers)
    capturedCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, domain ? { ...options, domain } : options)
    })

    return response
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
