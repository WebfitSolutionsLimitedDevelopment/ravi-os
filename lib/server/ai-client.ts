// Shared AI abstraction for Ravi OS. Prefers Anthropic (Claude) when
// ANTHROPIC_API_KEY is set, falls back to OpenAI when only OPENAI_API_KEY is
// set. Every call site asks for structured JSON back.

const ANTHROPIC_MODEL = 'claude-sonnet-5'
const OPENAI_MODEL = 'gpt-4o'

export type AIEngine = 'anthropic' | 'openai'

export function aiEngineAvailable(): AIEngine | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return null
}

export interface AIJsonOptions {
  system: string
  input: string
  /** data:image/...;base64,... — only used by callers that need vision */
  imageDataUrl?: string
  maxTokens?: number
}

export interface AIJsonResult<T = any> {
  data: T
  engine: AIEngine
}

function cleanJson(text: string) {
  const stripped = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim()
  // The model is told to "return ONLY JSON", but if it ever adds a stray
  // sentence before/after the object anyway, pull out the outermost {...}
  // block rather than failing the whole extraction over one wayward line.
  if (stripped.startsWith('{') && stripped.endsWith('}')) return stripped
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start !== -1 && end > start) return stripped.slice(start, end + 1)
  return stripped
}

function parseImageDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid image data URL')
  return { mediaType: match[1], data: match[2] }
}

async function callAnthropic(opts: AIJsonOptions): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!
  const content: any[] = []
  if (opts.imageDataUrl) {
    const { mediaType, data } = parseImageDataUrl(opts.imageDataUrl)
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })
  }
  content.push({ type: 'text', text: opts.input })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens || 1200,
      system: opts.system,
      messages: [{ role: 'user', content }],
    }),
    // Vision calls on a busy screenshot can run long; fail with a clear,
    // catchable error well before Vercel's own function timeout kills the
    // request and hands the client an opaque non-JSON response.
    signal: AbortSignal.timeout(50000),
  })
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  const blocks = Array.isArray(data.content) ? data.content : []
  return blocks
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text || '')
    .join('')
}

async function callOpenAI(opts: AIJsonOptions): Promise<string> {
  const key = process.env.OPENAI_API_KEY!
  const content: any[] = [{ type: 'input_text', text: opts.input }]
  if (opts.imageDataUrl) content.push({ type: 'input_image', image_url: opts.imageDataUrl, detail: 'high' })
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: opts.system }] },
        { role: 'user', content },
      ],
      max_output_tokens: opts.maxTokens || 1200,
    }),
    signal: AbortSignal.timeout(50000),
  })
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return String(
    data.output_text ||
      (data.output || []).flatMap((x: any) => x.content || []).map((x: any) => x.text || '').join('') ||
      ''
  )
}

/** Calls whichever AI provider is configured and parses the reply as JSON. */
export async function aiJson<T = any>(opts: AIJsonOptions): Promise<AIJsonResult<T>> {
  const engine = aiEngineAvailable()
  if (!engine) throw new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)')
  const raw = engine === 'anthropic' ? await callAnthropic(opts) : await callOpenAI(opts)
  let parsed: T
  try {
    parsed = JSON.parse(cleanJson(raw))
  } catch {
    throw new Error(`AI response was not valid JSON: ${raw.slice(0, 300)}`)
  }
  return { data: parsed, engine }
}
