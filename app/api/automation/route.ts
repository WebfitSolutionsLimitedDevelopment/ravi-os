import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../lib/server/control-client'

async function relay(r:Response|null){if(!r)return NextResponse.json({error:'Ravi session required'},{status:428});const text=await r.text();return new NextResponse(text,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
export async function GET(){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});return relay(await controlAction('automation_list'))}
export async function POST(request:Request){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});const b=await request.json().catch(()=>({}));if(b.action==='evaluate')return relay(await controlAction('automation_evaluate'));if(b.action==='toggle')return relay(await controlAction('automation_toggle',{id:String(b.id||''),enabled:Boolean(b.enabled)}));return NextResponse.json({error:'Unknown action'},{status:400})}
