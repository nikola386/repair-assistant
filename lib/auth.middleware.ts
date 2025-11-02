import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from './auth'
import { logger, generateRequestId } from './logger'
import type { Session } from 'next-auth'

// Minimal auth config for middleware (Edge Runtime compatible)
// This doesn't include database-dependent code
// We use an empty providers array since middleware only needs to validate JWT tokens
// The actual authentication happens in the route handler which has full config
const middlewareAuthConfig: NextAuthConfig = {
  providers: [], // Empty - middleware doesn't need providers for JWT validation
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
  pages: {
    signIn: '/login',
  },
}

// For middleware, we create a minimal auth instance that just validates JWT tokens
// This works because JWT validation doesn't require database access
export const { auth: middlewareAuth } = NextAuth(middlewareAuthConfig)

/**
 * Authentication middleware helper for API routes
 * Validates authentication and returns session or error response
 * 
 * @param request - Next.js request object (used for logging)
 * @param context - Optional context object for logging (e.g., { ticketId: '123' })
 * @returns Object with either session (if authenticated) or response (if unauthorized)
 */
export async function withAuth(
  request: NextRequest,
  context?: Record<string, unknown>
): Promise<
  | { session: Session & { user: NonNullable<Session['user']> }; response: null }
  | { session: null; response: NextResponse }
> {
  const requestId = request.headers.get('X-Request-ID') || generateRequestId()
  
  const session = await requireAuth()
  if (!session) {
    logger.warn('Unauthorized access attempt', context || {}, requestId)
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return { session, response: null }
}

