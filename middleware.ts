import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Lightweight auth check using NextAuth session cookie
 * This avoids importing the full NextAuth library to keep middleware size small
 */
function hasValidSession(request: NextRequest): boolean {
  // NextAuth v5 stores session in authjs.session-token cookie
  // We check for the presence of the cookie as a lightweight check
  // Full validation happens in route handlers
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token')
  
  return !!sessionToken?.value
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  
  // Minimal logging using console (avoids importing logger)
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    requestId,
  }
  console.log(JSON.stringify({ ...logData, type: 'request-start' }))

  // Redirect authenticated users away from login/register pages
  const authPages = ['/login', '/register']
  const isAuthPage = authPages.includes(request.nextUrl.pathname)
  
  if (isAuthPage && hasValidSession(request)) {
    // Redirect to onboarding or dashboard (client-side will handle onboarding check)
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
  }

  // Protect all application routes
  const protectedPaths = ['/dashboard', '/tickets', '/clients', '/reports', '/settings', '/profile']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isProtectedPath) {
    if (!hasValidSession(request)) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      console.warn(JSON.stringify({
        ...logData,
        type: 'unauthorized',
        ip,
      }))
      // Redirect to login page in the same app
      const url = new URL('/login', request.nextUrl.origin)
      url.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // API routes are protected in their individual route handlers
  // The middleware provides an additional layer but the explicit checks in route handlers are the primary protection

  const response = NextResponse.next()
  const duration = Date.now() - startTime
  
  // Add request ID to response headers for tracing
  response.headers.set('X-Request-ID', requestId)
  
  // Log response
  console.log(JSON.stringify({
    ...logData,
    type: 'request-end',
    status: response.status,
    duration,
  }))

  return response
}

export const config = {
  // Match all routes that need logging
  // Exclude static files and Next.js internals
  matcher: [
    '/dashboard/:path*',
    '/tickets/:path*',
    '/clients/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/login',
    '/register',
    '/api/:path*',
  ],
}
