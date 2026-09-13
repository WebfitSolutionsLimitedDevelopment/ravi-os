// Live NZD -> INR conversion rate, fetched fresh on every call — shared by
// the Finance page's own /api/finance/fx endpoint and the finance advice
// endpoint (which needs a real rate to combine NZD + INR net worth for the
// AI review). Two independent free providers are tried in order since
// neither requires an API key and either can be briefly down.
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

export async function fetchNzdInrRate(): Promise<{ rate: number; asOf: string; source: string } | null> {
  const primary = await withTimeout(fromFrankfurter())
  const result = primary || await withTimeout(fromExchangerateHost())
  if (!result) return null
  return { rate: result.rate, asOf: result.asOf, source: primary ? 'frankfurter.app' : 'open.er-api.com' }
}
