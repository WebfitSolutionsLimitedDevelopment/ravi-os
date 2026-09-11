import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { googleCalendarConfigured, syncOneCalendarItem, type CalendarSyncItem } from '../../../../../lib/server/google-calendar'

function validItem(value:any):value is CalendarSyncItem{
  return value&&typeof value.id==='string'&&(value.kind==='reminder'||value.kind==='task')&&typeof value.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(String(value.date||''))
}

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleCalendarConfigured())return NextResponse.json({error:'Google Calendar OAuth is not configured'},{status:503})
  const body=await request.json().catch(()=>({}))
  const incoming=Array.isArray(body.items)?body.items:body.item?[body.item]:[]
  const items=incoming.filter(validItem).slice(0,100)
  if(!items.length)return NextResponse.json({error:'No calendar items supplied'},{status:400})
  const results=[] as Array<Record<string,unknown>>
  let failed=0
  for(const item of items){
    try{const result=await syncOneCalendarItem(item);results.push({id:item.id,kind:item.kind,...result})}
    catch(error){failed++;results.push({id:item.id,kind:item.kind,status:'error',error:error instanceof Error?error.message:'Sync failed'})}
  }
  return NextResponse.json({ok:failed===0,synced:items.length-failed,failed,results},{status:failed===items.length?502:200})
}
