import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../lib/server/control-client'

async function relay(r:Response|null){if(!r)return NextResponse.json({error:'Ravi session required'},{status:428});const text=await r.text();return new NextResponse(text,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
export async function GET(){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});return relay(await controlAction('email_list'))}
export async function PUT(request:Request){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});const b=await request.json().catch(()=>({}));return relay(await controlAction('email_update',{id:String(b.id||''),patch:b.patch||{}}))}
