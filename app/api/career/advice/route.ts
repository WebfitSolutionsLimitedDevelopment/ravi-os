import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'Career Intelligence is not configured'},{status:503})
  const body=await request.json().catch(()=>({}))
  const dataResponse=await controlAction('career_get');const context=dataResponse?.ok?await dataResponse.json():{profile:null,opportunities:[]}
  const focus=String(body.focus||'overall career strategy')
  const opportunity=body.opportunity||null
  const system=`You are Ravi OS Career Strategist. Give senior-career advice, not motivational filler. The user is targeting senior technology leadership roles in New Zealand and Australia. Analyse evidence, positioning, gaps and next actions. Do not invent market data or salaries. If a job description is provided, score fit only from the supplied evidence. Return ONLY JSON:\n{"headline":"","assessment":"","fitScore":null,"strengths":[],"gaps":[],"nextActions":[{"action":"","why":"","priority":"high|medium|low"}],"interviewAngles":[],"portfolioEvidence":[],"risks":[]}`
  const input=`Focus: ${focus}\nStored career context: ${JSON.stringify(context).slice(0,18000)}\nOpportunity under review: ${JSON.stringify(opportunity).slice(0,14000)}`
  try{const {data:advice}=await aiJson<any>({system,input,maxTokens:1800});return NextResponse.json({advice})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Career review failed'},{status:500})}
}
