import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/olive-management',
  '/oil-management',
  '/api/farmers',
  '/api/boxes',
  '/api/sessions',
  '/api/dashboard'
]

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/login']

// Public routes that don't require authentication
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }

  // Fast auth check - just check if cookie exists
  const authCookie = request.cookies.get('auth-token')
  const hasAuthToken = !!authCookie?.value && authCookie.value.length > 0

  console.log(`🔍 Middleware: ${pathname} | Auth: ${hasAuthToken}`)

  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!hasAuthToken) {
      console.log(`🔒 Protected route ${pathname} - redirecting to login`)
      
      // For API routes, return JSON error instead of redirecting
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            message: 'Vous devez être connecté pour accéder à cette ressource'
          },
          { status: 401 }
        )
      }
      
      // For page routes, redirect to login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    console.log(`✅ Access granted to ${pathname}`)
  }

  // Handle auth routes (login page)
  if (authRoutes.includes(pathname)) {
    if (hasAuthToken) {
      console.log(`🔄 Already authenticated, redirecting to dashboard from ${pathname}`)
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    console.log(`📝 Showing login page at ${pathname}`)
  }

  // Handle root route
  if (pathname === '/') {
    if (hasAuthToken) {
      console.log(`🏠 Root redirect to dashboard (authenticated)`)
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    } else {
      console.log(`🏠 Root redirect to login (not authenticated)`)
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 