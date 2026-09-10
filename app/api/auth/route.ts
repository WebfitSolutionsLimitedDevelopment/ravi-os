import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'

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
  if (String(body?.pin || '') !== pin) {
    return NextResponse.json({ ok: false, message: 'Incorrect PIN' }, { status: 401 })
  }

  const store = await cookies()
  store.set(cookieName, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(cookieName)
  return NextResponse.json({ ok: true })
}
