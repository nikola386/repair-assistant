import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter
 * In production, consider using Redis or a dedicated rate limiting service
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private readonly cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (e.g., IP address)
   * @param limit - Maximum number of requests
   * @param windowMs - Time window in milliseconds
   * @returns true if rate limited, false otherwise
   */
  isRateLimited(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      })
      return false
    }

    if (entry.count >= limit) {
      return true
    }

    entry.count++
    return false
  }

  /**
   * Get remaining requests
   */
  getRemaining(identifier: string, limit: number): number {
    const entry = this.store.get(identifier)
    if (!entry || entry.resetTime < Date.now()) {
      return limit
    }
    return Math.max(0, limit - entry.count)
  }

  /**
   * Get reset time in seconds
   */
  getResetTime(identifier: string): number | null {
    const entry = this.store.get(identifier)
    if (!entry || entry.resetTime < Date.now()) {
      return null
    }
    return Math.ceil((entry.resetTime - Date.now()) / 1000)
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

/**
 * Get client identifier from request (IP address)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (handles proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
  return ip
}

/**
 * Rate limit middleware
 * @param request - Next.js request
 * @param limit - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns NextResponse with rate limit error or null if allowed
 */
export function rateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number
): NextResponse | null {
  const identifier = getClientIdentifier(request)

  if (rateLimiter.isRateLimited(identifier, limit, windowMs)) {
    const resetTime = rateLimiter.getResetTime(identifier)
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: resetTime,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetTime?.toString() || '60',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime?.toString() || Math.ceil(Date.now() / 1000 + 60).toString(),
        },
      }
    )
  }

  // Add rate limit headers to successful requests
  const remaining = rateLimiter.getRemaining(identifier, limit)
  const resetTime = rateLimiter.getResetTime(identifier)
  
  // Note: Headers are added in the route handler response, not here
  return null
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  request: NextRequest,
  limit: number
): Record<string, string> {
  const identifier = getClientIdentifier(request)
  const remaining = rateLimiter.getRemaining(identifier, limit)
  const resetTime = rateLimiter.getResetTime(identifier)

  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime?.toString() || Math.ceil(Date.now() / 1000 + 60).toString(),
  }
}

