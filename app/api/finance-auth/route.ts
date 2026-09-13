import { NextResponse } from 'next/server'
import { reminderActor, clearFinanceSession, isFinanceSession, setFinanceSession, verifyFinancePin } from '../../../lib/server/ravi-os-auth'

export async function GET() {
  if (await reminderActor() !== 'ravi') return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: await isFinanceSession() })
}

export async function POST(request: Request) {
  if (await reminderActor() !== 'ravi') return NextResponse.json({ ok: false }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const suppliedPin = String(body.pin || '')
  if (!verifyFinancePin(suppliedPin)) return NextResponse.json({ ok: false }, { status: 401 })
  await setFinanceSession()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await clearFinanceSession()
  return NextResponse.json({ ok: true })
}
