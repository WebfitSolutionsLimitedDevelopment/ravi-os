import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { calendarVaultAction } from '../../../../../lib/server/calendar-vault-client'
import { exchangeGoogleCode, googleCalendarConfigured, googleUserEmail } from '../../../../../lib/server/google-calendar'

const STATE_COOKIE='ravi_os_google_oauth_state'
const APP_URL=process.env.NEXT_PUBLIC_APP_URL||'https://my.ravigupta.dev'

export async function GET(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.redirect(`${APP_URL}/calendar?google=unauthorized`)
  if(!googleCalendarConfigured())return NextResponse.redirect(`${APP_URL}/calendar?google=not-configured`)
  const url=new URL(request.url)
  const code=url.searchParams.get('code')||''
  const state=url.searchParams.get('state')||''
  const error=url.searchParams.get('error')||''
  const store=await cookies()
  const expected=store.get(STATE_COOKIE)?.value||''
  store.delete(STATE_COOKIE)
  if(error)return NextResponse.redirect(`${APP_URL}/calendar?google=denied`)
  if(!code||!state||!expected||state!==expected)return NextResponse.redirect(`${APP_URL}/calendar?google=invalid-state`)
  try{
    const token=await exchangeGoogleCode(code)
    const email=await googleUserEmail(token.access_token)
    const expiresAt=new Date(Date.now()+(token.expires_in||3600)*1000).toISOString()
    const saved=await calendarVaultAction('store',{
      accessToken:token.access_token,
      refreshToken:token.refresh_token,
      expiresAt,
      tokenType:token.token_type,
      scope:token.scope,
      email,
      calendarId:'primary',
    })
    if(!saved?.ok)throw new Error('Token vault save failed')
    return NextResponse.redirect(`${APP_URL}/calendar?google=connected`)
  }catch{
    return NextResponse.redirect(`${APP_URL}/calendar?google=error`)
  }
}
