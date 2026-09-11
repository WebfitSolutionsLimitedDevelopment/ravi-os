import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { waitingForAction } from '../../../../lib/server/waiting-for-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Waiting For session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {id}=await params
  const body=await request.json().catch(()=>({}))
  const action=body.completed===true||body.completed===false?'complete':body.followUp===true?'followup':'update'
  return relay(await waitingForAction(action,{id,...body}))
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {id}=await params
  return relay(await waitingForAction('delete',{id}))
}
