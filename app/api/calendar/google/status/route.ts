import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { calendarVaultAction } from '../../../../../lib/server/calendar-vault-client'
import { googleCalendarConfigured } from '../../../../../lib/server/google-calendar'

export async function GET(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const configured=googleCalendarConfigured()
  if(!configured)return NextResponse.json({configured:false,connected:false})
  const response=await calendarVaultAction('status')
  if(!response)return NextResponse.json({configured:true,connected:false})
  const data=await response.json().catch(()=>({connected:false}))
  return NextResponse.json({configured:true,...data},{status:response.ok?200:502})
}
