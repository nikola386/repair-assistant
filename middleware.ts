import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(6)
    crypto.getRandomValues(bytes)
    const randomStr = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 9)
    return `${Date.now()}-${randomStr}`
  }
  throw new Error('Secure random number generation is not available')
}

function hasValidSession(request: NextRequest): boolean {
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token')
  
  return !!sessionToken?.value
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    requestId,
  }

  const authPages = ['/login', '/register']
  const isAuthPage = authPages.includes(request.nextUrl.pathname)
  
  if (isAuthPage && hasValidSession(request)) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin))
  }

  const publicPages = ['/verify-email']
  const isPublicPage = publicPages.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isPublicPage) {
    return NextResponse.next()
  }

  const protectedPaths = ['/dashboard', '/tickets', '/clients', '/reports', '/settings']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isProtectedPath) {
    if (!hasValidSession(request)) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      console.warn(JSON.stringify({
        ...logData,
        type: 'unauthorized',
        ip,
      }))
      const url = new URL('/login', request.nextUrl.origin)
      url.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()
  const duration = Date.now() - startTime
  
  response.headers.set('X-Request-ID', requestId)
  

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tickets/:path*',
    '/clients/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/verify-email',
    '/verify-email/:path*',
    '/api/:path*',
  ],
}
