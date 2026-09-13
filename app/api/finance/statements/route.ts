import { NextResponse } from 'next/server'
import { reminderActor, isFinanceSession } from '../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../lib/server/finance-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
function financeLocked(){return NextResponse.json({error:'Finance PIN required'},{status:401})}
async function relay(response:Response|null){if(!response)return NextResponse.json({error:'Finance session required'},{status:428});const text=await response.text();return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})}

export async function GET(){
  if(await reminderActor()!=='ravi')return unauthorized()
  if(!await isFinanceSession())return financeLocked()
  return relay(await financeAction('statement_list'))
}

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return unauthorized()
  if(!await isFinanceSession())return financeLocked()
  const body=await request.json().catch(()=>({}))
  return relay(await financeAction('statement_create',body))
}
