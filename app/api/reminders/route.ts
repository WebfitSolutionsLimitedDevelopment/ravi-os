import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { familyAction } from '../../../lib/server/family-reminder-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Shared reminder session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

export async function GET(){
  if(!await reminderActor())return unauthorized()
  return relay(await familyAction('list'))
}

export async function POST(request:Request){
  if(!await reminderActor())return unauthorized()
  const body=await request.json().catch(()=>({}))
  return relay(await familyAction('create',body))
}
