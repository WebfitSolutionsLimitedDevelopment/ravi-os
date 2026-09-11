import { NextResponse } from 'next/server'
import { reminderActor } from '../../../lib/server/ravi-os-auth'

export async function POST(request:Request){
  if(!await reminderActor())return NextResponse.json({error:'Unauthorized'},{status:401})
  const apiKey=process.env.OPENAI_API_KEY
  if(!apiKey)return NextResponse.json({error:'AI poster extraction is not configured'},{status:503})
  try{
    const body=await request.json();const image=String(body.image||'')
    if(!/^data:image\//.test(image))return NextResponse.json({error:'Invalid image'},{status:400})
    const prompt=`Read this event poster visually. Return ONLY valid JSON with exactly these keys: title, date, time, venue, address, confidence.\nRules:\n- title: the main event name exactly as intended by the poster. Do not use organiser name, slogan, sponsor, checklist or branding as the title.\n- date: YYYY-MM-DD only if clearly visible, otherwise empty string.\n- time: HH:mm in 24-hour format only if clearly visible, otherwise empty string.\n- venue: venue/building name only.\n- address: street/suburb/city address only.\n- confidence: number 0 to 1 representing confidence in all five fields.\n- Ignore decorative characters, QR codes, prices, phone numbers, slogans, sponsor names and instructions.\n- Posters may be English, Hindi, Gujarati or mixed language.\n- Never invent a missing field.`
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:image,detail:'high'}]}],max_output_tokens:500})})
    if(!response.ok)throw new Error(await response.text())
    const data=await response.json()
    const text=String(data.output_text||data.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()
    const parsed=JSON.parse(text)
    return NextResponse.json({title:String(parsed.title||'').trim(),date:String(parsed.date||'').trim(),time:String(parsed.time||'').trim(),venue:String(parsed.venue||'').trim(),address:String(parsed.address||'').trim(),confidence:Number(parsed.confidence||0)})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to read poster'},{status:500})}
}
