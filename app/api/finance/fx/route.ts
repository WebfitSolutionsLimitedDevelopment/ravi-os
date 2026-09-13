import { NextResponse } from 'next/server'
import { reminderActor, isFinanceSession } from '../../../../lib/server/ravi-os-auth'

// Live NZD -> INR conversion rate, fetched fresh on every call (the Finance
// page asks for this every time it loads) so the net worth dashboards and
// the New Zealand <-> India transfer calculation always use today's rate,
// never a hardcoded or stale one. Two independent free providers are tried
// in order since neither requires an API key and either can be briefly down.
const TIMEOUT_MS = 6000

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try { return await promise } finally { clearTimeout(timer) }
}

async function fromFrankfurter(): Promise<{ rate: number; asOf: string } | null> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=NZD&to=INR', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) return null
    const d = await r.json()
    const rate = Number(d?.rates?.INR)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return { rate, asOf: String(d?.date || '') }
  } catch { return null }
}

async function fromExchangerateHost(): Promise<{ rate: number; asOf: string } | null> {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/NZD', { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!r.ok) return null
    const d = await r.json()
    const rate = Number(d?.rates?.INR)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return { rate, asOf: String(d?.time_last_update_utc || '') }
  } catch { return null }
}

export async function GET() {
  if (await reminderActor() !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isFinanceSession()) return NextResponse.json({ error: 'Finance PIN required' }, { status: 401 })
  const primary = await withTimeout(fromFrankfurter())
  const result = primary || await withTimeout(fromExchangerateHost())
  if (!result) return NextResponse.json({ error: 'Could not fetch a live exchange rate right now. Try again shortly.' }, { status: 502 })
  return NextResponse.json({ pair: 'NZD_INR', rate: result.rate, asOf: result.asOf, fetchedAt: new Date().toISOString(), source: primary ? 'frankfurter.app' : 'open.er-api.com' })
}
