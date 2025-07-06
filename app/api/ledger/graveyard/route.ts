import { NextResponse } from 'next/server'
import ledgerData from '@/data/ledger.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = ledgerData as { tokens: Record<string, { status: string }> }
    const tokens = Object.entries(data.tokens)
      .filter(([, v]) => v.status === 'BURNED')
      .map(([id]) => id)

    return NextResponse.json({ tokens }, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
      status: 200,
    })
  } catch (e: any) {
    console.error('/api/ledger/graveyard error', e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
} 