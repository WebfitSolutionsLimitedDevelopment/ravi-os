import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'

// Server-side speech-to-text for browsers that don't implement the Web
// Speech API (notably iOS Safari / Chrome-on-iOS, which never expose
// SpeechRecognition). The client records audio with MediaRecorder and
// posts the blob here; we forward it to OpenAI Whisper.
export async function POST(request: Request) {
  if ((await reminderActor()) !== 'ravi') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'Voice transcription is not configured on the server yet. Type your command below instead.' }, { status: 501 })
  const form = await request.formData().catch(() => null)
  const file = form?.get('audio')
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: 'No audio was received. Try again.' }, { status: 400 })
  if (file.size < 800) return NextResponse.json({ error: 'That recording was too short — tap the mic and speak right after.' }, { status: 400 })
  if (file.size > 24 * 1024 * 1024) return NextResponse.json({ error: 'That recording is too long. Keep it under a minute.' }, { status: 413 })
  const ext = file.type.includes('mp4') ? 'mp4' : file.type.includes('wav') ? 'wav' : file.type.includes('ogg') ? 'ogg' : file.type.includes('mpeg') ? 'mp3' : 'webm'
  const upstream = new FormData()
  upstream.append('file', file, `voice.${ext}`)
  upstream.append('model', 'whisper-1')
  upstream.append('response_format', 'json')
  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({ error: `Transcription failed (${res.status}): ${errText.slice(0, 200)}` }, { status: 502 })
    }
    const data = await res.json().catch(() => ({}))
    const text = String(data.text || '').trim()
    if (!text) return NextResponse.json({ error: "I couldn't make out any speech in that recording. Try again or type it." }, { status: 422 })
    return NextResponse.json({ text })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reach the transcription service' }, { status: 500 })
  }
}
