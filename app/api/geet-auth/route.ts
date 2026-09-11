import { NextResponse } from 'next/server'
import { clearGeetSession, isGeetSession, setGeetSession, verifyGeetPin } from '../../../lib/server/ravi-os-auth'

export async function GET() {
  return NextResponse.json({ authenticated: await isGeetSession() })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const ok = verifyGeetPin(String(body.pin || ''))
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 })
  await setGeetSession()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await clearGeetSession()
  return NextResponse.json({ ok: true })
}
