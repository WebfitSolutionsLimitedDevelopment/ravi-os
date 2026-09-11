import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { familyAction } from '../../../lib/server/family-reminder-client'
import { clearReminderListCache, getReminderListCache, setReminderListCache } from '../../../lib/server/reminder-list-cache'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}

async function relay(response:Response|null,{cacheable=false}:{cacheable?:boolean}={}){
  if(!response)return NextResponse.json({error:'Shared reminder session required'},{status:428})
  const text=await response.text()
  const contentType=response.headers.get('content-type')||'application/json'
  if(cacheable)setReminderListCache(text,response.status,contentType)
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':contentType,'Cache-Control':cacheable?'private, max-age=15, stale-while-revalidate=60':'no-store'}})
}

export async function GET(){
  if(!await reminderActor())return unauthorized()
  const cached=getReminderListCache()
  if(cached)return new NextResponse(cached.body,{status:cached.status,headers:{'Content-Type':cached.contentType,'Cache-Control':'private, max-age=15, stale-while-revalidate=60','X-Ravi-OS-Cache':'HIT'}})
  return relay(await familyAction('list'),{cacheable:true})
}

export async function POST(request:Request){
  if(!await reminderActor())return unauthorized()
  const body=await request.json().catch(()=>({}))
  const response=await familyAction('create',body)
  if(response?.ok)clearReminderListCache()
  return relay(response)
}
