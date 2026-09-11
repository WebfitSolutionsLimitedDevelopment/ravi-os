import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { financeAction } from '../../../lib/server/finance-client'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}
async function relay(response:Response|null){if(!response)return NextResponse.json({error:'Finance session required'},{status:428});const text=await response.text();return new NextResponse(text,{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'}})}

export async function GET(){if(await reminderActor()!=='ravi')return unauthorized();return relay(await financeAction('list'))}
export async function POST(request:Request){if(await reminderActor()!=='ravi')return unauthorized();const body=await request.json().catch(()=>({}));if(body.kind==='account')return relay(await financeAction('create_account',body));if(body.kind==='transaction')return relay(await financeAction('create_transaction',body));return NextResponse.json({error:'Unknown finance item'},{status:400})}
