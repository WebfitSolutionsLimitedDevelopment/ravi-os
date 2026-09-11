import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../lib/server/control-client'

export async function GET(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const r=await controlAction('executive')
  if(!r)return NextResponse.json({error:'Ravi session required'},{status:428})
  const text=await r.text()
  return new NextResponse(text,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'private, max-age=30, stale-while-revalidate=120'}})
}
