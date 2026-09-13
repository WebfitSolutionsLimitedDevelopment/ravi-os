// Shared balance / net-worth math used by both the Finance page (client) and
// the finance advice endpoint (server), so "what Ravi sees on screen" and
// "what the AI review reasons about" can never quietly drift apart.

export type CalcAccount = { id: string; type: string; currency: string; openingBalance: number; balanceAsOf: string | null; includeInNetWorth: boolean; active: boolean }
export type CalcTx = { accountId: string; transferAccountId: string; type: string; amount: number; date: string; status: string; fxRateToNzd: number | null }

export function isDebtAccount(type: string) { return type === 'credit_card' || type === 'liability' }

// Once a statement has reconciled an account, openingBalance means "the
// balance AS OF balanceAsOf" (a bank's own reconciled closing figure — more
// reliable than anything summed from partial transaction history). Only
// transactions dated AFTER that checkpoint move the number further.
export function accountBalance(a: CalcAccount, transactions: CalcTx[]): number {
  const debt = isDebtAccount(a.type)
  const cutoff = a.balanceAsOf
  const signed = transactions.filter(t => t.status !== 'void' && (t.accountId === a.id || t.transferAccountId === a.id) && (!cutoff || t.date > cutoff)).reduce((sum, t) => {
    if (t.transferAccountId === a.id && t.type === 'transfer') return debt ? sum - t.amount : sum + t.amount
    if (t.accountId !== a.id) return sum
    if (debt) {
      if (t.type === 'expense' || t.type === 'liability') return sum + t.amount
      if (t.type === 'payment' || t.type === 'income' || t.type === 'asset' || t.type === 'adjustment' || t.type === 'transfer') return sum - t.amount
      return sum
    }
    if (t.type === 'income' || t.type === 'asset' || t.type === 'adjustment') return sum + t.amount
    if (t.type === 'expense' || t.type === 'payment' || t.type === 'liability' || t.type === 'transfer') return sum - t.amount
    return sum
  }, 0)
  return a.openingBalance + signed
}

export type NetWorthAccountRow<A extends CalcAccount> = { account: A; balance: number; debt: boolean; netBalance: number }
export type NetWorth<A extends CalcAccount> = {
  nzdAccounts: NetWorthAccountRow<A>[]; inrAccounts: NetWorthAccountRow<A>[]; otherAccounts: NetWorthAccountRow<A>[]
  nzdTotal: number; inrTotal: number; inrTotalNzd: number | null; combined: number; unconverted: number
  transferSuggestion: { fromNzToIndia: boolean; nzdAmount: number; inrAmount: number } | null
  hasAny: boolean
}

// Net worth: group accounts by currency (currency doubles as the country/
// region proxy — NZD accounts are the New Zealand dashboard, INR accounts
// are the India dashboard). Debt accounts (credit_card/liability) SUBTRACT
// from the totals since "amount owed" reduces what you actually have.
export function computeNetWorth<A extends CalcAccount>(accounts: A[], transactions: CalcTx[], nzdToInrRate: number | null): NetWorth<A> {
  const eligible = accounts.filter(a => a.active && a.includeInNetWorth)
  const nzdAccounts = eligible.filter(a => a.currency === 'NZD')
  const inrAccounts = eligible.filter(a => a.currency === 'INR')
  const otherAccounts = eligible.filter(a => a.currency !== 'NZD' && a.currency !== 'INR')
  const withBalances = (list: A[]): NetWorthAccountRow<A>[] => list.map(a => { const balance = accountBalance(a, transactions); const debt = isDebtAccount(a.type); return { account: a, balance, debt, netBalance: debt ? -balance : balance } })
  const nzdRows = withBalances(nzdAccounts), inrRows = withBalances(inrAccounts), otherRows = withBalances(otherAccounts)
  const nzdTotal = nzdRows.reduce((s, x) => s + x.netBalance, 0)
  const inrTotal = inrRows.reduce((s, x) => s + x.netBalance, 0)
  let combined = nzdTotal; let unconverted = 0
  const inrTotalNzd = nzdToInrRate ? inrTotal / nzdToInrRate : null
  if (inrTotalNzd != null) combined += inrTotalNzd; else if (inrAccounts.length > 0) unconverted += inrAccounts.length
  for (const row of otherRows) {
    const rateTx = [...transactions].reverse().find(t => t.accountId === row.account.id && t.fxRateToNzd)
    if (rateTx?.fxRateToNzd) combined += row.netBalance * rateTx.fxRateToNzd
    else unconverted += 1
  }
  let transferSuggestion: NetWorth<A>['transferSuggestion'] = null
  if (nzdToInrRate && (nzdAccounts.length > 0 || inrAccounts.length > 0)) {
    const diff = nzdTotal - (inrTotalNzd ?? 0)
    const nzdAmount = Math.abs(diff) / 2
    if (nzdAmount >= 1) transferSuggestion = { fromNzToIndia: diff > 0, nzdAmount, inrAmount: nzdAmount * nzdToInrRate }
  }
  return { nzdAccounts: nzdRows, inrAccounts: inrRows, otherAccounts: otherRows, nzdTotal, inrTotal, inrTotalNzd, combined, unconverted, transferSuggestion, hasAny: eligible.length > 0 }
}
