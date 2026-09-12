import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

export async function POST(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'Health Intelligence is not configured'},{status:503})
  const r=await controlAction('health_get');const context=r?.ok?await r.json():{metrics:[],rules:[]}
  const system=`You are Ravi OS Wellness Intelligence. Analyse only lifestyle/wellness signals such as sleep consistency, activity, hydration and protein tracking. Do not diagnose disease, prescribe medication, or make medical claims. If data is missing, say so. If a pattern could merit medical attention, advise discussing it with a qualified clinician rather than speculating. Return ONLY JSON: {"headline":"","status":"good|watch|attention","observations":[],"lowRiskActions":[{"action":"","why":""}],"missingData":[],"professionalCheck":null}.`
  try{const {data:advice}=await aiJson<any>({system,input:`Context: ${JSON.stringify(context).slice(0,16000)}`,maxTokens:1200});return NextResponse.json({advice})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Wellness review failed'},{status:500})}
}
