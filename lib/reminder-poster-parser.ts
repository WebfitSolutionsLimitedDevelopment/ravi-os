export type ParsedPoster = {
  title: string
  venue: string
}

const noisePatterns = [
  /^(event highlights?|registrations?|registration is mandatory|fundraising|support our|for any inquiry|for any enquiry|contact|book as soon as possible|nominations?|cultural performance|dinner|aarti|annakut|community togetherness)$/i,
  /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i,
  /^\d{1,2}[\s\/:.-]/,
  /^(nz\$|\$|phone|mob|email|www\.|https?:\/\/|qr\b)/i,
]

const eventWords = /(diwali|celebration|festival|event|garba|navratri|concert|show|meeting|conference|workshop|puja|pooja|sunderkand|mehfil|teej|holi|function|samagam|utsav|mela|दिवाली|उत्सव|समारोह|कार्यक्रम|पूजा|गरबा|होली)/i
const orgWords = /(parivar|association|society|trust|foundation|mandal|temple|centre|center|club|community|nz|new zealand|परिवार|संस्था|मंडल|समिति)/i
const venueWords = /(centre|center|hall|temple|mandir|community hall|avenue|street|road|rd\b|lane|drive|papatoetoe|auckland|hamilton|wellington|christchurch|स्थान|भवन|मंदिर)/i

function cleanLine(line: string) {
  return line
    .replace(/[|•●◆◇■□★☆»«]+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}).,'&\- ]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function useful(line: string) {
  if (line.length < 4 || line.length > 120) return false
  if (!/[\p{L}]/u.test(line)) return false
  if (noisePatterns.some(pattern => pattern.test(line))) return false
  const letters = (line.match(/[\p{L}]/gu) || []).length
  return letters >= 3
}

function scoreTitle(line: string, index: number) {
  let score = Math.max(0, 28 - index * 2)
  if (eventWords.test(line)) score += 55
  if (orgWords.test(line)) score += 18
  if (/^[A-Z0-9 &.'-]{5,}$/u.test(line)) score += 10
  if (/\b(20\d{2}|am|pm|onwards?)\b/i.test(line)) score -= 30
  if (venueWords.test(line) && !eventWords.test(line)) score -= 14
  if ((line.match(/\d/g) || []).length > 5) score -= 20
  if (/^[\W_]+$/u.test(line)) score -= 100
  return score
}

export function parsePosterSemantics(raw: string): ParsedPoster {
  const lines = raw.split(/\n+/).map(cleanLine).filter(useful)
  const ranked = lines
    .map((line, index) => ({ line, score: scoreTitle(line, index) }))
    .sort((a, b) => b.score - a.score)

  let title = ranked[0]?.line || ''

  // OCR often splits the organisation and event name across adjacent lines.
  if (title && eventWords.test(title)) {
    const titleIndex = lines.indexOf(title)
    const previous = titleIndex > 0 ? lines[titleIndex - 1] : ''
    if (previous && orgWords.test(previous) && !eventWords.test(previous) && previous.length + title.length < 115) {
      title = `${previous} ${title}`
    }
  }

  if (!title || title.length < 5 || !/[\p{L}]{3}/u.test(title)) {
    title = 'Event reminder'
  }

  const venueCandidate = lines.find(line => venueWords.test(line) && !eventWords.test(line) && line !== title) || ''
  return { title: title.slice(0, 120), venue: venueCandidate.slice(0, 180) }
}
