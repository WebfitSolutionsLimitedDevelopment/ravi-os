import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { aiEngineAvailable, aiJson } from '../../../lib/server/ai-client'

function nzToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
// Most event posters print a day and month ("19 September") with no year
// at all. Letting the AI guess a year for a date that isn't actually on
// the poster is how a poster for an upcoming event ends up stamped with
// last year's date and immediately shows as "Overdue" — so the year is
// never trusted from the model. When the poster doesn't print one, this
// resolves to the next upcoming occurrence of that day/month instead,
// the same rule used everywhere else a bare date is parsed in this app.
function resolveDate(day:number,month:number,year:number|null,today:string):string{
  if(!day||!month)return''
  const dd=String(day).padStart(2,'0'),mm=String(month).padStart(2,'0')
  if(year)return `${year}-${mm}-${dd}`
  const currentYear=Number(today.slice(0,4))
  let candidate=`${currentYear}-${mm}-${dd}`
  if(candidate<today)candidate=`${currentYear+1}-${mm}-${dd}`
  return candidate
}

export async function POST(request:Request){
  if(!await reminderActor())return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'AI poster extraction is not configured'},{status:503})
  try{
    const body=await request.json();const image=String(body.image||'')
    if(!/^data:image\//.test(image))return NextResponse.json({error:'Invalid image'},{status:400})
    const system=`Read this event poster visually. Return ONLY valid JSON with exactly these keys: title, day, month, year, time, venue, address, confidence.\nRules:\n- title: the main event name exactly as intended by the poster. Do not use organiser name, slogan, sponsor, checklist or branding as the title.\n- day: the day-of-month number (1-31) if a date is visible, otherwise null.\n- month: the month number (1-12) if a date is visible, otherwise null.\n- year: a 4-digit year ONLY if it is explicitly printed on the poster somewhere near the date. Most posters only print a day and month ("19 September") with no year at all — in that case year MUST be null. Never infer, assume or calculate a year that is not actually printed.\n- time: HH:mm in 24-hour format only if clearly visible, otherwise empty string.\n- venue: venue/building name only.\n- address: street/suburb/city address only.\n- confidence: number 0 to 1 representing confidence in all fields.\n- Ignore decorative characters, QR codes, prices, phone numbers, slogans, sponsor names and instructions.\n- Posters may be English, Hindi, Gujarati or mixed language.\n- Never invent a missing field.`
    const {data:parsed}=await aiJson<any>({system,input:'Read the attached poster image.',imageDataUrl:image,maxTokens:500})
    const day=Number(parsed.day)||0,month=Number(parsed.month)||0
    const year=Number(parsed.year)>=2000?Number(parsed.year):null
    const date=resolveDate(day,month,year,nzToday())
    return NextResponse.json({title:String(parsed.title||'').trim(),date,time:String(parsed.time||'').trim(),venue:String(parsed.venue||'').trim(),address:String(parsed.address||'').trim(),confidence:Number(parsed.confidence||0)})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read poster'},{status:500})}
}
