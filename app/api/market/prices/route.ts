import { NextResponse } from 'next/server'
import { fetchMarketData } from '@/lib/market'

export const revalidate = 180 // seconds

export async function GET() {
  try {
    const data = await fetchMarketData()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=180' } })
  } catch (e: any) {
    // If prices are unavailable, return "empty" response so frontend doesn't crash
    return NextResponse.json({ floorApe: null, craUsd: null, apeUsd: null, floorCra: null, error: e.message })
  }
} 