import { NextResponse } from 'next/server'
import { reminderActor, isFinanceSession } from '../../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../../lib/server/finance-client'
import { familyAction } from '../../../../../lib/server/family-reminder-client'
import { clearReminderListCache } from '../../../../../lib/server/reminder-list-cache'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
function financeLocked(){return NextResponse.json({error:'Finance PIN required'},{status:401})}
async function relay(response:Response|null){if(!response)return NextResponse.json({error:'Finance session required'},{status:428});const text=await response.text();return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  if(!await isFinanceSession())return financeLocked()
  const {id}=await params
  const body=await request.json().catch(()=>({}))
  const reminderId=body?.reminderId?String(body.reminderId):''
  if(reminderId){try{const r=await familyAction('delete',{id:reminderId});if(r?.ok)clearReminderListCache()}catch{}}
  return relay(await financeAction('statement_delete',{id}))
}
