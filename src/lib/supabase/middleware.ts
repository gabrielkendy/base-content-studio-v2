import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export interface SessionResult {
  supabaseResponse: NextResponse
  cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>
  user: { id: string; email?: string } | null
}

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({ request })
  const cookiesToSet: SessionResult['cookiesToSet'] = []
  const domain =
    process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_DOMAIN
      ? `.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
      : undefined

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(incoming) {
          incoming.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          incoming.forEach(({ name, value, options }) => {
            const opts = domain ? { ...options, domain } : options
            supabaseResponse.cookies.set(name, value, opts)
            cookiesToSet.push({ name, value, options: opts as Record<string, unknown> })
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, cookiesToSet, user }
}

export function applySessionCookies(
  response: NextResponse,
  cookies: SessionResult['cookiesToSet']
): NextResponse {
  cookies.forEach(({ name, value, options }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.cookies.set(name, value, options as any)
  })
  return response
}
