import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Demo mode: bypass ALL auth checks, allow all routes - v2.0
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
