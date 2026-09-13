'use client'

import Link from 'next/link'
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowLeftRight, Banknote, BellRing, BrainCircuit, Building2, CalendarClock, CheckCircle2, CircleDollarSign, Coins, CreditCard, FileText, Globe2, IndianRupee, Landmark, Loader2, Mic, MicOff, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Upload, WalletCards } from 'lucide-react'
import styles from './finance.module.css'
import FinanceLockGate from '../../components/finance-lock-gate'
import { extractStatement, StatementExtract } from '../../lib/finance-statement-client'

type Account={id:string;name:string;type:string;institution:string;currency:string;openingBalance:number;includeInNetWorth:boolean;active:boolean;notes:string}
type Tx={id:string;accountId:string;transferAccountId:string;type:string;amount:number;currency:string;baseAmountNzd:number|null;fxRateToNzd:number|null;category:string;merchant:string;date:string;notes:string;source:string;status:string;confidence:number;riskLevel:string;createdAt:string}
type Advice={headline:string;health:'good'|'watch'|'attention';observations:string[];actions:{title:string;why:string;priority:string}[];controls:string[];questions:string[]}
type Statement={id:string;accountId:string;documentType:string;institution:string;accountLabel:string;currency:string;statementStart:string|null;statementEnd:string|null;closingBalance:number|null;minimumDue:number|null;paymentDueDate:string|null;creditLimit:number|null;openingBalance:number|null;promoBalances:{label:string;startDate:string;rate:string;rateApplicableUntil:string;purchaseAmount:number;amountOwing:number}[];ordinaryBalance:number|null;interestCharged:number|null;standardPurchaseRate:number|null;standardCashAdvanceRate:number|null;recommendedPayment:number|null;recommendedPaymentNote:string;reminderId:string|null;source:string;confidence:number;createdAt:string}
type FxRate={pair:string;rate:number;asOf:string;fetchedAt:string;source:string}

type Draft={type:string;amount:string;currency:string;category:string;merchant:string;date:string;notes:string;accountId:string;baseAmountNzd:string;source:'manual'|'voice'}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const emptyDraft=():Draft=>({type:'expense',amount:'',currency:'NZD',category:'Other',merchant:'',date:today(),notes:'',accountId:'',baseAmountNzd:'',source:'manual'})
const money=(n:number,c='NZD')=>new Intl.NumberFormat('en-NZ',{style:'currency',currency:c,maximumFractionDigits:2}).format(n||0)
const moneyOrDash=(n:number|null,c='NZD')=>n==null?'—':money(n,c)
function daysUntil(dateStr:string){const d=new Date(`${dateStr}T00:00:00Z`);if(isNaN(d.getTime()))return null;const now=new Date(`${today()}T00:00:00Z`);return Math.round((d.getTime()-now.getTime())/86400000)}

export default function FinancePage(){
  return <FinanceLockGate><FinancePageInner/></FinanceLockGate>
}

function FinancePageInner(){
  const[accounts,setAccounts]=useState<Account[]>([]);const[transactions,setTransactions]=useState<Tx[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
  const[tab,setTab]=useState<'overview'|'ledger'|'accounts'|'statements'|'networth'>('overview');const[formOpen,setFormOpen]=useState(false);const[draft,setDraft]=useState<Draft>(emptyDraft());const[saving,setSaving]=useState(false)
  const[accountOpen,setAccountOpen]=useState(false);const[accountName,setAccountName]=useState('');const[accountType,setAccountType]=useState('bank');const[accountCurrency,setAccountCurrency]=useState('NZD');const[institution,setInstitution]=useState('')
  const[listening,setListening]=useState(false);const[voiceText,setVoiceText]=useState('');const[voiceMessage,setVoiceMessage]=useState('');const[advice,setAdvice]=useState<Advice|null>(null);const[reviewing,setReviewing]=useState(false)

  const[statements,setStatements]=useState<Statement[]>([]);const[statementsLoading,setStatementsLoading]=useState(true);const[extracting,setExtracting]=useState(false);const[extractError,setExtractError]=useState('');const[preview,setPreview]=useState<StatementExtract|null>(null);const[savingStatement,setSavingStatement]=useState(false);const[saveNotice,setSaveNotice]=useState('')
  const fileInputRef=useRef<HTMLInputElement>(null)
  const[fx,setFx]=useState<FxRate|null>(null);const[fxLoading,setFxLoading]=useState(true);const[fxError,setFxError]=useState('');const[convertNzd,setConvertNzd]=useState('100')

  const load=async()=>{setLoading(true);try{const r=await fetch('/api/finance',{cache:'no-store'});if(!r.ok)throw new Error('Finance data could not be loaded');const d=await r.json();setAccounts(d.accounts||[]);setTransactions(d.transactions||[]);setError('')}catch(e){setError(e instanceof Error?e.message:'Finance data could not be loaded')}finally{setLoading(false)}}
  const loadStatements=async()=>{setStatementsLoading(true);try{const r=await fetch('/api/finance/statements',{cache:'no-store'});if(!r.ok)throw new Error('Statement history could not be loaded');const d=await r.json();setStatements(d.statements||[])}catch(e){setExtractError(e instanceof Error?e.message:'Statement history could not be loaded')}finally{setStatementsLoading(false)}}
  // Fetched fresh every time Ravi opens Finance, not cached from a previous
  // visit — so the New Zealand <-> India conversion is always today's rate.
  const loadFx=async()=>{setFxLoading(true);setFxError('');try{const r=await fetch('/api/finance/fx',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not fetch a live exchange rate');setFx(d)}catch(e){setFxError(e instanceof Error?e.message:'Could not fetch a live exchange rate')}finally{setFxLoading(false)}}
  useEffect(()=>{load();loadStatements();loadFx()},[])

  const currentMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit'}).format(new Date())
  const metrics=useMemo(()=>{const rows=transactions.filter(t=>t.status!=='void'&&t.date.startsWith(currentMonth));const nzd=(t:Tx)=>t.baseAmountNzd??(t.currency==='NZD'?t.amount:0);const income=rows.filter(t=>t.type==='income').reduce((a,t)=>a+nzd(t),0);const expense=rows.filter(t=>t.type==='expense'||t.type==='payment').reduce((a,t)=>a+nzd(t),0);const missingFx=rows.filter(t=>t.currency!=='NZD'&&t.baseAmountNzd==null).length;return{income,expense,net:income-expense,count:rows.length,missingFx}},[transactions,currentMonth])
  const categories=useMemo(()=>{const m=new Map<string,number>();for(const t of transactions.filter(t=>t.date.startsWith(currentMonth)&&(t.type==='expense'||t.type==='payment'))){const v=t.baseAmountNzd??(t.currency==='NZD'?t.amount:0);m.set(t.category,(m.get(t.category)||0)+v)}return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6)},[transactions,currentMonth])

  // Net worth: group accounts by currency (currency doubles as the country/
  // region proxy — NZD accounts are the New Zealand dashboard, INR accounts
  // are the India dashboard) and roll each account's opening balance forward
  // by its own transactions, in that account's own currency.
  // For credit_card/liability accounts the tracked number is "amount owed" —
  // a purchase (expense) INCREASES what's owed, while a payment (or income/
  // asset/adjustment posted against the card) DECREASES it. That's the
  // opposite of a bank-like account, where income/asset/adjustment increase
  // the balance and expense/payment/liability/transfer reduce it.
  function isDebtAccount(a:Account){return a.type==='credit_card'||a.type==='liability'}
  function accountBalance(a:Account){
    const debt=isDebtAccount(a)
    const signed=transactions.filter(t=>t.status!=='void'&&(t.accountId===a.id||t.transferAccountId===a.id)).reduce((sum,t)=>{
      if(t.transferAccountId===a.id&&t.type==='transfer')return debt?sum-t.amount:sum+t.amount
      if(t.accountId!==a.id)return sum
      if(debt){
        if(t.type==='expense'||t.type==='liability')return sum+t.amount
        if(t.type==='payment'||t.type==='income'||t.type==='asset'||t.type==='adjustment'||t.type==='transfer')return sum-t.amount
        return sum
      }
      if(t.type==='income'||t.type==='asset'||t.type==='adjustment')return sum+t.amount
      if(t.type==='expense'||t.type==='payment'||t.type==='liability'||t.type==='transfer')return sum-t.amount
      return sum
    },0)
    return a.openingBalance+signed
  }
  const netWorth=useMemo(()=>{
    const eligible=accounts.filter(a=>a.active&&a.includeInNetWorth)
    const nzdAccounts=eligible.filter(a=>a.currency==='NZD')
    const inrAccounts=eligible.filter(a=>a.currency==='INR')
    const otherAccounts=eligible.filter(a=>a.currency!=='NZD'&&a.currency!=='INR')
    // balance is always a positive "amount owed" for debt accounts; netBalance
    // is what actually counts toward net worth (debt subtracts).
    const withBalances=(list:Account[])=>list.map(a=>{const balance=accountBalance(a);const debt=isDebtAccount(a);return{account:a,balance,debt,netBalance:debt?-balance:balance}})
    const nzdTotal=withBalances(nzdAccounts).reduce((s,x)=>s+x.netBalance,0)
    const inrTotal=withBalances(inrAccounts).reduce((s,x)=>s+x.netBalance,0)
    // Combined total in NZD: NZD accounts count directly. INR accounts convert
    // using today's live NZD->INR rate (fetched fresh every visit) when it's
    // available; any other currency falls back to the most recent fxRateToNzd
    // seen on one of its transactions, and is flagged as unconverted if there
    // is neither a live rate nor a recorded one — never silently mis-added.
    let combined=nzdTotal;let unconverted=0
    const inrTotalNzd=fx?.rate?inrTotal/fx.rate:null
    if(inrTotalNzd!=null)combined+=inrTotalNzd;else if(inrAccounts.length>0)unconverted+=inrAccounts.length
    for(const a of otherAccounts){
      const netBalance=isDebtAccount(a)?-accountBalance(a):accountBalance(a)
      const rateTx=[...transactions].reverse().find(t=>t.accountId===a.id&&t.fxRateToNzd)
      if(rateTx?.fxRateToNzd)combined+=netBalance*rateTx.fxRateToNzd
      else unconverted+=1
    }
    // How much would need to move from one country to the other, in NZD
    // terms, for both dashboards to hold equal value at today's rate.
    let transferSuggestion:{fromNzToIndia:boolean;nzdAmount:number;inrAmount:number}|null=null
    if(fx?.rate&&(nzdAccounts.length>0||inrAccounts.length>0)){
      const diff=nzdTotal-(inrTotalNzd??0)
      const nzdAmount=Math.abs(diff)/2
      if(nzdAmount>=1)transferSuggestion={fromNzToIndia:diff>0,nzdAmount,inrAmount:nzdAmount*fx.rate}
    }
    return{nzdAccounts:withBalances(nzdAccounts),inrAccounts:withBalances(inrAccounts),otherAccounts:withBalances(otherAccounts),nzdTotal,inrTotal,inrTotalNzd,combined,unconverted,transferSuggestion,hasAny:eligible.length>0}
  },[accounts,transactions,fx])

  async function saveTx(e:FormEvent){e.preventDefault();const amount=Number(draft.amount);if(!(amount>=0))return;setSaving(true);try{const body:any={kind:'transaction',type:draft.type,amount,currency:draft.currency.toUpperCase(),category:draft.category||'Other',merchant:draft.merchant,date:draft.date,notes:draft.notes,accountId:draft.accountId||undefined,source:draft.source,confidence:draft.source==='voice'?0.85:1,riskLevel:'low'};if(draft.currency==='NZD')body.baseAmountNzd=amount;else if(draft.baseAmountNzd)body.baseAmountNzd=Number(draft.baseAmountNzd);const r=await fetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Could not save transaction');setDraft(emptyDraft());setFormOpen(false);await load()}catch(e){setVoiceMessage(e instanceof Error?e.message:'Could not save transaction')}finally{setSaving(false)}}
  async function addAccount(e:FormEvent){e.preventDefault();if(!accountName.trim())return;setSaving(true);try{const r=await fetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'account',name:accountName.trim(),type:accountType,currency:accountCurrency.toUpperCase(),institution})});if(!r.ok)throw new Error('Could not add account');setAccountName('');setInstitution('');setAccountOpen(false);await load()}finally{setSaving(false)}}
  async function removeTx(id:string){if(!confirm('Remove this transaction from the active ledger?'))return;const r=await fetch(`/api/finance/transactions/${id}`,{method:'DELETE'});if(r.ok)await load()}

  async function interpret(text:string){setVoiceMessage('Understanding…');try{const r=await fetch('/api/intelligence/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,source:'voice'})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not understand that');if(d.domain==='finance'&&d.intent==='add_finance_transaction'){const p=d.payload||{};setDraft({type:p.type||'expense',amount:p.amount==null?'':String(p.amount),currency:p.currency||'NZD',category:p.category||'Other',merchant:p.merchant||'',date:p.date||today(),notes:p.notes||'',accountId:'',baseAmountNzd:'',source:'voice'});setFormOpen(true);setVoiceMessage(`${Math.round((d.confidence||0)*100)}% confident. Review before saving.`)}else setVoiceMessage(d.summary||'I understood the command, but it belongs in another Ravi OS area.')}catch(e){setVoiceMessage(e instanceof Error?e.message:'Voice interpretation failed')}}
  function startVoice(){const W=window as any;const SR=W.SpeechRecognition||W.webkitSpeechRecognition;if(!SR){setVoiceMessage('Speech recognition is not available in this browser. Type the transaction instead.');return}const r=new SR();r.lang='en-NZ';r.interimResults=false;r.continuous=false;r.onstart=()=>{setListening(true);setVoiceMessage('Listening…')};r.onend=()=>setListening(false);r.onerror=()=>{setListening(false);setVoiceMessage('I could not hear that clearly. Try again.')};r.onresult=(e:any)=>{const text=String(e.results?.[0]?.[0]?.transcript||'').trim();setVoiceText(text);if(text)interpret(text)};r.start()}
  async function review(){setReviewing(true);try{const r=await fetch('/api/finance/advice',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Review unavailable');setAdvice(d.advice)}catch(e){setVoiceMessage(e instanceof Error?e.message:'Review unavailable')}finally{setReviewing(false)}}

  async function pickFile(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(fileInputRef.current)fileInputRef.current.value=''
    if(!file)return
    setExtractError('');setPreview(null);setExtracting(true)
    try{const result=await extractStatement(file);setPreview(result)}
    catch(err){setExtractError(err instanceof Error?err.message:'Could not read that document')}
    finally{setExtracting(false)}
  }
  function updatePreview(patch:Partial<StatementExtract>){setPreview(p=>p?{...p,...patch}:p)}
  async function saveStatement(){
    if(!preview)return
    setSavingStatement(true);setExtractError('');setSaveNotice('')
    try{
      const body={documentType:preview.documentType,institution:preview.institution,accountLabel:preview.accountLabel,currency:preview.currency,statementStart:preview.statementStart,statementEnd:preview.statementEnd,closingBalance:preview.closingBalance,minimumDue:preview.minimumDue,paymentDueDate:preview.paymentDueDate,creditLimit:preview.creditLimit,openingBalance:preview.openingBalance,promoBalances:preview.promoBalances,ordinaryBalance:preview.ordinaryBalance,interestCharged:preview.interestCharged,standardPurchaseRate:preview.standardPurchaseRate,standardCashAdvanceRate:preview.standardCashAdvanceRate,recommendedPayment:preview.recommendedPayment,recommendedPaymentNote:preview.recommendedPaymentNote,rawExtract:preview.rawExtract||{},confidence:preview.confidence,source:'upload',transactions:preview.transactions||[]}
      const r=await fetch('/api/finance/statements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const d=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(d.error||'Could not save this statement')
      setPreview(null)
      // Same statement already on file — nothing new was created, so say so
      // instead of implying a fresh account/ledger entry just got made.
      if(d.duplicate){setSaveNotice('Already in your history — this exact statement was uploaded before, so nothing new was saved.')}
      else{
        const parts:string[]=[]
        if(d.newAccountCreated)parts.push('a new account was created and linked')
        else if(d.accountId)parts.push('matched to your existing account')
        if(d.transactionsImported)parts.push(`${d.transactionsImported} transaction${d.transactionsImported===1?'':'s'} imported into the ledger`)
        setSaveNotice(parts.length?`Saved — ${parts.join(' and ')}.`:'Saved to your statement history.')
      }
      await Promise.all([loadStatements(),load()])
    }catch(err){setExtractError(err instanceof Error?err.message:'Could not save this statement')}
    finally{setSavingStatement(false)}
  }
  async function removeStatement(s:Statement){if(!confirm('Remove this statement from your finance history?'))return;const r=await fetch(`/api/finance/statements/${s.id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({reminderId:s.reminderId||undefined})});if(r.ok)await loadStatements()}

  return <main className={styles.shell}>
    <header className={styles.header}><Link href='/'><ArrowLeft/>Ravi OS</Link><div><p>FINANCE CONTROL CENTRE</p><h1>Know where the money is going.</h1><span>Records, controls, calculations and governed financial intelligence.</span></div><span className={styles.private}><ShieldCheck/>Ravi only</span></header>

    <section className={styles.voice}><button className={listening?styles.listening:''} onClick={startVoice}>{listening?<MicOff/>:<Mic/>}<span><b>{listening?'Listening…':'Speak a transaction'}</b><small>“Spent 46 dollars on groceries at Countdown today.”</small></span></button><div><Sparkles/><span><b>Ravi Finance Intelligence</b><small>{voiceMessage||'Voice entries are interpreted first. Nothing financial is posted without your review.'}</small>{voiceText&&<em>“{voiceText}”</em>}</span></div></section>

    <section className={styles.metrics}><div><CircleDollarSign/><span><small>THIS MONTH INCOME</small><b>{money(metrics.income)}</b></span></div><div><CreditCard/><span><small>THIS MONTH SPEND</small><b>{money(metrics.expense)}</b></span></div><div className={metrics.net<0?styles.negative:''}><Banknote/><span><small>NET CASH FLOW</small><b>{money(metrics.net)}</b></span></div><div><RefreshCw/><span><small>RECORD QUALITY</small><b>{metrics.missingFx?`${metrics.missingFx} FX gap${metrics.missingFx>1?'s':''}`:'Ready'}</b></span></div></section>

    <nav className={styles.tabs}><button className={tab==='overview'?styles.active:''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='ledger'?styles.active:''} onClick={()=>setTab('ledger')}>Ledger</button><button className={tab==='accounts'?styles.active:''} onClick={()=>setTab('accounts')}>Accounts</button><button className={tab==='statements'?styles.active:''} onClick={()=>setTab('statements')}>Statements</button><button className={tab==='networth'?styles.active:''} onClick={()=>setTab('networth')}>Net worth</button></nav>

    {error&&<div className={styles.error}>{error}</div>}
    {tab==='overview'&&<div className={styles.grid}>
      <section className={styles.card}><div className={styles.cardHead}><div><p>CONTROLLER</p><h2>Intelligent review</h2></div><button onClick={review} disabled={reviewing}><BrainCircuit/>{reviewing?'Reviewing…':'Review finances'}</button></div>{!advice?<div className={styles.empty}><BrainCircuit/><b>Run a finance review</b><span>Ravi OS will analyse bookkeeping quality, cash flow, controls and next actions from your actual ledger.</span></div>:<div className={styles.advice}><div className={`${styles.health} ${styles[advice.health]}`}>{advice.health.toUpperCase()}</div><h3>{advice.headline}</h3>{advice.observations?.map((x,i)=><p key={i}>{x}</p>)}<h4>Recommended actions</h4>{advice.actions?.map((x,i)=><div className={styles.action} key={i}><b>{x.title}</b><span>{x.why}</span><em>{x.priority}</em></div>)}</div>}</section>
      <section className={styles.card}><div className={styles.cardHead}><div><p>SPENDING</p><h2>Top categories this month</h2></div><WalletCards/></div>{categories.length===0?<div className={styles.empty}><WalletCards/><b>No spending recorded</b><span>Add transactions manually or by voice.</span></div>:<div className={styles.categories}>{categories.map(([name,value])=><div key={name}><span><b>{name}</b><small>{money(value)}</small></span><i style={{width:`${Math.max(6,(value/(categories[0]?.[1]||1))*100)}%`}}/></div>)}</div>}</section>
      <section className={styles.card}><div className={styles.cardHead}><div><p>CONTROL RULES</p><h2>What Ravi OS checks</h2></div><ShieldCheck/></div><div className={styles.controls}><span>✓ Foreign-currency entries without NZD conversion</span><span>✓ Monthly income vs spend and negative cash flow</span><span>✓ Uncategorized / low-confidence entries</span><span>✓ Review-before-post for AI and voice capture</span><span>✓ High-risk financial actions require approval</span><span>✓ 0% promotional balances kept separate from interest-bearing balances</span></div></section>
    </div>}

    {tab==='ledger'&&<section className={styles.card}><div className={styles.cardHead}><div><p>LEDGER</p><h2>Transactions</h2></div><button onClick={()=>{setDraft(emptyDraft());setFormOpen(v=>!v)}}><Plus/>Add</button></div>{formOpen&&<form className={styles.form} onSubmit={saveTx}><div className={styles.row3}><label>Type<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option value='expense'>Expense</option><option value='income'>Income</option><option value='payment'>Payment</option><option value='transfer'>Transfer</option><option value='asset'>Asset</option><option value='liability'>Liability</option><option value='adjustment'>Adjustment</option></select></label><label>Amount<input type='number' step='0.01' value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})}/></label><label>Currency<input value={draft.currency} maxLength={3} onChange={e=>setDraft({...draft,currency:e.target.value.toUpperCase()})}/></label></div>{draft.currency!=='NZD'&&<label>NZD value for reporting<input type='number' step='0.01' value={draft.baseAmountNzd} onChange={e=>setDraft({...draft,baseAmountNzd:e.target.value})} placeholder='Enter converted NZD amount'/></label>}<div className={styles.row2}><label>Category<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Merchant / payee<input value={draft.merchant} onChange={e=>setDraft({...draft,merchant:e.target.value})}/></label></div><div className={styles.row2}><label>Date<input type='date' value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>Account<select value={draft.accountId} onChange={e=>setDraft({...draft,accountId:e.target.value})}><option value=''>Not assigned</option>{accounts.filter(a=>a.active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div><label>Notes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><button className={styles.primary} disabled={saving||!draft.amount}>{saving?'Saving…':'Review complete · Post transaction'}</button></form>}{loading?<div className={styles.empty}>Loading…</div>:transactions.length===0?<div className={styles.empty}><CreditCard/><b>No transactions yet</b><span>Start with an expense, income, payment or voice entry.</span></div>:<div className={styles.ledger}>{transactions.map(t=><article key={t.id}><span className={`${styles.txIcon} ${styles[t.type]||''}`}>{t.type==='income'?'+':'−'}</span><div><b>{t.merchant||t.category}</b><small>{t.category} · {t.date} · {t.source}</small>{t.notes&&<p>{t.notes}</p>}</div><strong>{t.type==='income'?'+':'−'}{money(t.amount,t.currency)}</strong><button aria-label='Remove' onClick={()=>removeTx(t.id)}><Trash2/></button></article>)}</div>}</section>}

    {tab==='accounts'&&<section className={styles.card}><div className={styles.cardHead}><div><p>ACCOUNTS</p><h2>Banks, cards, cash and assets</h2></div><button onClick={()=>setAccountOpen(v=>!v)}><Plus/>Account</button></div>{accountOpen&&<form className={styles.form} onSubmit={addAccount}><div className={styles.row2}><label>Account name<input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder='e.g. ANZ Everyday'/></label><label>Type<select value={accountType} onChange={e=>setAccountType(e.target.value)}><option value='bank'>Bank</option><option value='cash'>Cash</option><option value='credit_card'>Credit card</option><option value='fixed_deposit'>Fixed deposit</option><option value='investment'>Investment</option><option value='asset'>Asset</option><option value='liability'>Liability</option><option value='other'>Other</option></select></label></div><div className={styles.row2}><label>Institution<input value={institution} onChange={e=>setInstitution(e.target.value)}/></label><label>Currency<input value={accountCurrency} maxLength={3} onChange={e=>setAccountCurrency(e.target.value.toUpperCase())} placeholder='NZD or INR'/></label></div><button className={styles.primary} disabled={saving||!accountName.trim()}>Add account</button></form>}<div className={styles.accounts}>{accounts.length===0?<div className={styles.empty}><Landmark/><b>No financial accounts added</b><span>Add your New Zealand and India accounts here — currency decides which country dashboard each one shows up in.</span></div>:accounts.map(a=>{const debt=isDebtAccount(a);const bal=accountBalance(a);return <div key={a.id}><span>{a.type==='credit_card'?<CreditCard/>:<Building2/>}</span><div><b>{a.name}</b><small>{a.institution||a.type} · {a.currency}</small></div><span className={debt?styles.negative:''} style={{textAlign:'right'}}><b>{money(bal,a.currency)}</b><small style={{display:'block',opacity:.7}}>{debt?'Owed':'Balance'}</small></span><em>{a.active?'Active':'Inactive'}</em></div>})}</div></section>}

    {tab==='statements'&&<section className={styles.card}>
      <div className={styles.cardHead}><div><p>DOCUMENT INTELLIGENCE</p><h2>Statements &amp; payslips</h2></div><ShieldCheck/></div>
      <label className={styles.uploadBox} htmlFor='statement-file'><Upload/><b>Upload a credit card statement, bank statement or payslip</b><small>PDF or photo. Ravi OS reads the closing balance, minimum due, due date and separates any 0%/interest-free promotional balance from the ordinary balance — it never treats the whole closing balance as accruing normal interest.</small></label>
      <input id='statement-file' ref={fileInputRef} type='file' accept='application/pdf,image/*' onChange={pickFile}/>
      {extracting&&<div className={styles.extracting}><Loader2/>Reading the document…</div>}
      {extractError&&<div className={styles.error}>{extractError}</div>}
      {saveNotice&&<div className={`${styles.flag} ${styles.flagGood}`} style={{marginBottom:10}}><CheckCircle2/>{saveNotice}</div>}
      {preview&&<div className={styles.preview}>
        <h3>{preview.institution||'Document'} {preview.accountLabel&&`· ${preview.accountLabel}`}</h3>
        <p>{preview.documentType==='payslip'?'Payslip':preview.documentType==='bank_statement'?'Bank statement':preview.documentType==='credit_card_statement'?'Credit card statement':'Document'}{preview.statementStart&&preview.statementEnd?` · ${preview.statementStart} to ${preview.statementEnd}`:''} · {Math.round(preview.confidence*100)}% confident — review before saving.</p>
        {preview.documentType==='payslip'&&preview.payslip?<div className={styles.figs}>
          <div><small>EMPLOYER</small><b>{preview.payslip.employer||'—'}</b></div>
          <div><small>PAY DATE</small><b>{preview.payslip.payDate||'—'}</b></div>
          <div><small>GROSS PAY</small><b>{moneyOrDash(preview.payslip.grossPay,preview.currency)}</b></div>
          <div><small>NET PAY</small><b>{moneyOrDash(preview.payslip.netPay,preview.currency)}</b></div>
          {preview.payslip.netPay>0&&<div className={styles.statementNote} style={{marginTop:10}}><WalletCards size={12} style={{verticalAlign:'-2px',marginRight:4}}/>Saving this will add a {moneyOrDash(preview.payslip.netPay,preview.currency)} income entry to your Ledger.</div>}
        </div>:<>
          {preview.transactions?.length>0&&<div className={styles.statementNote} style={{marginBottom:10}}><WalletCards size={12} style={{verticalAlign:'-2px',marginRight:4}}/>{preview.transactions.length} line item{preview.transactions.length===1?'':'s'} found — saving this will import them into your Ledger under a matching or new Account.</div>}
          <div className={styles.figs}>
            <div><small>CLOSING BALANCE</small><input type='number' step='0.01' value={preview.closingBalance??''} onChange={e=>updatePreview({closingBalance:e.target.value===''?null:Number(e.target.value)})}/></div>
            <div><small>MINIMUM DUE</small><input type='number' step='0.01' value={preview.minimumDue??''} onChange={e=>updatePreview({minimumDue:e.target.value===''?null:Number(e.target.value)})}/></div>
            <div><small>PAYMENT DUE DATE</small><input type='date' value={preview.paymentDueDate||''} onChange={e=>updatePreview({paymentDueDate:e.target.value||null})}/></div>
            <div><small>ORDINARY BALANCE</small><b>{moneyOrDash(preview.ordinaryBalance,preview.currency)}</b></div>
          </div>
          {preview.promoBalances.length>0&&preview.promoBalances.map((p,i)=><div className={styles.promoBox} key={i}><b>0% / promotional: {p.label}</b><p>{moneyOrDash(p.amountOwing,preview.currency)} owing at {p.rate||'0.00% p.a.'}, interest-free until {p.rateApplicableUntil||'—'}. This amount is inside the closing balance above but is NOT part of the ordinary interest-bearing balance.</p></div>)}
          <div className={styles.statementFlags}>
            {preview.interestCharged?<span className={`${styles.flag} ${styles.flagBad}`}><AlertTriangle/>Interest actually charged: {moneyOrDash(preview.interestCharged,preview.currency)}</span>:<span className={`${styles.flag} ${styles.flagGood}`}><CheckCircle2/>No interest charged this cycle</span>}
            {preview.promoBalances.some(p=>p.rateApplicableUntil)&&<span className={`${styles.flag} ${styles.flagWarn}`}><CalendarClock/>Promo expires {preview.promoBalances.find(p=>p.rateApplicableUntil)?.rateApplicableUntil}</span>}
          </div>
          {preview.recommendedPaymentNote&&<div className={styles.statementNote}><b>{moneyOrDash(preview.recommendedPayment,preview.currency)} recommended payment.</b> {preview.recommendedPaymentNote}</div>}
          {preview.paymentDueDate&&<div className={styles.statementNote} style={{marginTop:8}}><BellRing size={12} style={{verticalAlign:'-2px',marginRight:4}}/>Saving this will add a reminder to your dashboard for {preview.paymentDueDate}.</div>}
        </>}
        <div className={styles.previewActions} style={{marginTop:12}}><button onClick={()=>setPreview(null)} disabled={savingStatement}>Discard</button><button className={styles.primary} onClick={saveStatement} disabled={savingStatement}>{savingStatement?'Saving…':'Save to history'}</button></div>
      </div>}
      <h2 style={{fontSize:14,margin:'18px 0 10px'}}>History</h2>
      {statementsLoading?<div className={styles.empty}>Loading…</div>:statements.length===0?<div className={styles.empty}><FileText/><b>No statements uploaded yet</b><span>Upload your first credit card statement, bank statement or payslip above.</span></div>:<div className={styles.statements}>{statements.map(s=>{
        const expiry=s.promoBalances.find(p=>p.rateApplicableUntil)
        const expiryDays=expiry?daysUntil(expiry.rateApplicableUntil):null
        return <article className={styles.statement} key={s.id}>
          <div className={styles.statementHead}><div><b>{s.institution||'Document'} {s.accountLabel&&`· ${s.accountLabel}`}</b><small>{s.documentType==='payslip'?'Payslip':s.documentType==='bank_statement'?'Bank statement':s.documentType==='credit_card_statement'?'Credit card statement':'Document'}{s.statementStart&&s.statementEnd?` · ${s.statementStart} to ${s.statementEnd}`:''}</small></div><button aria-label='Remove' onClick={()=>removeStatement(s)}><Trash2/></button></div>
          {s.reminderId&&s.paymentDueDate&&<div className={`${styles.flag} ${styles.flagGood}`} style={{marginBottom:8}}><BellRing/>Reminder added for {s.paymentDueDate}</div>}
          <div className={styles.statementFigs}>
            <div><small>CLOSING BALANCE</small><b>{moneyOrDash(s.closingBalance,s.currency)}</b></div>
            <div><small>MINIMUM DUE</small><b>{moneyOrDash(s.minimumDue,s.currency)}{s.paymentDueDate?` · ${s.paymentDueDate}`:''}</b></div>
            <div><small>ORDINARY BALANCE</small><b>{moneyOrDash(s.ordinaryBalance,s.currency)}</b></div>
            <div><small>0% / PROMO BALANCE</small><b>{s.promoBalances.length?moneyOrDash(s.promoBalances.reduce((a,p)=>a+p.amountOwing,0),s.currency):'—'}</b></div>
          </div>
          <div className={styles.statementFlags}>
            {s.interestCharged?<span className={`${styles.flag} ${styles.flagBad}`}><AlertTriangle/>Interest charged: {moneyOrDash(s.interestCharged,s.currency)}</span>:<span className={`${styles.flag} ${styles.flagGood}`}><CheckCircle2/>No interest charged</span>}
            {expiry&&<span className={`${styles.flag} ${expiryDays!=null&&expiryDays<60?styles.flagWarn:styles.flagGood}`}><CalendarClock/>0% expires {expiry.rateApplicableUntil}{expiryDays!=null?` (${expiryDays}d)`:''}</span>}
          </div>
          {s.recommendedPaymentNote&&<div className={styles.statementNote}><b>{moneyOrDash(s.recommendedPayment,s.currency)} recommended payment.</b> {s.recommendedPaymentNote}</div>}
        </article>
      })}</div>}
    </section>}

    {tab==='networth'&&<div>
      <section className={styles.card} style={{marginBottom:12}}>
        <div className={styles.cardHead}><div><p>LIVE RATE</p><h2>New Zealand ⇄ India</h2></div><button onClick={loadFx} disabled={fxLoading}><RefreshCw/>{fxLoading?'Fetching…':'Refresh'}</button></div>
        {fxError&&<div className={styles.error}>{fxError}</div>}
        {fx&&<>
          <p style={{fontSize:10,color:'#59685f',margin:'0 0 12px'}}>1 NZD = {fx.rate.toFixed(4)} INR · fetched just now from {fx.source}{fx.asOf?` (rate date ${fx.asOf})`:''}</p>
          <div className={styles.row2}>
            <label>NZD<input type='number' step='0.01' value={convertNzd} onChange={e=>setConvertNzd(e.target.value)}/></label>
            <label>≈ INR<input value={Number(convertNzd)>=0?money((Number(convertNzd)||0)*fx.rate,'INR'):'—'} readOnly/></label>
          </div>
          {netWorth.transferSuggestion&&<div className={styles.statementNote} style={{marginTop:10}}><ArrowLeftRight size={12} style={{verticalAlign:'-2px',marginRight:4}}/>To balance both dashboards to the same value at today's rate, move about {money(netWorth.transferSuggestion.nzdAmount,'NZD')} (≈{money(netWorth.transferSuggestion.inrAmount,'INR')}) from {netWorth.transferSuggestion.fromNzToIndia?'New Zealand to India':'India to New Zealand'}.</div>}
        </>}
      </section>
      {!netWorth.hasAny?<section className={styles.card}><div className={styles.empty}><Globe2/><b>No accounts included in net worth yet</b><span>Add your New Zealand accounts (currency NZD) and India accounts (currency INR) on the Accounts tab — they'll automatically split into separate dashboards here, plus a combined total.</span></div></section>:
      <div className={styles.netgrid}>
        <div className={styles.netcard}><h3><Globe2/>New Zealand</h3><p>Accounts in NZD</p><b>{money(netWorth.nzdTotal,'NZD')}</b>{netWorth.nzdAccounts.length===0?<div className={styles.empty} style={{minHeight:60}}><span>No NZD accounts yet</span></div>:netWorth.nzdAccounts.map(({account,netBalance,debt})=><div className={styles.netAccount} key={account.id}><span><b>{account.name}</b><small>{account.institution||account.type}{debt?' · owed':''}</small></span><span className={debt?styles.negative:''}><b>{money(netBalance,'NZD')}</b></span></div>)}</div>
        <div className={styles.netcard}><h3><IndianRupee/>India</h3><p>Accounts in INR{netWorth.inrTotalNzd!=null&&` · ≈${money(netWorth.inrTotalNzd,'NZD')}`}</p><b>{money(netWorth.inrTotal,'INR')}</b>{netWorth.inrAccounts.length===0?<div className={styles.empty} style={{minHeight:60}}><span>No INR accounts yet</span></div>:netWorth.inrAccounts.map(({account,netBalance,debt})=><div className={styles.netAccount} key={account.id}><span><b>{account.name}</b><small>{account.institution||account.type}{debt?' · owed':''}</small></span><span className={debt?styles.negative:''}><b>{money(netBalance,'INR')}</b></span></div>)}</div>
        <div className={styles.netcard}><h3><Coins/>Combined net worth</h3><p>Everything converted to NZD at today's rate</p><b>{money(netWorth.combined,'NZD')}</b>{netWorth.unconverted>0&&<div className={styles.statementNote}>{netWorth.unconverted} account{netWorth.unconverted>1?'s':''} not counted yet — {fx?'':'fetch a live rate above, or '}record at least one transaction with an NZD conversion rate on it so Ravi OS knows how to convert that currency.</div>}{netWorth.otherAccounts.map(({account,netBalance,debt})=><div className={styles.netAccount} key={account.id}><span><b>{account.name}</b><small>{account.currency} · {account.institution||account.type}{debt?' · owed':''}</small></span><span className={debt?styles.negative:''}><b>{money(netBalance,account.currency)}</b></span></div>)}</div>
      </div>}
    </div>}
  </main>
}
