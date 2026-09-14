import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { projectAction } from '../../../../lib/server/project-client'
import { financeAction } from '../../../../lib/server/finance-client'
import { fetchNzdInrRate } from '../../../../lib/server/fx-rate'
import { accountBalance, type CalcAccount, type CalcTx } from '../../../../lib/finance-calc'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Project session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

// The construction dashboard needs to answer "how much is actually sitting in
// India right now" and "what's that gap worth in NZD" — both live off the
// same Finance data/FX rate the Finance page itself uses, not a second copy
// entered by hand, so the two dashboards can never silently disagree.
async function fundingContext(){
  const [listRes, fx] = await Promise.all([financeAction('list'), fetchNzdInrRate()])
  let nroBalance: number | null = null
  if (listRes?.ok) {
    const data = await listRes.json().catch(() => null)
    const accounts: CalcAccount[] = (data?.accounts || []).filter((a: any) => a.active)
    const tx: CalcTx[] = data?.transactions || []
    const nro = accounts.find((a: any) => String(a.name || '').toLowerCase().includes('nro'))
    if (nro) nroBalance = Math.round(accountBalance(nro, tx) * 100) / 100
  }
  return { fxRate: fx ? { nzdToInr: fx.rate, asOf: fx.asOf } : null, nroBalanceInr: nroBalance }
}

export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {code}=await params
  const response = await projectAction('dashboard',{code})
  if(!response)return NextResponse.json({error:'Project session required'},{status:428})
  if(!response.ok)return relay(response)
  const data = await response.json().catch(()=>null)
  if(!data)return NextResponse.json({error:'Project data unavailable'},{status:502})
  const context = await fundingContext()
  return NextResponse.json({...data, context}, {headers:{'Cache-Control':'no-store'}})
}

export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {code}=await params
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'')
  if(!action)return NextResponse.json({error:'Action required'},{status:400})
  return relay(await projectAction(action,{code,...body}))
}
