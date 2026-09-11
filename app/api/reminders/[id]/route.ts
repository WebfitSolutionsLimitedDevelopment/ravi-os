import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { familyAction } from '../../../../lib/server/family-reminder-client'
import { clearReminderListCache } from '../../../../lib/server/reminder-list-cache'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Shared reminder session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  return relay(await familyAction('get',{id}))
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  const body=await request.json().catch(()=>({}))
  const response=await familyAction('update',{id,...body})
  if(response?.ok)clearReminderListCache()
  return relay(response)
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  const response=await familyAction('delete',{id})
  if(response?.ok)clearReminderListCache()
  return relay(response)
}
