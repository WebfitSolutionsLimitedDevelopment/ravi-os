import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { familyLogin, familyLogout, setFamilySession } from '../../../lib/server/family-reminder-client'

const cookieName = 'ravi_os_session'
const pin = process.env.RAVI_OS_PIN || '1234'
const secret = process.env.RAVI_OS_AUTH_SECRET || 'ravi-os-phase2-temporary-secret'

function token() {
  return createHash('sha256').update(`${pin}:${secret}`).digest('hex')
}

export async function GET() {
  const store = await cookies()
  const current = store.get(cookieName)?.value || ''
  const expected = token()
  const valid = current.length === expected.length && timingSafeEqual(Buffer.from(current), Buffer.from(expected))
  return NextResponse.json({ authenticated: valid })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const suppliedPin=String(body?.pin || '')
  if (suppliedPin !== pin) return NextResponse.json({ ok: false, message: 'Incorrect PIN' }, { status: 401 })

  const family=await familyLogin('ravi',suppliedPin).catch(()=>null)
  if(!family) return NextResponse.json({ok:false,message:'Unable to start shared reminder session'},{status:503})

  const store = await cookies()
  store.set(cookieName, token(), {httpOnly:true,secure:process.env.NODE_ENV === 'production',sameSite:'strict',path:'/',maxAge:60*60*24*14})
  await setFamilySession(family.token)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await familyLogout().catch(()=>undefined)
  const store = await cookies();store.delete(cookieName)
  return NextResponse.json({ ok: true })
}
