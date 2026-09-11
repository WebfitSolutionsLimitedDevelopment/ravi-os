import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { calendarVaultAction } from '../../../../../lib/server/calendar-vault-client'

export async function POST(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const response=await calendarVaultAction('clear')
  if(!response)return NextResponse.json({error:'Calendar session required'},{status:428})
  const data=await response.json().catch(()=>({}))
  return NextResponse.json(data,{status:response.status})
}
