import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { fetchWithRetry } from '../../../utils/fetchWithRetry'

// URL для NFT-субграфа (denis)
const SUBGRAPH_URL = process.env.SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/111010/denis-3/v0.0.1'
const TTL = 120 // 2-минутное кэширование (≈ 30 запросов/ч)

// Кэш в памяти
const memoryCache: Record<string, { ts: number; data: string }> = {}

export async function POST(req: Request) {
  const body = await req.text()
  const cacheKey = crypto.createHash('sha1').update(body).digest('hex')

  const entry = memoryCache[cacheKey]
  const now = Date.now()
  if (entry && now - entry.ts < TTL * 1000) {
    return new NextResponse(entry.data, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-cache': 'HIT'
      }
    })
  }

  try {
    const sgRes = await fetchWithRetry(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body
    })
    
    const text = await sgRes.text()
    memoryCache[cacheKey] = { ts: now, data: text }
    
    return new NextResponse(text, {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-cache': 'MISS'
      }
    })
  } catch (error) {
    console.error('Subgraph API error:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch data from subgraph' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }
} 