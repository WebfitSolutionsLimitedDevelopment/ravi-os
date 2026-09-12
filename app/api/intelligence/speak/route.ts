import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'

// Realistic text-to-speech for spoken assistant replies, using OpenAI's
// speech models (much more natural than the browser's built-in
// speechSynthesis voices). Falls back to the browser voice on the client
// if this isn't configured or fails.
const VOICE = process.env.RAVI_OS_VOICE || 'onyx'
const MODELS = ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1']

export async function POST(request: Request) {
  if ((await reminderActor()) !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'not_configured' }, { status: 501 })
  const body = await request.json().catch(() => ({}))
  const text = String(body.text || '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ error: 'No text supplied' }, { status: 400 })

  let lastErr = ''
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, voice: VOICE, input: text, response_format: 'mp3' }),
      })
      if (!res.ok) {
        lastErr = `${model}: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      return new NextResponse(buf, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
    }
  }
  return NextResponse.json({ error: `Speech synthesis failed: ${lastErr}` }, { status: 502 })
}
