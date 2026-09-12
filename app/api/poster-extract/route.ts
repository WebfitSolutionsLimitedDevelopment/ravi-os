import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { aiEngineAvailable, aiJson } from '../../../lib/server/ai-client'

export async function POST(request:Request){
  if(!await reminderActor())return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'AI poster extraction is not configured'},{status:503})
  try{
    const body=await request.json();const image=String(body.image||'')
    if(!/^data:image\//.test(image))return NextResponse.json({error:'Invalid image'},{status:400})
    const system=`Read this event poster visually. Return ONLY valid JSON with exactly these keys: title, date, time, venue, address, confidence.\nRules:\n- title: the main event name exactly as intended by the poster. Do not use organiser name, slogan, sponsor, checklist or branding as the title.\n- date: YYYY-MM-DD only if clearly visible, otherwise empty string.\n- time: HH:mm in 24-hour format only if clearly visible, otherwise empty string.\n- venue: venue/building name only.\n- address: street/suburb/city address only.\n- confidence: number 0 to 1 representing confidence in all five fields.\n- Ignore decorative characters, QR codes, prices, phone numbers, slogans, sponsor names and instructions.\n- Posters may be English, Hindi, Gujarati or mixed language.\n- Never invent a missing field.`
    const {data:parsed}=await aiJson<any>({system,input:'Read the attached poster image.',imageDataUrl:image,maxTokens:500})
    return NextResponse.json({title:String(parsed.title||'').trim(),date:String(parsed.date||'').trim(),time:String(parsed.time||'').trim(),venue:String(parsed.venue||'').trim(),address:String(parsed.address||'').trim(),confidence:Number(parsed.confidence||0)})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read poster'},{status:500})}
}
