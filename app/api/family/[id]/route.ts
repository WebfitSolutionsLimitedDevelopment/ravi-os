import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { familyWorkspaceAction } from '../../../../lib/server/family-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Family session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  const body=await request.json().catch(()=>({}))
  return relay(await familyWorkspaceAction(body.completed===true||body.completed===false?'complete':'update',{id,...body}))
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  return relay(await familyWorkspaceAction('delete',{id}))
}
