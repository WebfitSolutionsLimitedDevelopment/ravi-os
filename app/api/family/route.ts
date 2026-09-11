import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { familyWorkspaceAction } from '../../../lib/server/family-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Family session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'private, max-age=10, stale-while-revalidate=30'}})
}

export async function GET(){
  if(!await reminderActor())return unauthorized()
  return relay(await familyWorkspaceAction('list'))
}

export async function POST(request:Request){
  if(!await reminderActor())return unauthorized()
  const body=await request.json().catch(()=>({}))
  return relay(await familyWorkspaceAction('create',body))
}
