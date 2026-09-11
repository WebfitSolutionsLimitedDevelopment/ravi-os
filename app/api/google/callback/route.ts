import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { calendarVaultAction } from '../../../../lib/server/calendar-vault-client'
import { exchangeGoogleSuiteCode, googleSuiteConfigured, googleSuiteEmail } from '../../../../lib/server/google-suite'

const STATE_COOKIE='ravi_os_google_suite_state'
const APP_URL=process.env.NEXT_PUBLIC_APP_URL||'https://my.ravigupta.dev'
export async function GET(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.redirect(`${APP_URL}/secretary?google=unauthorized`)
  if(!googleSuiteConfigured())return NextResponse.redirect(`${APP_URL}/secretary?google=not-configured`)
  const u=new URL(request.url),code=u.searchParams.get('code')||'',state=u.searchParams.get('state')||'',error=u.searchParams.get('error')||'';const store=await cookies(),expected=store.get(STATE_COOKIE)?.value||'';store.delete(STATE_COOKIE)
  if(error)return NextResponse.redirect(`${APP_URL}/secretary?google=denied`)
  if(!code||!state||!expected||state!==expected)return NextResponse.redirect(`${APP_URL}/secretary?google=invalid-state`)
  try{const token=await exchangeGoogleSuiteCode(code),email=await googleSuiteEmail(token.access_token),expiresAt=new Date(Date.now()+(token.expires_in||3600)*1000).toISOString();const saved=await calendarVaultAction('store',{accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt,tokenType:token.token_type,scope:token.scope,email,calendarId:'primary'});if(!saved?.ok)throw new Error('Token vault save failed');return NextResponse.redirect(`${APP_URL}/secretary?google=connected`)}catch{return NextResponse.redirect(`${APP_URL}/secretary?google=error`)}
}
