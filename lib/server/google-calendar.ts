import { createHash, randomBytes } from 'crypto'
import { calendarVaultAction } from './calendar-vault-client'

const APP_URL=process.env.NEXT_PUBLIC_APP_URL||'https://my.ravigupta.dev'
const CLIENT_ID=process.env.GOOGLE_CLIENT_ID||''
const CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET||''
const REDIRECT_URI=`${APP_URL}/api/calendar/google/callback`
const SCOPES=['openid','email','https://www.googleapis.com/auth/calendar.events']

export type CalendarSyncItem={
  id:string
  kind:'reminder'|'task'
  title:string
  notes?:string
  date:string
  time?:string
}

type VaultConnection={
  access_token:string
  refresh_token?:string|null
  expires_at?:string|null
  calendar_id?:string|null
  provider_email?:string|null
}

export function googleCalendarConfigured(){return Boolean(CLIENT_ID&&CLIENT_SECRET)}
export function newOAuthState(){return randomBytes(24).toString('hex')}
export function googleAuthUrl(state:string){
  const p=new URLSearchParams({
    client_id:CLIENT_ID,
    redirect_uri:REDIRECT_URI,
    response_type:'code',
    access_type:'offline',
    prompt:'consent',
    include_granted_scopes:'true',
    scope:SCOPES.join(' '),
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`
}

export async function exchangeGoogleCode(code:string){
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({code,client_id:CLIENT_ID,client_secret:CLIENT_SECRET,redirect_uri:REDIRECT_URI,grant_type:'authorization_code'}),
    cache:'no-store',
  })
  if(!r.ok)throw new Error(`Google token exchange failed (${r.status})`)
  return r.json() as Promise<{access_token:string;refresh_token?:string;expires_in?:number;scope?:string;token_type?:string}>
}

async function refreshAccessToken(refreshToken:string){
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({refresh_token:refreshToken,client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'refresh_token'}),
    cache:'no-store',
  })
  if(!r.ok)throw new Error(`Google token refresh failed (${r.status})`)
  return r.json() as Promise<{access_token:string;expires_in?:number;scope?:string;token_type?:string}>
}

export async function googleUserEmail(accessToken:string){
  const r=await fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store'})
  if(!r.ok)return null
  const data=await r.json().catch(()=>({}))
  return typeof data?.email==='string'?data.email:null
}

async function getVaultConnection(){
  const r=await calendarVaultAction('get')
  if(!r?.ok)throw new Error('Google Calendar is not connected')
  const data=await r.json()
  return data.connection as VaultConnection
}

async function storeConnection(connection:VaultConnection,extra:Record<string,unknown>={}){
  const payload={
    accessToken:connection.access_token,
    refreshToken:connection.refresh_token||undefined,
    expiresAt:connection.expires_at||undefined,
    calendarId:connection.calendar_id||'primary',
    email:connection.provider_email||undefined,
    ...extra,
  }
  const r=await calendarVaultAction('store',payload)
  if(!r?.ok)throw new Error('Unable to save Google Calendar connection')
}

async function validAccessToken(){
  const connection=await getVaultConnection()
  const expires=connection.expires_at?new Date(connection.expires_at).getTime():0
  if(connection.access_token&&expires>Date.now()+60000)return {token:connection.access_token,calendarId:connection.calendar_id||'primary'}
  if(!connection.refresh_token)throw new Error('Google Calendar needs to be reconnected')
  const fresh=await refreshAccessToken(connection.refresh_token)
  const expiresAt=new Date(Date.now()+(fresh.expires_in||3600)*1000).toISOString()
  await storeConnection(connection,{accessToken:fresh.access_token,refreshToken:connection.refresh_token,expiresAt,scope:fresh.scope,tokenType:fresh.token_type})
  return {token:fresh.access_token,calendarId:connection.calendar_id||'primary'}
}

function nextDate(date:string){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
function addMinutesLocal(date:string,time:string,minutes:number){
  const [h,m]=time.split(':').map(Number)
  const total=h*60+m+minutes
  const dayOffset=Math.floor(total/1440)
  const minuteOfDay=((total%1440)+1440)%1440
  const hh=String(Math.floor(minuteOfDay/60)).padStart(2,'0')
  const mm=String(minuteOfDay%60).padStart(2,'0')
  let outDate=date
  for(let i=0;i<dayOffset;i++)outDate=nextDate(outDate)
  return `${outDate}T${hh}:${mm}:00`
}
function eventBody(item:CalendarSyncItem){
  const description=[item.notes||'',`Synced from Ravi OS (${item.kind})`].filter(Boolean).join('\n\n')
  const base:any={
    summary:item.title,
    description,
    reminders:{useDefault:false,overrides:[
      {method:'popup',minutes:1440},
      {method:'popup',minutes:720},
      {method:'popup',minutes:360},
      {method:'popup',minutes:60},
    ]},
    extendedProperties:{private:{raviOsSource:item.kind,raviOsId:item.id}},
  }
  if(item.time){
    const start=`${item.date}T${item.time}:00`
    const end=addMinutesLocal(item.date,item.time,30)
    base.start={dateTime:start,timeZone:'Pacific/Auckland'}
    base.end={dateTime:end,timeZone:'Pacific/Auckland'}
  }else{
    base.start={date:item.date}
    base.end={date:nextDate(item.date)}
  }
  return base
}
function hashItem(item:CalendarSyncItem){return createHash('sha256').update(JSON.stringify(eventBody(item))).digest('hex')}

async function googleRequest(path:string,init:RequestInit={}){
  const {token,calendarId}=await validAccessToken()
  const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}`
  return fetch(url,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{})},cache:'no-store'})
}

export async function syncOneCalendarItem(item:CalendarSyncItem){
  const contentHash=hashItem(item)
  const mappingResponse=await calendarVaultAction('mapping_get',{sourceType:item.kind,sourceId:item.id})
  const mappingData=mappingResponse?.ok?await mappingResponse.json():{mapping:null}
  const mapping=mappingData?.mapping as {provider_event_id?:string;content_hash?:string}|null
  if(mapping?.provider_event_id&&mapping.content_hash===contentHash)return {status:'unchanged',eventId:mapping.provider_event_id}

  const body=eventBody(item)
  let eventId=mapping?.provider_event_id||''
  let response:Response
  if(eventId){
    response=await googleRequest(`/events/${encodeURIComponent(eventId)}`,{method:'PUT',body:JSON.stringify(body)})
    if(response.status===404){eventId='';response=await googleRequest('/events',{method:'POST',body:JSON.stringify(body)})}
  }else response=await googleRequest('/events',{method:'POST',body:JSON.stringify(body)})

  if(!response.ok){
    const detail=await response.text().catch(()=>String(response.status))
    throw new Error(`Google Calendar sync failed (${response.status}): ${detail.slice(0,180)}`)
  }
  const data=await response.json()
  eventId=String(data.id||eventId)
  await calendarVaultAction('mapping_upsert',{sourceType:item.kind,sourceId:item.id,providerEventId:eventId,contentHash,status:'synced'})
  return {status:mapping?.provider_event_id?'updated':'created',eventId,htmlLink:data.htmlLink||null}
}
