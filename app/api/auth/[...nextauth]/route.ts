import { handlers } from '../../../../lib/auth.config'
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const { GET: originalGET, POST: originalPOST } = handlers

// Wrap POST handler to add rate limiting for login attempts
export async function POST(
  request: NextRequest,
  context?: { params: Promise<{ catchall: string[] }> }
) {
  // Rate limiting: 5 login attempts per IP per 15 minutes
  const rateLimitResponse = rateLimit(request, 5, 15 * 60 * 1000)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Call original POST handler
  const response = await originalPOST(request, context as any)
  
  // Add rate limit headers to response
  if (response) {
    const headers = getRateLimitHeaders(request, 5)
    const headersObj = new Headers(response.headers)
    Object.entries(headers).forEach(([key, value]) => {
      headersObj.set(key, value)
    })
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
    })
  }

  return response
}

export const { GET } = handlers

