import { NextResponse } from 'next/server'
import { reminderActor, isFinanceSession } from '../../../../lib/server/ravi-os-auth'
import { fetchNzdInrRate } from '../../../../lib/server/fx-rate'

export async function GET() {
  if (await reminderActor() !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isFinanceSession()) return NextResponse.json({ error: 'Finance PIN required' }, { status: 401 })
  const result = await fetchNzdInrRate()
  if (!result) return NextResponse.json({ error: 'Could not fetch a live exchange rate right now. Try again shortly.' }, { status: 502 })
  return NextResponse.json({ pair: 'NZD_INR', rate: result.rate, asOf: result.asOf, fetchedAt: new Date().toISOString(), source: result.source })
}
