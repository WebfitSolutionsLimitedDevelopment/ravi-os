import { NextResponse } from 'next/server'
// pdf-parse's own troubleshooting guide is explicit that 'pdf-parse/worker'
// (which supplies a real CanvasFactory via @napi-rs/canvas) must be imported
// BEFORE 'pdf-parse' itself, as a static top-level import — not a dynamic
// import() inside the handler — or pdf-parse's internal pdfjs-dist setup can
// run first and throw "DOMMatrix is not defined" on Vercel's serverless
// runtime. See next.config.mjs's serverExternalPackages for the other half
// of this fix.
import { CanvasFactory } from 'pdf-parse/worker'
import { PDFParse } from 'pdf-parse'
import { reminderActor, isFinanceSession } from '../../../../lib/server/ravi-os-auth'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

const DOC_TYPES = ['credit_card_statement', 'bank_statement', 'payslip', 'other']

function nzToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }
function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`), b = new Date(`${to}T00:00:00Z`)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) months -= 1
  return Math.max(0, months)
}

// The one piece of arithmetic this whole feature exists for: never let the
// AI do this math or trust an advertised rate as if it were a real charge.
// Everything here is computed deterministically from extracted facts.
function computeStatement(x: any) {
  const closingBalance = Number.isFinite(Number(x.closingBalance)) ? Number(x.closingBalance) : null
  const promoBalances = Array.isArray(x.promoBalances) ? x.promoBalances.filter((p: any) => p && Number.isFinite(Number(p.amountOwing))) : []
  const promoTotal = promoBalances.reduce((sum: number, p: any) => sum + Number(p.amountOwing || 0), 0)
  const ordinaryBalance = closingBalance != null ? Math.round((closingBalance - promoTotal) * 100) / 100 : null
  const today = nzToday()
  let recommendedPayment: number | null = null
  let recommendedPaymentNote = ''
  const notes: string[] = []
  if (ordinaryBalance != null) {
    let monthlyPromo = 0
    for (const p of promoBalances) {
      const expiry = String(p.rateApplicableUntil || '')
      const owing = Number(p.amountOwing || 0)
      if (!expiry || !owing) continue
      const monthsLeft = Math.max(1, monthsBetween(today, expiry) || 1)
      const perMonth = Math.ceil((owing / monthsLeft) * 100) / 100
      monthlyPromo += perMonth
      notes.push(`${p.label || 'Promotional balance'}: pay about $${perMonth.toFixed(2)}/month to clear the $${owing.toFixed(2)} owing before it stops being interest-free on ${expiry}.`)
    }
    recommendedPayment = Math.round((ordinaryBalance + monthlyPromo) * 100) / 100
    recommendedPaymentNote = [
      `Pay the full ordinary balance of $${ordinaryBalance.toFixed(2)} to avoid interest on normal purchases.`,
      ...notes,
    ].join(' ')
  }
  return { ordinaryBalance, recommendedPayment, recommendedPaymentNote }
}

export async function POST(request: Request) {
  const actor = await reminderActor()
  if (actor !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await isFinanceSession()) return NextResponse.json({ error: 'Finance PIN required' }, { status: 401 })
  if (!aiEngineAvailable()) return NextResponse.json({ error: 'AI document reading is not configured' }, { status: 503 })
  try {
    const body = await request.json().catch(() => ({}))
    const fileDataUrl = String(body.file || '')
    const isPdf = /^data:application\/pdf;base64,/.test(fileDataUrl)
    const isImage = /^data:image\//.test(fileDataUrl)
    if (!isPdf && !isImage) return NextResponse.json({ error: 'Upload a PDF or an image (JPG/PNG) of the statement or payslip' }, { status: 400 })

    const system = `You read financial documents for a personal finance tracker: credit card statements, bank statements or payslips. Return ONLY valid JSON with exactly these keys: documentType, institution, accountLabel, currency, statementStart, statementEnd, closingBalance, minimumDue, paymentDueDate, creditLimit, openingBalance, promoBalances, interestCharged, standardPurchaseRate, standardCashAdvanceRate, payslip, transactions, confidence.
Rules:
- documentType: one of "credit_card_statement","bank_statement","payslip","other" — pick the best match.
- institution: the bank/employer name (e.g. "ASB", "ANZ", "ICICI Bank").
- accountLabel: a short label identifying the account/card, e.g. "ASB Visa Light •••• 0946" (mask all but the last 4 digits of any card/account number — never return a full number).
- currency: 3-letter ISO currency code shown on the document.
- statementStart / statementEnd: the statement period as YYYY-MM-DD, empty string if not a statement.
- closingBalance: the closing/current balance owed on this statement, or null.
- minimumDue: the minimum payment due, or null.
- paymentDueDate: YYYY-MM-DD the payment is due, or empty string.
- creditLimit: the credit limit, or null.
- openingBalance: the balance carried in at the start of the period, or null.
- promoBalances: an array of any promotional / 0% / interest-free / "Smart Rate" / installment-plan purchase balances shown SEPARATELY from the main balance (these still count inside the closing balance, but the statement calls them out on their own line with their own rate and expiry). Each entry: {label, startDate, rate, rateApplicableUntil, purchaseAmount, amountOwing}, all as strings except purchaseAmount/amountOwing which are numbers. Return an empty array if there is no such section — do not invent one.
- interestCharged: a REAL interest charge that appears as an actual transaction/line-item on THIS statement's transaction list (e.g. "Interest Charged $12.40"). This is completely different from the advertised standard interest rate shown in the terms section — do NOT report a rate (like "13.50% p.a.") here, and do NOT estimate or calculate what interest "would" be. If there is no actual interest-charged line in the transaction list, return null.
- standardPurchaseRate / standardCashAdvanceRate: the advertised annual percentage rates for reference (numbers like 13.5, 22.95), or null. These are disclosures, not charges.
- payslip: if documentType is "payslip", {employer,payDate,grossPay,netPay} (payDate as YYYY-MM-DD, amounts as numbers), otherwise null.
- transactions: for a credit_card_statement or bank_statement ONLY (empty array for payslip/other), every individual line item you can see in the transaction list — every purchase, payment, deposit, withdrawal, fee. Each entry: {date (YYYY-MM-DD, use the statement's year if only day/month is printed), description (merchant or narration, short), amount (a positive number), direction ("debit" for money leaving the account — a purchase, a withdrawal, a fee — or "credit" for money coming in — a payment received, a deposit, a refund), category (your best short guess: "Groceries","Dining","Fuel","Transport","Shopping","Subscriptions","Utilities","Rent","Salary","Transfer","Card Payment","Fees","Interest","Other")}. List every line item you can find, in the order they appear, up to 60. Do not summarize or merge line items into totals — one entry per transaction line. Never invent a transaction that is not printed.
- confidence: 0 to 1 for the overall extraction.
- Never invent a field you cannot actually see on the document. Use null / empty string / empty array instead.`

    let aiResult
    if (isPdf) {
      const base64 = fileDataUrl.split(',')[1] || ''
      const buffer = Buffer.from(base64, 'base64')
      const parser = new PDFParse({ data: buffer, CanvasFactory })
      let parsed = null
      try { parsed = await parser.getText() } catch { parsed = null } finally { await parser.destroy().catch(() => {}) }
      const text = String(parsed?.text || '').slice(0, 20000)
      if (!text.trim()) return NextResponse.json({ error: "Could not read any text from that PDF — if it's a scanned image, try uploading it as a photo (JPG/PNG) instead." }, { status: 422 })
      aiResult = await aiJson<any>({ system, input: `Statement/document text extracted from the PDF:\n\n${text}`, maxTokens: 4000 })
    } else {
      aiResult = await aiJson<any>({ system, input: 'Read the attached financial document image.', imageDataUrl: fileDataUrl, maxTokens: 4000 })
    }

    const raw = aiResult.data || {}
    const documentType = DOC_TYPES.includes(raw.documentType) ? raw.documentType : 'other'
    const promoBalances = Array.isArray(raw.promoBalances) ? raw.promoBalances.map((p: any) => ({
      label: String(p.label || 'Promotional balance'),
      startDate: String(p.startDate || ''),
      rate: String(p.rate || ''),
      rateApplicableUntil: String(p.rateApplicableUntil || ''),
      purchaseAmount: Number(p.purchaseAmount || 0),
      amountOwing: Number(p.amountOwing || 0),
    })) : []
    const extracted = {
      documentType,
      institution: String(raw.institution || '').trim(),
      accountLabel: String(raw.accountLabel || '').trim(),
      currency: String(raw.currency || 'NZD').toUpperCase().slice(0, 3),
      statementStart: String(raw.statementStart || '') || null,
      statementEnd: String(raw.statementEnd || '') || null,
      closingBalance: raw.closingBalance == null ? null : Number(raw.closingBalance),
      minimumDue: raw.minimumDue == null ? null : Number(raw.minimumDue),
      paymentDueDate: String(raw.paymentDueDate || '') || null,
      creditLimit: raw.creditLimit == null ? null : Number(raw.creditLimit),
      openingBalance: raw.openingBalance == null ? null : Number(raw.openingBalance),
      promoBalances,
      interestCharged: raw.interestCharged == null ? null : Number(raw.interestCharged),
      standardPurchaseRate: raw.standardPurchaseRate == null ? null : Number(raw.standardPurchaseRate),
      standardCashAdvanceRate: raw.standardCashAdvanceRate == null ? null : Number(raw.standardCashAdvanceRate),
      payslip: documentType === 'payslip' && raw.payslip ? raw.payslip : null,
      confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0.6))),
    }
    const CATEGORIES = ['Groceries', 'Dining', 'Fuel', 'Transport', 'Shopping', 'Subscriptions', 'Utilities', 'Rent', 'Salary', 'Transfer', 'Card Payment', 'Fees', 'Interest', 'Other']
    let transactions = Array.isArray(raw.transactions) ? raw.transactions
      .filter((t: any) => t && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0)
      .slice(0, 60)
      .map((t: any) => ({
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) ? t.date : (extracted.statementEnd || ''),
        description: String(t.description || '').slice(0, 140) || 'Transaction',
        amount: Number(t.amount),
        direction: t.direction === 'credit' ? 'credit' : 'debit',
        category: CATEGORIES.includes(t.category) ? t.category : 'Other',
      })) : []
    // Payslips don't get an AI-extracted transaction list (there's only one
    // line that matters); synthesize the net-pay income entry ourselves from
    // the fields already extracted, so it flows into the ledger the same way.
    if (documentType === 'payslip' && extracted.payslip?.netPay) {
      transactions = [{
        date: extracted.payslip.payDate || extracted.statementEnd || '',
        description: `Salary — ${extracted.payslip.employer || extracted.institution || 'Employer'}`,
        amount: Number(extracted.payslip.netPay),
        direction: 'credit',
        category: 'Salary',
      }]
    }
    const computed = computeStatement(extracted)
    return NextResponse.json({ ...extracted, ...computed, transactions, engine: aiResult.engine, rawExtract: raw })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to read that document' }, { status: 500 })
  }
}
