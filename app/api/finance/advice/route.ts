import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../lib/server/finance-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'
import { fetchNzdInrRate } from '../../../../lib/server/fx-rate'
import { accountBalance, computeNetWorth, isDebtAccount, type CalcAccount } from '../../../../lib/finance-calc'
import { detectUpcomingCharges, upcomingTotals } from '../../../../lib/finance-recurring'

// Same reasoning as statement-extract: a full-picture AI review takes a real
// AI call plus several data fetches — give it room to finish inside Vercel's
// function instead of being killed and surfacing an opaque failure.
export const maxDuration = 60

function monthKey(d: string) { return d.slice(0, 7) }
function nzToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function monthsAgoKey(n: number) { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - n); return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit' }).format(d) }

// The Finance Controller review is only as good as the picture it's given —
// it needs to see the same four things the Finance page itself shows: the
// Ledger (actual cash flow), Accounts (what's owed / held right now, using
// the exact same statement-reconciled balance math as the UI), Statements
// (upcoming due dates, recommended payments, promo expiries it should flag),
// and Net worth (NZD + INR combined at today's rate). Anything less and it's
// just reading a partial ledger and guessing.
export async function POST() {
  if (await reminderActor() !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiEngineAvailable()) return NextResponse.json({ error: 'Finance Intelligence is not configured' }, { status: 503 })
  const [listRes, stmtRes, fx] = await Promise.all([financeAction('list'), financeAction('statement_list'), fetchNzdInrRate()])
  if (!listRes?.ok) return NextResponse.json({ error: 'Finance data unavailable' }, { status: 503 })
  const data = await listRes.json()
  const stmtData = stmtRes?.ok ? await stmtRes.json().catch(() => null) : null

  const accounts: CalcAccount[] = (data.accounts || []).filter((a: any) => a.active)
  const tx: any[] = (data.transactions || []).filter((x: any) => x.status !== 'void')
  const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit' }).format(new Date())
  const nzd = (x: any) => Number(x.baseAmountNzd ?? (x.currency === 'NZD' ? x.amount : 0) ?? 0)

  const month = tx.filter((x: any) => monthKey(String(x.date || '')) === currentMonth)
  const income = month.filter((x: any) => x.type === 'income').reduce((a: number, x: any) => a + nzd(x), 0)
  const expenses = month.filter((x: any) => ['expense', 'payment'].includes(x.type)).reduce((a: number, x: any) => a + nzd(x), 0)
  const byCategory: Record<string, number> = {}
  for (const x of month.filter((x: any) => ['expense', 'payment'].includes(x.type))) { byCategory[x.category || 'Other'] = (byCategory[x.category || 'Other'] || 0) + nzd(x) }
  const missingFx = month.filter((x: any) => x.currency !== 'NZD' && x.baseAmountNzd == null).length

  // Last 3 months of income/expense, so the reviewer can spot a trend rather
  // than judging a single snapshot in isolation.
  const trend = [2, 1, 0].map(n => {
    const key = monthsAgoKey(n)
    const rows = tx.filter((x: any) => monthKey(String(x.date || '')) === key)
    return { month: key, incomeNzd: rows.filter((x: any) => x.type === 'income').reduce((a: number, x: any) => a + nzd(x), 0), expensesNzd: rows.filter((x: any) => ['expense', 'payment'].includes(x.type)).reduce((a: number, x: any) => a + nzd(x), 0) }
  })

  // Every active account's real, statement-reconciled balance — exactly what
  // the Accounts and Net worth tabs show, not a re-derived approximation.
  const accountSummaries = accounts.map((a: any) => ({ name: a.name, type: a.type, currency: a.currency, balance: Math.round(accountBalance(a, tx) * 100) / 100, isDebt: isDebtAccount(a.type), balanceAsOf: a.balanceAsOf, includeInNetWorth: a.includeInNetWorth }))
  const netWorth = computeNetWorth(accounts, tx, fx?.rate ?? null)
  const today = nzToday()

  // Recurring bills learned from the ledger itself — same detector that
  // drives the Overview page's "Upcoming expenditure" board — so the review
  // can flag cash-flow timing (a cluster of bills landing before payday, a
  // trending-up utility) rather than only judging what already happened.
  const upcomingRaw = detectUpcomingCharges(tx, { todayStr: today })
  const upcomingCharges = upcomingRaw.map(c => ({ merchant: c.merchant, accountName: (accounts as any[]).find(a => a.id === c.accountId)?.name || '', cadence: c.cadence, nextDueDate: c.nextDueDate, daysUntil: c.daysUntil, predictedAmount: c.predictedAmount, currency: c.currency, direction: c.direction, trend: c.trend }))
  const upcomingTotalsByCcy = upcomingTotals(upcomingRaw)

  // Statements that actually matter for a forward-looking review: anything
  // with a payment due date, plus the most recent statement per account so
  // the reviewer knows what's currently owed even without a due date.
  const statements = (stmtData?.statements || []) as any[]
  const relevantStatements = statements
    .filter(s => s.documentType !== 'other')
    .slice(0, 12)
    .map(s => ({
      institution: s.institution, accountLabel: s.accountLabel, documentType: s.documentType,
      statementEnd: s.statementEnd, closingBalance: s.closingBalance, minimumDue: s.minimumDue,
      paymentDueDate: s.paymentDueDate, daysUntilDue: s.paymentDueDate ? Math.round((new Date(`${s.paymentDueDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000) : null,
      recommendedPayment: s.recommendedPayment, promoExpiring: (s.promoBalances || []).filter((p: any) => p.rateApplicableUntil).map((p: any) => ({ amountOwing: p.amountOwing, rateApplicableUntil: p.rateApplicableUntil })),
    }))

  const snapshot = {
    asOfDate: today,
    month: currentMonth, incomeNzd: income, expensesNzd: expenses, netNzd: income - expenses,
    transactionCount: month.length, missingFxCount: missingFx,
    topCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6),
    trend,
    accounts: accountSummaries,
    netWorth: { nzdTotal: Math.round(netWorth.nzdTotal * 100) / 100, inrTotal: Math.round(netWorth.inrTotal * 100) / 100, inrTotalInNzd: netWorth.inrTotalNzd == null ? null : Math.round(netWorth.inrTotalNzd * 100) / 100, combinedNzd: Math.round(netWorth.combined * 100) / 100, unconvertedAccounts: netWorth.unconverted, fxRate: fx ? { nzdToInr: fx.rate, asOf: fx.asOf } : null },
    statements: relevantStatements,
    upcomingCharges,
    upcomingTotalsNext45Days: upcomingTotalsByCcy,
  }
  const prompt = `You are the Finance Controller inside Ravi OS, Ravi's private personal finance system. Act like a rigorous accountant, management accountant, banker and financial planning assistant. You are given a full snapshot: the Ledger (this month's transactions plus a 3-month trend), every Account with its real current balance (statement-reconciled — "isDebt: true" accounts are amounts owed, not held), Net worth (New Zealand in NZD, India in INR, combined at today's live rate), every Statement on file with its due date, minimum/recommended payment and any 0%/promotional balance expiry, and upcomingCharges — recurring bills/income the system has learned directly from the ledger's own history (cadence, next expected date and amount, and whether the amount is trending up/down), with upcomingTotalsNext45Days as the headline outflow/inflow per currency. Cross-reference all of this — e.g. does the Ledger's spend match what the statements show is owed; is a payment due soon; is a 0% promo expiring; does net worth look right given the accounts; will a cluster of upcomingCharges land before enough funds are likely to be in that account, especially any account running close to zero or overdrawn; is any recurring charge trending up in a way worth investigating (like a rising utility bill). Focus on bookkeeping quality, cash-flow control, budgeting, payment discipline, reconciliation, and questions Ravi should investigate. Do not invent missing data and do not give definitive tax/legal/investment instructions. Return ONLY JSON: {"headline":"...","health":"good|watch|attention","observations":["..."],"actions":[{"title":"...","why":"...","priority":"high|medium|low"}],"controls":["..."],"questions":["..."]}. Be specific — name actual accounts, amounts and dates from the snapshot, not generic advice.`
  try {
    const { data: advice } = await aiJson<any>({ system: prompt, input: JSON.stringify(snapshot), maxTokens: 1400 })
    return NextResponse.json({ snapshot, advice })
  } catch (e) { return NextResponse.json({ snapshot, error: e instanceof Error ? e.message : 'Finance review failed' }, { status: 500 }) }
}
