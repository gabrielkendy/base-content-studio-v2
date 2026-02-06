import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // First update the session
  const response = await updateSession(request)
  
  const { pathname } = request.nextUrl

  // Public routes that don't need auth check
  const publicRoutes = [
    '/login',
    '/signup', 
    '/forgot-password',
    '/reset-password',
    '/auth',
    '/api',
    '/aprovacao',
    '/entrega',
    '/pricing',
    '/contato',
    '/termos',
    '/privacidade',
  ]

  // Check if current path starts with any public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Landing page (/) - show landing for non-auth, redirect to dashboard for auth
  if (pathname === '/') {
    try {
      // Create client to check auth
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // No-op for middleware
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is logged in, redirect to dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/clientes'
        return NextResponse.redirect(url)
      }
      
      // Not logged in, show landing page
      return response
    } catch (err) {
      // Error checking auth, show landing
      return response
    }
  }

  // For other routes, just return the session response
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
