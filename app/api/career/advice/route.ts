import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'

function clean(s:string){return s.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}
export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:'Career Intelligence is not configured'},{status:503})
  const body=await request.json().catch(()=>({}))
  const dataResponse=await controlAction('career_get');const context=dataResponse?.ok?await dataResponse.json():{profile:null,opportunities:[]}
  const focus=String(body.focus||'overall career strategy')
  const opportunity=body.opportunity||null
  const prompt=`You are Ravi OS Career Strategist. Give senior-career advice, not motivational filler. The user is targeting senior technology leadership roles in New Zealand and Australia. Analyse evidence, positioning, gaps and next actions. Do not invent market data or salaries. If a job description is provided, score fit only from the supplied evidence. Return ONLY JSON:\n{"headline":"","assessment":"","fitScore":null,"strengths":[],"gaps":[],"nextActions":[{"action":"","why":"","priority":"high|medium|low"}],"interviewAngles":[],"portfolioEvidence":[],"risks":[]}\nFocus: ${focus}\nStored career context: ${JSON.stringify(context).slice(0,18000)}\nOpportunity under review: ${JSON.stringify(opportunity).slice(0,14000)}`
  try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,max_output_tokens:1800})});if(!r.ok)throw new Error(await r.text());const d=await r.json();const text=String(d.output_text||d.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'');return NextResponse.json({advice:JSON.parse(clean(text))})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Career review failed'},{status:500})}
}
