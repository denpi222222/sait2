import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting
const requests = new Map<string, { count: number; resetTime: number }>()

const STRICT_ENDPOINTS = ['/api/cra-token', '/api/market/prices']

function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, value] of requests.entries()) {
    if (now > value.resetTime) {
      requests.delete(key)
    }
  }
}

function checkRateLimit(ip: string, maxRequests = 100, windowMs = 60000) {
  cleanupOldEntries()
  
  const now = Date.now()
  const key = ip
  const current = requests.get(key)
  
  if (!current || now > current.resetTime) {
    requests.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs }
  }
  
  if (current.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: current.resetTime }
  }
  
  current.count++
  return { success: true, limit: maxRequests, remaining: maxRequests - current.count, reset: current.resetTime }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  let mainCheck = { success: true, limit: 100, remaining: 100, reset: Date.now() + 60000 }
  
  // Apply rate limiting only to API routes
  if (pathname.startsWith('/api')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '127.0.0.1'

    // Check rate limits
    const burstCheck = checkRateLimit(ip + ':burst', 20, 10000) // 20 requests per 10 seconds
    if (!burstCheck.success) {
      console.warn(`🚨 Burst rate limit exceeded from ${ip}`)
      const retryAfter = Math.ceil((burstCheck.reset - Date.now()) / 1000)
      return createRateLimitResponse('Too many requests in a short time. Please slow down.', retryAfter, burstCheck.limit)
    }

    mainCheck = checkRateLimit(ip, 100, 60000) // 100 requests per minute
    if (!mainCheck.success) {
      console.warn(`🚨 Main rate limit exceeded from ${ip}`)
      const retryAfter = Math.ceil((mainCheck.reset - Date.now()) / 1000)
      return createRateLimitResponse('Rate limit exceeded. Please try again later.', retryAfter, mainCheck.limit)
    }
    
    // Basic bot protection for critical endpoints
    if (STRICT_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
      const userAgent = req.headers.get('user-agent') || 'unknown'
      // Block requests without proper User-Agent
      if (!userAgent || userAgent === 'unknown' || userAgent.length < 10) {
        console.warn(`🚨 Blocked request without proper User-Agent from ${ip}`)
        return createRateLimitResponse('Missing or invalid User-Agent header', 60, mainCheck.limit)
      }
      
      // Block obvious bots
      const botPatterns = ['curl', 'wget', 'python-requests', 'bot', 'crawler', 'spider', 'scraper']
      if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
        console.warn(`🚨 Blocked bot request from ${ip}: ${userAgent}`)
        return createRateLimitResponse('Automated requests not allowed', 60, mainCheck.limit)
      }
    }
  }

  const response = NextResponse.next()
  
  // Set basic security headers (CSP handled by next.config.mjs)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CSP is now handled by next.config.mjs to avoid conflicts
  
  // Set correct rate limit headers for API routes
  if (pathname.startsWith('/api')) {
    response.headers.set('X-RateLimit-Limit', mainCheck.limit.toString())
    response.headers.set('X-RateLimit-Remaining', mainCheck.remaining.toString())
    response.headers.set('X-RateLimit-Reset', mainCheck.reset.toString())
  }
  
  return response
}

function createRateLimitResponse(message: string, retryAfter: number, limit: number) {
  return new NextResponse(
    JSON.stringify({ 
      error: 'Too Many Requests', 
      message,
      retryAfter,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0', // Remaining is 0 because the request was denied
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
