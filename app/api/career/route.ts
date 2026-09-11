import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../lib/server/control-client'

async function relay(r:Response|null){if(!r)return NextResponse.json({error:'Ravi session required'},{status:428});const text=await r.text();return new NextResponse(text,{status:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
export async function GET(){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});return relay(await controlAction('career_get'))}
export async function POST(request:Request){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});const b=await request.json().catch(()=>({}));if(b.kind==='profile')return relay(await controlAction('career_profile_save',{profile:b.profile||{}}));if(b.kind==='opportunity')return relay(await controlAction('career_opportunity_create',{opportunity:b.opportunity||{}}));return NextResponse.json({error:'Unknown action'},{status:400})}
export async function PUT(request:Request){if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401});const b=await request.json().catch(()=>({}));return relay(await controlAction('career_opportunity_update',{id:String(b.id||''),patch:b.patch||{}}))}
