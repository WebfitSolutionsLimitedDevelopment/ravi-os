import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { intelligenceAction } from '../../../../lib/server/intelligence-client'

const DOMAINS=['general','finance','career','email','tasks','journal','family','projects','health']
const RISKS=['low','medium','high','critical']

function cleanJson(text:string){return text.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const body=await request.json().catch(()=>({}))
  const text=String(body.text||'').trim()
  if(!text)return NextResponse.json({error:'Text required'},{status:400})
  const source=body.source==='voice'?'voice':'text'
  const apiKey=process.env.OPENAI_API_KEY
  if(!apiKey)return NextResponse.json({error:'Ravi Intelligence is not configured'},{status:503})
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const system=`You are Ravi OS Intelligence Router. Your job is to understand one personal command and propose a governed action, never silently execute it. Return ONLY valid JSON.\n\nDate in Auckland: ${today}.\n\nJSON shape:\n{\n  "domain":"general|finance|career|email|tasks|journal|family|projects|health",\n  "intent":"short_snake_case",\n  "summary":"plain English one-line interpretation",\n  "confidence":0.0,\n  "riskLevel":"low|medium|high|critical",\n  "requiresApproval":true,\n  "payload":{}\n}\n\nImportant intent conventions:\n- finance transaction: intent=add_finance_transaction; payload={type:"income|expense|payment|transfer|asset|liability|adjustment",amount:number|null,currency:"NZD|INR|AUD|USD|...",category:string,merchant:string,date:"YYYY-MM-DD",notes:string}. Never invent amount.\n- note/journal: intent=capture_note; payload={title:string,content:string,type:"note|journal|decision|idea",tags:[]}\n- task: intent=create_task; payload={title:string,notes:string,dueDate:string,dueTime:string,priority:"high|medium|low",category:string}\n- reminder: domain=tasks, intent=create_reminder; payload={title:string,notes:string,date:string,time:string}\n- waiting on someone: intent=create_waiting_for; payload={title:string,person:string,organisation:string,followUpDate:string,priority:string}\n- email: intent=email_reply; payload={stance:"positive|negative|accept|reject|query|custom",instruction:string}. Never claim an email was sent.\n- career: intent=career_advice; payload={question:string,focus:string}.\n\nGovernance:\n- Any send/reply/delete/payment/transfer/financial commitment/account change is high risk and requiresApproval=true.\n- Creating a note may be low risk. Creating a task/reminder is medium risk and still requiresApproval=true.\n- For financial records, categorisation may be suggested but not silently posted.\n- If ambiguous, lower confidence and preserve uncertainty in summary/payload instead of inventing facts.`
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:[{role:'system',content:[{type:'input_text',text:system}]},{role:'user',content:[{type:'input_text',text}]}],max_output_tokens:900})})
    if(!r.ok)throw new Error(await r.text())
    const data=await r.json()
    const output=String(data.output_text||data.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'')
    const parsed=JSON.parse(cleanJson(output))
    const domain=DOMAINS.includes(parsed.domain)?parsed.domain:'general'
    const confidence=Math.max(0,Math.min(1,Number(parsed.confidence||0)))
    const riskLevel=RISKS.includes(parsed.riskLevel)?parsed.riskLevel:'medium'
    const result={domain,intent:String(parsed.intent||'unknown'),summary:String(parsed.summary||''),confidence,riskLevel,requiresApproval:parsed.requiresApproval!==false,payload:parsed.payload&&typeof parsed.payload==='object'?parsed.payload:{}}
    const saved=await intelligenceAction('record',{domain,source,inputText:text,intent:result.intent,payload:result.payload,confidence,riskLevel,requiresApproval:result.requiresApproval,status:result.requiresApproval?'pending_approval':'suggested',rationale:result.summary})
    let actionId=''
    if(saved?.ok){const s=await saved.json().catch(()=>({}));actionId=String(s?.action?.id||'')}
    return NextResponse.json({...result,actionId})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to interpret command'},{status:500})}
}
