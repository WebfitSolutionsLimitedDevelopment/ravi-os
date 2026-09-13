// Recurring-charge detection, shared by the Finance page (the "Upcoming
// expenditure" board) and the finance advice endpoint (so the AI review can
// reason about what's about to hit an account, not just what already has).
//
// The idea: Ravi's actual complaint was "some things are debatable — every
// month, every fifteen days, weekly, whatever" and he wants to SEE that
// pattern instead of discovering a due date only when the money is already
// gone. Rather than asking him to configure bills, we learn them from the
// ledger itself — any merchant that has hit the same account on a roughly
// regular cadence gets projected forward to its next likely date and amount.

export type RecurringTx = { accountId: string; type: string; amount: number; currency: string; merchant: string; category: string; date: string; status: string }

export type Cadence = 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Irregular'

export type UpcomingCharge = {
  key: string
  merchant: string
  category: string
  accountId: string
  currency: string
  direction: 'expense' | 'income'
  cadence: Cadence
  occurrences: number
  lastDate: string
  lastAmount: number
  avgAmount: number
  predictedAmount: number
  nextDueDate: string
  daysUntil: number
  trend: 'rising' | 'falling' | 'steady'
  confidence: number
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Merchant text off a real statement often carries reference/transaction
// numbers that change every time ("AA INSURANCE 4639206 4748219") — strip
// digits and punctuation so the same recurring biller groups together
// instead of looking like a one-off every time its reference number ticks
// over.
function normalizeMerchant(merchant: string, category: string): string {
  const cleaned = String(merchant || '').toLowerCase().replace(/[0-9]+/g, ' ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || String(category || 'other').toLowerCase().trim()
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`)
  const db = Date.parse(`${b}T00:00:00Z`)
  return Math.round((db - da) / 86400000)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.round(days))
  return d.toISOString().slice(0, 10)
}

function classifyCadence(gapDays: number): Cadence {
  if (gapDays >= 5 && gapDays <= 9) return 'Weekly'
  if (gapDays >= 10 && gapDays <= 18) return 'Fortnightly'
  if (gapDays >= 24 && gapDays <= 35) return 'Monthly'
  if (gapDays >= 80 && gapDays <= 100) return 'Quarterly'
  if (gapDays >= 350 && gapDays <= 380) return 'Yearly'
  return 'Irregular'
}

export type DetectOptions = { todayStr: string; lookaheadDays?: number; graceDays?: number; minOccurrences?: number }

// Learns a recurring pattern per (account, merchant) from real ledger
// history and projects the next occurrence — this is deliberately NOT a
// configured "bills" list; it is only ever what the actual transaction
// history shows happening on a regular beat. A merchant with no consistent
// gap between hits (a one-off top-up, an irregular manual transfer) is
// correctly left out rather than guessed at.
export function detectUpcomingCharges(transactions: RecurringTx[], opts: DetectOptions): UpcomingCharge[] {
  const lookaheadDays = opts.lookaheadDays ?? 45
  const graceDays = opts.graceDays ?? 3
  const minOccurrences = opts.minOccurrences ?? 2
  const eligible = transactions.filter(t => t.status !== 'void' && ['expense', 'payment', 'income'].includes(t.type) && t.category !== 'Reconciliation' && !/reconcil/i.test(t.merchant || ''))

  const groups = new Map<string, RecurringTx[]>()
  for (const t of eligible) {
    const key = `${t.accountId || 'none'}|${normalizeMerchant(t.merchant, t.category)}`
    const arr = groups.get(key)
    if (arr) arr.push(t); else groups.set(key, [t])
  }

  const results: UpcomingCharge[] = []
  for (const [key, rows] of groups) {
    if (rows.length < minOccurrences) continue
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date))
    const gap = median(gaps)
    const cadence = classifyCadence(gap)
    if (cadence === 'Irregular') continue

    const last = sorted[sorted.length - 1]
    const nextDueDate = addDays(last.date, gap)
    const daysUntil = daysBetween(opts.todayStr, nextDueDate)
    if (daysUntil < -graceDays || daysUntil > lookaheadDays) continue

    const maxDeviation = gaps.length ? Math.max(...gaps.map(g => Math.abs(g - gap))) / Math.max(gap, 1) : 0
    const recentAmounts = sorted.slice(-4).map(r => r.amount)
    const avgAmount = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length
    const priorAmounts = sorted.slice(0, -1).slice(-3).map(r => r.amount)
    const priorAvg = priorAmounts.length ? priorAmounts.reduce((a, b) => a + b, 0) / priorAmounts.length : last.amount
    const trend: UpcomingCharge['trend'] = last.amount > priorAvg * 1.03 ? 'rising' : last.amount < priorAvg * 0.97 ? 'falling' : 'steady'

    const occurrenceScore = Math.min(sorted.length, 5) / 5
    const consistencyScore = 1 - Math.min(1, maxDeviation)
    const confidence = Math.round((occurrenceScore * 0.6 + consistencyScore * 0.4) * 100) / 100

    results.push({
      key,
      merchant: last.merchant || last.category || 'Recurring charge',
      category: last.category || 'Other',
      accountId: last.accountId || '',
      currency: last.currency || 'NZD',
      direction: last.type === 'income' ? 'income' : 'expense',
      cadence,
      occurrences: sorted.length,
      lastDate: last.date,
      lastAmount: last.amount,
      avgAmount: Math.round(avgAmount * 100) / 100,
      predictedAmount: Math.round(last.amount * 100) / 100,
      nextDueDate,
      daysUntil,
      trend,
      confidence,
    })
  }

  return results.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
}

// Per-currency outflow/inflow totals across the whole projected list — the
// headline figure that answers "how much do I need sitting there and by
// when", not just a list of line items.
export function upcomingTotals(charges: UpcomingCharge[]): Record<string, { expense: number; income: number }> {
  const totals: Record<string, { expense: number; income: number }> = {}
  for (const c of charges) {
    const t = totals[c.currency] || (totals[c.currency] = { expense: 0, income: 0 })
    if (c.direction === 'income') t.income += c.predictedAmount; else t.expense += c.predictedAmount
  }
  for (const k of Object.keys(totals)) { totals[k].expense = Math.round(totals[k].expense * 100) / 100; totals[k].income = Math.round(totals[k].income * 100) / 100 }
  return totals
}

// A rough "what will this account look like by then" projection: current
// balance minus everything expected to go out, plus everything expected to
// come in, up to (and including) a given horizon date — per account, so
// Ravi can see which account is about to run tight before it happens.
export function projectedAccountBalance(currentBalance: number, charges: UpcomingCharge[], accountId: string, horizonDate: string): number {
  const relevant = charges.filter(c => c.accountId === accountId && c.nextDueDate <= horizonDate)
  const delta = relevant.reduce((sum, c) => sum + (c.direction === 'income' ? c.predictedAmount : -c.predictedAmount), 0)
  return Math.round((currentBalance + delta) * 100) / 100
}
