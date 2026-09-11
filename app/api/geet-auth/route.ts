import { NextResponse } from 'next/server'
import { clearGeetSession, isGeetSession, setGeetSession, verifyGeetPin } from '../../../lib/server/ravi-os-auth'
import { familyLogin, familyLogout, hasFamilySession, setFamilySession } from '../../../lib/server/family-reminder-client'

export async function GET() {
  const appValid=await isGeetSession()
  const familyValid=appValid?await hasFamilySession():false
  return NextResponse.json({ authenticated: appValid && familyValid })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const suppliedPin=String(body.pin || '')
  const ok = verifyGeetPin(suppliedPin)
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 })
  const family=await familyLogin('geet',suppliedPin).catch(()=>null)
  if(!family)return NextResponse.json({ok:false,message:'Unable to start shared reminder session'},{status:503})
  await setGeetSession()
  await setFamilySession(family.token)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await familyLogout().catch(()=>undefined)
  await clearGeetSession()
  return NextResponse.json({ ok: true })
}
