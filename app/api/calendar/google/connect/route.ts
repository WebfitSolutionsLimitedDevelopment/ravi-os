import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { googleAuthUrl, googleCalendarConfigured, newOAuthState } from '../../../../../lib/server/google-calendar'

const STATE_COOKIE='ravi_os_google_oauth_state'

export async function GET(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleCalendarConfigured())return NextResponse.json({error:'Google Calendar OAuth is not configured yet'},{status:503})
  const state=newOAuthState()
  const response=NextResponse.redirect(googleAuthUrl(state))
  response.cookies.set(STATE_COOKIE,state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:600})
  return response
}
