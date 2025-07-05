import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory sliding window per node instance (sufficient for small projects / edge)
// key: ip -> { count: number; ts: number }
const RATE_LIMIT = 10 // requests
const WINDOW_MS = 1000 // 1 second
const ipStore = new Map<string, { count: number; ts: number }>()

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/api')) return NextResponse.next()

  const ip = req.ip || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const entry = ipStore.get(ip) || { count: 0, ts: now }
  if (now - entry.ts < WINDOW_MS) {
    entry.count += 1
  } else {
    entry.count = 1
    entry.ts = now
  }
  ipStore.set(ip, entry)

  if (entry.count > RATE_LIMIT) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
} 