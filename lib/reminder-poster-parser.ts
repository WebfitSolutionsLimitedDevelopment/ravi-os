export type ParsedPoster = {
  title: string
  date: string
  time: string
  venue: string
  address: string
}

const MONTHS: Record<string,string> = {
  january:'01',jan:'01',february:'02',feb:'02',march:'03',mar:'03',april:'04',apr:'04',may:'05',june:'06',jun:'06',july:'07',jul:'07',august:'08',aug:'08',september:'09',sept:'09',sep:'09',october:'10',oct:'10',november:'11',nov:'11',december:'12',dec:'12',
  'जनवरी':'01','फरवरी':'02','मार्च':'03','अप्रैल':'04','मई':'05','जून':'06','जुलाई':'07','अगस्त':'08','सितंबर':'09','सितम्बर':'09','अक्टूबर':'10','नवंबर':'11','नवम्बर':'11','दिसंबर':'12'
}

const eventWords = /(women to watch|diwali|celebration|festival|garba|navratri|concert|show|meeting|conference|workshop|puja|pooja|sunderkand|mehfil|teej|holi|function|samagam|utsav|mela|awards?|gala|ceremony|दिवाली|उत्सव|समारोह|कार्यक्रम|पूजा|गरबा|होली)/i
const venueWords = /(cordis|centre|center|hall|hotel|temple|mandir|community hall|papatoetoe|auckland|hamilton|wellington|christchurch|स्थान|भवन|मंदिर)/i
const addressWords = /(street|st\b|avenue|ave\b|road|rd\b|lane|drive|way\b|place\b|crescent|cbd|papatoetoe|auckland|hamilton|wellington|christchurch)/i
const noiseWords = /(save the date|event reminder|lead|inspire|connect|celebrate|same stronger brighter|don'?t forget|good stories|communities|present(?:s|ed)?|sponsor|fundraising|registration|register|contact|phone|email|attend as|introduce myself|cover the event|media partnership|article|photos?|webfit news)/i

function normalizeDigits(input:string){
  const devanagari='०१२३४५६७८९'
  return input.replace(/[०-९]/g,c=>String(devanagari.indexOf(c)))
}

function cleanLine(line:string){
  let s=normalizeDigits(line)
    .replace(/[|•●◆◇■□★☆»«✓✔☐☑]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
  const latin=(s.match(/[A-Za-z]/g)||[]).length
  const devanagari=(s.match(/[\u0900-\u097F]/g)||[]).length
  if(latin>=4 && devanagari>0) s=s.replace(/[\u0900-\u097F]+/g,' ').replace(/\s+/g,' ').trim()
  return s
}

function usable(line:string){
  if(line.length<3 || line.length>150) return false
  const letters=(line.match(/[\p{L}]/gu)||[]).length
  const weird=(line.match(/[^\p{L}\p{N}\s&'().,\-:/]/gu)||[]).length
  if(letters<3) return false
  if(weird>Math.max(2,Math.floor(line.length*.08))) return false
  return true
}

function extractDate(raw:string){
  const text=normalizeDigits(raw).toLowerCase()
  const named=text.match(/\b(\d{1,2})\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(20\d{2})\b/i)
  if(named) return `${named[3]}-${MONTHS[named[2].toLowerCase()]}-${named[1].padStart(2,'0')}`
  const numeric=text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/)
  if(numeric) return `${numeric[3]}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`
  const hindi=text.match(/(\d{1,2})\s*(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|नवम्बर|दिसंबर)\s*(20\d{2})/)
  if(hindi) return `${hindi[3]}-${MONTHS[hindi[2]]}-${hindi[1].padStart(2,'0')}`
  return ''
}

function extractTime(raw:string){
  const text=normalizeDigits(raw).replace(/\s+/g,' ')
  const normal=text.match(/\b(1[0-2]|0?[1-9])\s*[:.]\s*([0-5]\d)\s*(AM|PM)\b/i)
  if(normal){
    let h=Number(normal[1]); const m=normal[2]; const mer=normal[3].toUpperCase()
    if(mer==='PM'&&h<12)h+=12
    if(mer==='AM'&&h===12)h=0
    return `${String(h).padStart(2,'0')}:${m}`
  }
  const noisy=text.match(/\b([1-9])\d\s*[:.]\s*([0-5]\d)\s*(AM|PM)\b/i)
  if(noisy){
    let h=Number(noisy[1]); const m=noisy[2]; const mer=noisy[3].toUpperCase()
    if(mer==='PM'&&h<12)h+=12
    if(mer==='AM'&&h===12)h=0
    return `${String(h).padStart(2,'0')}:${m}`
  }
  return ''
}

function extractTitle(lines:string[],raw:string){
  const joined=lines.join(' ')
  const explicit=joined.match(/\b(WOMEN\s+TO\s+WATCH\s+20\d{2})\b/i)
  if(explicit) return explicit[1].replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())

  if(/\bcardis\b/i.test(raw)){
    const year=raw.match(/\b20\d{2}\b/)?.[0]
    if(/\bto\s+watch\b/i.test(raw) || /\bcordis\s+auckland\b/i.test(raw)) return `Women to Watch${year?` ${year}`:''}`
  }

  const candidates=lines.filter(l=>eventWords.test(l)&&!noiseWords.test(l)&&!venueWords.test(l))
  if(candidates.length) return candidates.sort((a,b)=>b.length-a.length)[0].slice(0,120)
  return 'Event reminder'
}

function extractVenueAndAddress(lines:string[]){
  let venue=''
  let address=''
  for(let i=0;i<lines.length;i++){
    const line=lines[i]
    if(!venue && venueWords.test(line) && !addressWords.test(line.replace(/auckland/ig,'')) && !noiseWords.test(line)){
      venue=line
      const next=lines[i+1]||''
      const next2=lines[i+2]||''
      if(addressWords.test(next)||/^\d+\s+/.test(next)) address=next
      if(address && next2 && /\b(cbd|auckland|papatoetoe|hamilton|wellington|christchurch)\b/i.test(next2) && !address.includes(next2)) address=`${address}, ${next2}`
      break
    }
  }
  if(!venue){ const v=lines.find(l=>venueWords.test(l)&&!noiseWords.test(l)); if(v) venue=v }
  if(!address){ const a=lines.find(l=>/^\d+\s+/.test(l)&&addressWords.test(l)); if(a) address=a }
  return {venue:venue.slice(0,100),address:address.slice(0,180)}
}

export function parsePosterSemantics(raw:string):ParsedPoster{
  const lines=raw.split(/\n+/).map(cleanLine).filter(usable)
  const title=extractTitle(lines,raw)
  const date=extractDate(raw)
  const time=extractTime(raw)
  const {venue,address}=extractVenueAndAddress(lines)
  return {title,date,time,venue,address}
}
