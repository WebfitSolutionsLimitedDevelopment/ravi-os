import { cookies } from 'next/headers'
import { createHash, timingSafeEqual } from 'crypto'

const RAVI_COOKIE='ravi_os_session'
const GEET_COOKIE='ravi_os_geet_session'
const FINANCE_COOKIE='ravi_os_finance_session'
const DEFAULT_GEET_PIN_HASH='d63913da34eea699679157b8e78201e2ec17c1ccf2df82021221e5573bc3353b'
// Extra PIN gate in front of the Finance section, on top of the normal
// Ravi session — this is Ravi's own private financial data, so it gets a
// second lock even inside his own unlocked app.
const DEFAULT_FINANCE_PIN_HASH='c904d4c3485db6569c9deb41da845d82056e8843eafba8bc8a90aaa06df96963'

function safeEqual(a:string,b:string){
  return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
}
let warnedWeakAuth=false
function warnIfWeak(missing:string){
  if(process.env.NODE_ENV==='production'&&!warnedWeakAuth){warnedWeakAuth=true;console.error(`[ravi-os-auth] SECURITY: ${missing} is not set in this production environment — falling back to a well-known default value. Set it in your Vercel project's environment variables.`)}
}
function raviToken(){
  if(!process.env.RAVI_OS_PIN)warnIfWeak('RAVI_OS_PIN')
  if(!process.env.RAVI_OS_AUTH_SECRET)warnIfWeak('RAVI_OS_AUTH_SECRET')
  const pin=process.env.RAVI_OS_PIN||'1234'
  const secret=process.env.RAVI_OS_AUTH_SECRET||'ravi-os-phase2-temporary-secret'
  return createHash('sha256').update(`${pin}:${secret}`).digest('hex')
}
function geetToken(){
  if(!process.env.RAVI_OS_AUTH_SECRET)warnIfWeak('RAVI_OS_AUTH_SECRET')
  const secret=process.env.RAVI_OS_AUTH_SECRET||'ravi-os-phase2-temporary-secret'
  return createHash('sha256').update(`geet:${secret}`).digest('hex')
}
function financeToken(){
  if(!process.env.RAVI_OS_AUTH_SECRET)warnIfWeak('RAVI_OS_AUTH_SECRET')
  const secret=process.env.RAVI_OS_AUTH_SECRET||'ravi-os-phase2-temporary-secret'
  return createHash('sha256').update(`finance:${secret}`).digest('hex')
}
export function verifyGeetPin(pin:string){
  if(!process.env.GEET_PIN_HASH)warnIfWeak('GEET_PIN_HASH')
  const supplied=createHash('sha256').update(pin).digest('hex')
  const expected=process.env.GEET_PIN_HASH||DEFAULT_GEET_PIN_HASH
  return safeEqual(supplied,expected)
}
export function verifyFinancePin(pin:string){
  if(!process.env.FINANCE_PIN_HASH)warnIfWeak('FINANCE_PIN_HASH')
  const supplied=createHash('sha256').update(pin).digest('hex')
  const expected=process.env.FINANCE_PIN_HASH||DEFAULT_FINANCE_PIN_HASH
  return safeEqual(supplied,expected)
}
export async function setFinanceSession(){
  const store=await cookies()
  store.set(FINANCE_COOKIE,financeToken(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*30})
}
export async function clearFinanceSession(){
  const store=await cookies();store.delete(FINANCE_COOKIE)
}
export async function isFinanceSession(){
  const store=await cookies();const current=store.get(FINANCE_COOKIE)?.value||'';return safeEqual(current,financeToken())
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
