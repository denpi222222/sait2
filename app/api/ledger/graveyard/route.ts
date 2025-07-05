import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const LEDGER_PATH = path.join(process.cwd(), 'data', 'ledger.json')

export async function GET() {
  try {
    const raw = await fs.readFile(LEDGER_PATH, 'utf8')
    const data = JSON.parse(raw) as { tokens: Record<string, { status: string }> }
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