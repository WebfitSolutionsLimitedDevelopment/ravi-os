import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'

function clean(s:string){return s.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}
export async function POST(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:'Health Intelligence is not configured'},{status:503})
  const r=await controlAction('health_get');const context=r?.ok?await r.json():{metrics:[],rules:[]}
  const prompt=`You are Ravi OS Wellness Intelligence. Analyse only lifestyle/wellness signals such as sleep consistency, activity, hydration and protein tracking. Do not diagnose disease, prescribe medication, or make medical claims. If data is missing, say so. If a pattern could merit medical attention, advise discussing it with a qualified clinician rather than speculating. Return ONLY JSON: {"headline":"","status":"good|watch|attention","observations":[],"lowRiskActions":[{"action":"","why":""}],"missingData":[],"professionalCheck":null}. Context: ${JSON.stringify(context).slice(0,16000)}`
  try{const x=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,max_output_tokens:1200})});if(!x.ok)throw new Error(await x.text());const d=await x.json();const text=String(d.output_text||d.output?.flatMap((y:any)=>y.content||[]).map((y:any)=>y.text||'').join('')||'');return NextResponse.json({advice:JSON.parse(clean(text))})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Wellness review failed'},{status:500})}
}
