import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { intelligenceAction } from '../../../../lib/server/intelligence-client'

const DOMAINS=['general','finance','career','email','tasks','journal','family','projects','health']
const RISKS=['low','medium','high','critical']
function cleanJson(text:string){return text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}
export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const body=await request.json().catch(()=>({})),text=String(body.text||'').trim();if(!text)return NextResponse.json({error:'Text required'},{status:400});const source=body.source==='voice'?'voice':'text',apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:'Ravi Intelligence is not configured'},{status:503})
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const system=`You are Ravi OS Intelligence Router. Understand one personal command and propose a governed action. Never silently execute. Date in Auckland: ${today}. Return ONLY JSON: {"domain":"general|finance|career|email|tasks|journal|family|projects|health","intent":"short_snake_case","summary":"one-line interpretation","confidence":0.0,"riskLevel":"low|medium|high|critical","requiresApproval":true,"payload":{}}.
Intent conventions:
- finance transaction: add_finance_transaction {type:"income|expense|payment|transfer|asset|liability|adjustment",amount:number|null,currency:string,category:string,merchant:string,date:"YYYY-MM-DD",notes:string}. Never invent amount.
- note/journal/decision/idea: domain=journal intent=capture_note {title:string,content:string,type:"note|journal|decision|idea",tags:[]}.
- task: domain=tasks intent=create_task {title:string,notes:string,dueDate:string,dueTime:string,priority:"high|medium|low",category:string}.
- reminder: domain=tasks intent=create_reminder {title:string,notes:string,date:string,time:string}.
- waiting on someone: domain=tasks intent=create_waiting_for {title:string,person:string,organisation:string,followUpDate:string,followUpTime:string,priority:string,channel:string}.
- family commitment: domain=family intent=create_family_commitment {title:string,notes:string,eventDate:string,eventTime:string,category:string,assignedTo:"ravi|geet|family",priority:string}.
- health/wellness capture: domain=health intent=health_log {date:"YYYY-MM-DD",sleepHours:number|null,steps:number|null,proteinG:number|null,waterMl:number|null,exerciseMinutes:number|null,weightKg:number|null,notes:string}. Do not infer unspoken values.
- project/construction note: domain=projects intent=project_note {content:string,type:"note|risk|decision|action"}.
- email: domain=email intent=email_reply {stance:"positive|negative|accept|reject|query|custom",instruction:string}. Never claim an email was sent.
- career: domain=career intent=career_advice {question:string,focus:string}.
Governance: sends, replies, deletes, payments, transfers, commitments and account changes are high risk and require approval. Notes and wellness logs may be low risk but still present for review. Tasks/reminders/family commitments are medium risk and require approval. If ambiguous, lower confidence and preserve uncertainty instead of inventing facts.`
  try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:[{role:'system',content:[{type:'input_text',text:system}]},{role:'user',content:[{type:'input_text',text}]}],max_output_tokens:1100})});if(!r.ok)throw new Error(await r.text());const data=await r.json(),output=String(data.output_text||data.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||''),parsed=JSON.parse(cleanJson(output)),domain=DOMAINS.includes(parsed.domain)?parsed.domain:'general',confidence=Math.max(0,Math.min(1,Number(parsed.confidence||0))),riskLevel=RISKS.includes(parsed.riskLevel)?parsed.riskLevel:'medium',result={domain,intent:String(parsed.intent||'unknown'),summary:String(parsed.summary||''),confidence,riskLevel,requiresApproval:parsed.requiresApproval!==false,payload:parsed.payload&&typeof parsed.payload==='object'?parsed.payload:{}};const saved=await intelligenceAction('record',{domain,source,inputText:text,intent:result.intent,payload:result.payload,confidence,riskLevel,requiresApproval:result.requiresApproval,status:result.requiresApproval?'pending_approval':'suggested',rationale:result.summary});let actionId='';if(saved?.ok){const x=await saved.json().catch(()=>({}));actionId=String(x?.action?.id||'')}return NextResponse.json({...result,actionId})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to interpret command'},{status:500})}
}
