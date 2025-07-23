import { NextResponse } from 'next/server';
import { cspMonitor } from '@/utils/csp-monitor';

export async function GET() {
  try {
    const stats = cspMonitor.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting CSP stats:', error);
    return NextResponse.json(
      { error: 'Failed to get CSP stats' },
      { status: 500 }
    );
  }
}
