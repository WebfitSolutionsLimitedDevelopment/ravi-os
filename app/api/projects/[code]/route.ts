import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { projectAction } from '../../../../lib/server/project-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){
  if(!response)return NextResponse.json({error:'Project session required'},{status:428})
  const text=await response.text()
  return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})
}

export async function GET(_request:Request,{params}:{params:Promise<{code:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {code}=await params
  return relay(await projectAction('dashboard',{code}))
}

export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){
  if(await reminderActor()!=='ravi')return unauthorized()
  const {code}=await params
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'')
  if(!action)return NextResponse.json({error:'Action required'},{status:400})
  return relay(await projectAction(action,{code,...body}))
}
