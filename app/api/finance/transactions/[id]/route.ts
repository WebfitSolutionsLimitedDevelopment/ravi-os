import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../../../lib/server/finance-client'

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const {id}=await params
  const r=await financeAction('delete_transaction',{id})
  if(!r)return NextResponse.json({error:'Finance session required'},{status:428})
  return new NextResponse(await r.text(),{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
}
