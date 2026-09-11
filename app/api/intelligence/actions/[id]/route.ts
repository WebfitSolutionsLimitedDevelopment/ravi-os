import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { intelligenceAction } from '../../../../../lib/server/intelligence-client'

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const {id}=await params
  const body=await request.json().catch(()=>({}))
  const status=String(body.status||'')
  const r=await intelligenceAction('set_status',{id,status})
  if(!r)return NextResponse.json({error:'Intelligence session required'},{status:428})
  return new NextResponse(await r.text(),{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
}
