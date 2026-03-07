import { type NextRequest, NextResponse } from 'next/server'
import { updateSession, applySessionCookies } from '@/lib/supabase/middleware'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN

function getSubdomain(hostname: string): 'app' | 'cliente' | 'admin' | 'studio' {
  if (!BASE_DOMAIN) {
    // Dev mode (localhost) – treat as 'app' so auth is enforced
    return 'app'
  }
  // Strip port if present
  const host = hostname.split(':')[0]
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) return 'studio'
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const sub = host.slice(0, -(BASE_DOMAIN.length + 1))
    if (sub === 'app') return 'app'
    if (sub === 'cliente') return 'cliente'
    if (sub === 'admin') return 'admin'
    if (sub === 'studio') return 'studio'
  }
  return 'studio'
}

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

function loginUrl(request: NextRequest): URL {
  if (BASE_DOMAIN) {
    return new URL(`https://studio.${BASE_DOMAIN}/login`)
  }
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return url
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always pass through: static assets, API routes, auth callbacks
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$/.test(pathname)
  ) {
    // Still need to refresh session for API routes
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // Refresh session and get current user
  const { supabaseResponse, cookiesToSet, user } = await updateSession(request)

  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  // Public paths always accessible (all subdomains)
  const isPublicPath =
    pathname === '/' ||
    [
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/aprovacao',
      '/entrega',
      '/pricing',
      '/contato',
      '/termos',
      '/privacidade',
    ].some((p) => pathname.startsWith(p))

  // ── STUDIO subdomain ─────────────────────────────────────────────
  // Landing page, login – no auth enforcement
  if (subdomain === 'studio') {
    return supabaseResponse
  }

  // ── Require auth for app / cliente / admin ────────────────────────
  if (!user && !isPublicPath) {
    return applySessionCookies(NextResponse.redirect(loginUrl(request)), cookiesToSet)
  }

  // Redirect logged-in users away from login page
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return applySessionCookies(NextResponse.redirect(url), cookiesToSet)
  }

  // ── APP subdomain ─────────────────────────────────────────────────
  if (subdomain === 'app') {
    // Redirect authenticated users at root to dashboard
    if (pathname === '/' && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/clientes'
      return applySessionCookies(NextResponse.redirect(url), cookiesToSet)
    }
    // Block portal routes on app subdomain
    if (pathname.startsWith('/portal')) {
      const url = request.nextUrl.clone()
      url.pathname = '/clientes'
      return applySessionCookies(NextResponse.redirect(url), cookiesToSet)
    }
    return supabaseResponse
  }

  // ── CLIENTE subdomain ─────────────────────────────────────────────
  if (subdomain === 'cliente') {
    // Rewrite paths to /portal/* unless already under /portal or /login/auth
    if (
      !pathname.startsWith('/portal') &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/auth')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? '/portal' : `/portal${pathname}`
      return applySessionCookies(NextResponse.rewrite(url), cookiesToSet)
    }
    return supabaseResponse
  }

  // ── ADMIN subdomain ───────────────────────────────────────────────
  if (subdomain === 'admin') {
    const adminCheck = user?.email ? isSystemAdmin(user.email) : false
    if (!adminCheck) {
      const dest = BASE_DOMAIN
        ? new URL(`https://app.${BASE_DOMAIN}`)
        : (() => {
            const u = request.nextUrl.clone()
            u.pathname = '/clientes'
            return u
          })()
      return applySessionCookies(NextResponse.redirect(dest), cookiesToSet)
    }
    // Rewrite paths to /admin/* unless already there
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/auth')) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`
      return applySessionCookies(NextResponse.rewrite(url), cookiesToSet)
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
