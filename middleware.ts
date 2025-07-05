import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Serverless-friendly rate limiter
// Does not use in-memory storage, works through heuristics and headers
const RATE_LIMIT = 10 // requests per window
const WINDOW_MS = 60000 // 1 minute
const STRICT_ENDPOINTS = ['/api/cra-token', '/api/market/prices'] // Highly protected endpoints

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Apply rate limiting only to API routes
  if (!pathname.startsWith('/api')) return NextResponse.next()

  // Get IP address
  const ip = req.headers.get('x-real-ip') || 
    req.headers.get('x-forwarded-for')?.split(',')[0] || 
    req.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const now = Date.now()
  
  // Simple heuristics: check request frequency through headers
  const lastRequestTime = req.headers.get('x-last-request-time')
  if (lastRequestTime) {
    const timeDiff = now - parseInt(lastRequestTime)
    if (timeDiff < 1000) { // Less than 1 second between requests
      console.warn(`🚨 Potential DoS detected from ${ip}: requests too frequent (${timeDiff}ms)`)
      return createRateLimitResponse('Requests too frequent. Please wait at least 1 second between requests.')
    }
  }
  
  // Additional protection for critical endpoints
  if (STRICT_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))) {
    // Block if no User-Agent (likely bot)
    if (!userAgent || userAgent === 'unknown' || userAgent.length < 10) {
      console.warn(`🚨 Blocked request without proper User-Agent from ${ip}`)
      return createRateLimitResponse('Missing or invalid User-Agent header')
    }
    
    // Block obvious bots
    const botPatterns = ['curl', 'wget', 'python-requests', 'bot', 'crawler', 'spider', 'scraper']
    if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
      console.warn(`🚨 Blocked bot request from ${ip}: ${userAgent}`)
      return createRateLimitResponse('Automated requests not allowed')
    }
  }
  
  // Add headers for tracking next request
  const response = NextResponse.next()
  response.headers.set('x-last-request-time', now.toString())
  response.headers.set('x-rate-limit-limit', RATE_LIMIT.toString())
  response.headers.set('x-client-ip', ip)
  
  return response
}

function createRateLimitResponse(message: string) {
  return new NextResponse(
    JSON.stringify({ 
      error: 'Rate limit exceeded', 
      message,
      retryAfter: 60,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Limit': RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  )
}

export const config = {
  matcher: ['/api/:path*'],
}
