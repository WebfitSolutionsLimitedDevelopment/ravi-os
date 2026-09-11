import { cookies } from 'next/headers'
import { createHash, timingSafeEqual } from 'crypto'

const RAVI_COOKIE='ravi_os_session'
const GEET_COOKIE='ravi_os_geet_session'
const DEFAULT_GEET_PIN_HASH='d63913da34eea699679157b8e78201e2ec17c1ccf2df82021221e5573bc3353b'

function safeEqual(a:string,b:string){
  return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
}
function raviToken(){
  const pin=process.env.RAVI_OS_PIN||'1234'
  const secret=process.env.RAVI_OS_AUTH_SECRET||'ravi-os-phase2-temporary-secret'
  return createHash('sha256').update(`${pin}:${secret}`).digest('hex')
}
function geetToken(){
  const secret=process.env.RAVI_OS_AUTH_SECRET||'ravi-os-phase2-temporary-secret'
  return createHash('sha256').update(`geet:${secret}`).digest('hex')
}
export function verifyGeetPin(pin:string){
  const supplied=createHash('sha256').update(pin).digest('hex')
  const expected=process.env.GEET_PIN_HASH||DEFAULT_GEET_PIN_HASH
  return safeEqual(supplied,expected)
}
export async function reminderActor():Promise<'ravi'|'geet'|null>{
  const store=await cookies()
  const ravi=store.get(RAVI_COOKIE)?.value||''
  if(safeEqual(ravi,raviToken()))return'ravi'
  const geet=store.get(GEET_COOKIE)?.value||''
  if(safeEqual(geet,geetToken()))return'geet'
  return null
}
export async function setGeetSession(){
  const store=await cookies()
  store.set(GEET_COOKIE,geetToken(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*24*30})
}
export async function clearGeetSession(){
  const store=await cookies();store.delete(GEET_COOKIE)
}
export async function isGeetSession(){
  const store=await cookies();const current=store.get(GEET_COOKIE)?.value||'';return safeEqual(current,geetToken())
}
