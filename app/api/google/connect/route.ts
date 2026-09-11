import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { googleSuiteAuthUrl, googleSuiteConfigured, newGoogleSuiteState } from '../../../../lib/server/google-suite'

const STATE_COOKIE='ravi_os_google_suite_state'
export async function GET(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleSuiteConfigured())return NextResponse.redirect('https://my.ravigupta.dev/secretary?google=not-configured')
  const state=newGoogleSuiteState(),store=await cookies();store.set(STATE_COOKIE,state,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:600,path:'/'})
  return NextResponse.redirect(googleSuiteAuthUrl(state))
}
