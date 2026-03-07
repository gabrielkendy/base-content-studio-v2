import { NextRequest, NextResponse } from 'next/server'

const domain =
  process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_DOMAIN
    ? `.${process.env.NEXT_PUBLIC_BASE_DOMAIN}`
    : undefined

function isSafeDestination(dest: string): boolean {
  if (dest.startsWith('/')) return true
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN
  if (!baseDomain) return false
  try {
    const url = new URL(dest)
    return url.hostname === baseDomain || url.hostname.endsWith(`.${baseDomain}`)
  } catch {
    return false
  }
}

/**
 * GET /api/auth/session-transfer?dest=<url>
 *
 * Copies all sb-* auth cookies from the request and re-sets them with the
 * shared `.agenciabase.tech` domain on the redirect response, enabling
 * cross-subdomain auth for already-logged-in users (e.g. "Ir para o App" CTA).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const dest = searchParams.get('dest') || '/'

  const safeUrl = isSafeDestination(dest)
    ? dest.startsWith('/')
      ? `${origin}${dest}`
      : dest
    : origin

  const response = NextResponse.redirect(safeUrl)

  if (domain) {
    request.cookies
      .getAll()
      .filter((c) => c.name.startsWith('sb-'))
      .forEach(({ name, value }) => {
        response.cookies.set({
          name,
          value,
          domain,
          path: '/',
          sameSite: 'lax',
          secure: true,
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 365,
        })
      })
  }

  return response
}
