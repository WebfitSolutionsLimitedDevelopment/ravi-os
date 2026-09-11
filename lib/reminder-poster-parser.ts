export type ParsedPoster = {
  title: string
  venue: string
}

const noisePatterns = [
  /^(event reminder|save the date|lead|inspire|connect|celebrate|same stronger brighter|don't forget!?|good stories build stronger communities)$/i,
  /^(event highlights?|registrations?|registration is mandatory|fundraising|support our|for any inquiry|for any enquiry|contact|book as soon as possible|nominations?|cultural performance|dinner|aarti|annakut|community togetherness)$/i,
  /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i,
  /^(presents?|presented by)$/i,
  /^\d{1,2}[\s\/:.-]/,
  /^(nz\$|\$|phone|mob|email|www\.|https?:\/\/|qr\b)/i,
]

const eventWords = /(women to watch|diwali|celebration|festival|event|garba|navratri|concert|show|meeting|conference|workshop|puja|pooja|sunderkand|mehfil|teej|holi|function|samagam|utsav|mela|awards?|gala|ceremony|दिवाली|उत्सव|समारोह|कार्यक्रम|पूजा|गरबा|होली)/i
const orgWords = /(parivar|association|society|trust|foundation|mandal|temple|centre|center|club|community|nz|new zealand|परिवार|संस्था|मंडल|समिति)/i
const venueWords = /(cordis|centre|center|hall|hotel|temple|mandir|community hall|avenue|street|road|rd\b|lane|drive|papatoetoe|auckland|hamilton|wellington|christchurch|स्थान|भवन|मंदिर)/i

function cleanLine(line: string) {
  return line
    .replace(/[|•●◆◇■□★☆»«]+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}).,'&\- ]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function useful(line: string) {
  if (line.length < 3 || line.length > 120) return false
  if (!/[\p{L}]/u.test(line)) return false
  if (noisePatterns.some(pattern => pattern.test(line))) return false
  const letters = (line.match(/[\p{L}]/gu) || []).length
  const weird = (line.match(/[^\p{L}\p{N}\s&'().,\-]/gu) || []).length
  if (weird > Math.max(2, Math.floor(line.length * 0.12))) return false
  return letters >= 3
}

function scoreTitle(line: string, index: number) {
  let score = Math.max(0, 30 - index)
  if (eventWords.test(line)) score += 70
  if (orgWords.test(line)) score += 10
  if (/\b20\d{2}\b/.test(line) && eventWords.test(line)) score += 8
  if (/^[A-Z0-9 &.'-]{5,}$/u.test(line)) score += 8
  if (/\b(am|pm|onwards?|late|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b/i.test(line)) score -= 35
  if (venueWords.test(line) && !eventWords.test(line)) score -= 20
  if ((line.match(/\d/g) || []).length > 6 && !/\b20\d{2}\b/.test(line)) score -= 25
  if (/\b(attend|introduce|cover|explore|media partnership|article|photos?)\b/i.test(line)) score -= 50
  return score
}

export function parsePosterSemantics(raw: string): ParsedPoster {
  const lines = raw.split(/\n+/).map(cleanLine).filter(useful)
  const ranked = lines.map((line, index) => ({ line, score: scoreTitle(line, index) })).sort((a, b) => b.score - a.score)

  let title = ranked[0]?.line || ''

  if (title && eventWords.test(title)) {
    const titleIndex = lines.indexOf(title)
    const previous = titleIndex > 0 ? lines[titleIndex - 1] : ''
    if (previous && orgWords.test(previous) && !eventWords.test(previous) && previous.length + title.length < 115) {
      title = `${previous} ${title}`
    }
  }

  if (!title || title.length < 4 || !/[\p{L}]{3}/u.test(title)) title = 'Event reminder'

  const venueLine = lines.find(line => venueWords.test(line) && !eventWords.test(line) && line !== title) || ''
  const venueIndex = venueLine ? lines.indexOf(venueLine) : -1
  const nextLine = venueIndex >= 0 ? lines[venueIndex + 1] || '' : ''
  const addressLike = /\d+\s+.+(street|st\b|avenue|ave\b|road|rd\b|lane|drive|auckland|papatoetoe|cbd)/i.test(nextLine)
  const venue = addressLike ? `${venueLine}, ${nextLine}` : venueLine

  return { title: title.slice(0, 120), venue: venue.slice(0, 180) }
}
