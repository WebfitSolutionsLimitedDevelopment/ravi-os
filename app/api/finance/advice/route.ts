import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../lib/server/finance-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

function monthKey(d:string){return d.slice(0,7)}

export async function POST(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'Finance Intelligence is not configured'},{status:503})
  const r=await financeAction('list')
  if(!r?.ok)return NextResponse.json({error:'Finance data unavailable'},{status:503})
  const data=await r.json()
  const tx=(data.transactions||[]).filter((x:any)=>x.status!=='void')
  const currentMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit'}).format(new Date())
  const month=tx.filter((x:any)=>monthKey(String(x.date||''))===currentMonth)
  const nzd=(x:any)=>Number(x.baseAmountNzd ?? (x.currency==='NZD'?x.amount:0) ?? 0)
  const income=month.filter((x:any)=>x.type==='income').reduce((a:number,x:any)=>a+nzd(x),0)
  const expenses=month.filter((x:any)=>['expense','payment'].includes(x.type)).reduce((a:number,x:any)=>a+nzd(x),0)
  const byCategory:Record<string,number>={}
  for(const x of month.filter((x:any)=>['expense','payment'].includes(x.type))){byCategory[x.category||'Other']=(byCategory[x.category||'Other']||0)+nzd(x)}
  const missingFx=month.filter((x:any)=>x.currency!=='NZD'&&x.baseAmountNzd==null).length
  const snapshot={month:currentMonth,incomeNzd:income,expensesNzd:expenses,netNzd:income-expenses,transactionCount:month.length,missingFxCount:missingFx,topCategories:Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,6),accountCount:(data.accounts||[]).filter((x:any)=>x.active).length}
  const prompt=`You are the Finance Controller inside Ravi OS. Act like a rigorous accountant, management accountant, banker and financial planning assistant. Analyse the supplied personal finance snapshot. Focus on bookkeeping quality, cash-flow control, budgeting, payment discipline, reconciliation, tax-record hygiene and questions Ravi should investigate. Do not invent missing data and do not give definitive tax/legal/investment instructions. Return ONLY JSON: {"headline":"...","health":"good|watch|attention","observations":["..."],"actions":[{"title":"...","why":"...","priority":"high|medium|low"}],"controls":["..."],"questions":["..."]}. Keep it useful and specific, not generic.`
  try{
    const {data:advice}=await aiJson<any>({system:prompt,input:JSON.stringify(snapshot),maxTokens:1000})
    return NextResponse.json({snapshot,advice})
  }catch(e){return NextResponse.json({snapshot,error:e instanceof Error?e.message:'Finance review failed'},{status:500})}
}
