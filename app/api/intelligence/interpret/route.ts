import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { intelligenceAction } from '../../../../lib/server/intelligence-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

const DOMAINS=['general','finance','career','email','tasks','journal','family','projects','health']
const RISKS=['low','medium','high','critical']
function nzToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function addDays(date:string,days:number){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function monthNumber(name:string){const months=['january','february','march','april','may','june','july','august','september','october','november','december'];return months.indexOf(name.toLowerCase())+1}
function parseReminder(text:string,today:string){
  const lower=text.toLowerCase()
  if(!lower.includes('remind me')&&!lower.includes('reminder'))return null
  let date=''
  if(/\btomorrow\b/i.test(text))date=addDays(today,1)
  else if(/\btoday\b/i.test(text))date=today
  else{
    const m=text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s*)?(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*(20\d{2}))?/i)
    if(m){const month=monthNumber(m[2]);const currentYear=Number(today.slice(0,4));let year=m[3]?Number(m[3]):currentYear;let candidate=`${year}-${String(month).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;if(!m[3]&&candidate<today){year++;candidate=`${year}-${String(month).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`}date=candidate}
  }
  let time=''
  const tm=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if(tm){let h=Number(tm[1])%12;if(tm[3].toLowerCase()==='pm')h+=12;time=`${String(h).padStart(2,'0')}:${tm[2]||'00'}`}
  else if(/\bmorning\b/i.test(text))time='09:00'
  else if(/\bafternoon\b/i.test(text))time='15:00'
  else if(/\bevening\b/i.test(text))time='19:00'
  else if(/\bnight\b/i.test(text))time='20:00'
  let title=''
  const purpose=text.match(/\bso\s+i\s+can\s+(.+)$/i)||text.match(/\bso\s+that\s+i\s+can\s+(.+)$/i)
  if(purpose)title=purpose[1].trim()
  else{const to=text.match(/\bto\s+(.+)$/i);if(to)title=to[1].trim()}
  if(!title)title='Reminder'
  title=title.charAt(0).toUpperCase()+title.slice(1).replace(/[.]+$/,'')
  const complete=Boolean(date&&time)
  return {domain:'tasks',intent:'create_reminder',summary:complete?`Set reminder “${title}” for ${date} at ${time}.`:'I understood this as a reminder, but I still need a clear date and time.',confidence:complete?0.98:0.7,riskLevel:'low',requiresApproval:!complete,payload:{title,notes:'',date,time}}
}
async function record(source:string,inputText:string,result:any){const saved=await intelligenceAction('record',{domain:result.domain,source,inputText,intent:result.intent,payload:result.payload,confidence:result.confidence,riskLevel:result.riskLevel,requiresApproval:result.requiresApproval,status:result.requiresApproval?'pending_approval':'suggested',rationale:result.summary});if(!saved?.ok)return'';const x=await saved.json().catch(()=>({}));return String(x?.action?.id||'')}

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const body=await request.json().catch(()=>({}))
  const text=String(body.text||'').trim()
  if(!text)return NextResponse.json({error:'Text required'},{status:400})
  const source=body.source==='voice'?'voice':'text'
  const today=nzToday()
  const basic=parseReminder(text,today)
  if(basic){const actionId=await record(source,text,basic);return NextResponse.json({...basic,actionId,engine:'local'})}
  if(!aiEngineAvailable())return NextResponse.json({domain:'general',intent:'unsupported_without_ai',summary:'This command needs advanced interpretation. Routine reminders still work without the AI provider.',confidence:0.35,riskLevel:'low',requiresApproval:false,payload:{},engine:'local'})
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
- QUESTION about existing data — the person is ASKING what they have, not telling you to add/change anything (e.g. "what are my reminders today", "what do I have on", "how much did I spend today", "any tasks due", "what's my last health check-in", "anything for the family tomorrow"): intent=query_info payload:{topic:"reminders|tasks|waiting_for|health|finance|family",scope:"today|tomorrow|yesterday|week|upcoming|all"}. requiresApproval=false, riskLevel="low", confidence high if the topic is clear. Default scope to "today" if unclear. Do not fabricate an answer yourself — just classify which topic and scope they're asking about; the actual data is looked up separately.
- career question or "what should I do next" style strategy ask: keep intent=career_advice payload:{question:string,focus:string}. requiresApproval=false, riskLevel="low" — this is read-only advice, not an action.
Governance: sends, replies, deletes, payments, transfers, commitments and account changes are high risk and require approval. Notes and wellness logs may be low risk but still present for review. Tasks/family commitments are medium risk and require approval. Complete personal reminders may be low risk. Questions about existing data (query_info) are always low risk and never require approval. If ambiguous, lower confidence and preserve uncertainty instead of inventing facts.`
  try{
    const {data:parsed,engine}=await aiJson<any>({system,input:text,maxTokens:1100})
    const domain=DOMAINS.includes(parsed.domain)?parsed.domain:'general'
    const confidence=Math.max(0,Math.min(1,Number(parsed.confidence||0)))
    const riskLevel=RISKS.includes(parsed.riskLevel)?parsed.riskLevel:'medium'
    const result={domain,intent:String(parsed.intent||'unknown'),summary:String(parsed.summary||''),confidence,riskLevel,requiresApproval:parsed.requiresApproval!==false,payload:parsed.payload&&typeof parsed.payload==='object'?parsed.payload:{}}
    const actionId=await record(source,text,result)
    return NextResponse.json({...result,actionId,engine})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to interpret that command right now'},{status:500})}
}
