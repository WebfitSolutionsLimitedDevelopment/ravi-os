import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { googleSuiteConfigured, listRecentGmail } from '../../../../lib/server/google-suite'

function clean(s:string){return s.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}
function parseFrom(v:string){const m=v.match(/^(.*?)\s*<([^>]+)>$/);return m?{name:m[1].replace(/^"|"$/g,'').trim(),email:m[2].trim()}:{name:v.includes('@')?'':v,email:v.includes('@')?v:''}}
export async function POST(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleSuiteConfigured())return NextResponse.json({error:'Google OAuth is not configured yet',configured:false},{status:503})
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:'Email Intelligence is not configured'},{status:503})
  try{
    const raw=(await listRecentGmail(35)) as any[]
    const compact=raw.map(x=>({id:x.id,from:x.from,subject:x.subject,snippet:x.snippet,date:x.date,labelIds:x.labelIds}))
    const prompt=`You are Ravi OS Personal Secretary. Classify email metadata for a busy senior technology leader. Ignore marketing/newsletter noise unless it clearly requires action. Return ONLY JSON array with one object per input id: {"id":"","classification":"action|waiting|fyi|noise","importanceScore":0-100,"requiresReply":true|false,"suggestedStance":"positive|negative|accept|reject|query|custom|null","summary":"one sentence","deadlineAt":null}. Do not invent deadlines. Action means Ravi must do/reply/decide. Waiting means Ravi is waiting on the sender or another party. FYI is useful but no action. Noise is low-value. Input: ${JSON.stringify(compact).slice(0,26000)}`
    const ai=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,max_output_tokens:5000})})
    if(!ai.ok)throw new Error(`Email classification failed (${ai.status})`)
    const d=await ai.json(),text=String(d.output_text||d.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'');const classes=JSON.parse(clean(text));const by=new Map((Array.isArray(classes)?classes:[]).map((x:any)=>[String(x.id),x]))
    const items=raw.map(x=>{const c:any=by.get(String(x.id))||{},from=parseFrom(String(x.from||''));return{mailbox:'google-primary',provider_message_id:String(x.id),provider_thread_id:String(x.threadId||''),sender_name:from.name,sender_email:from.email,subject:String(x.subject||''),received_at:x.date?new Date(x.date).toISOString():new Date().toISOString(),snippet:String(x.snippet||'').slice(0,1200),classification:['action','waiting','fyi','noise'].includes(c.classification)?c.classification:'fyi',importance_score:Math.max(0,Math.min(100,Number(c.importanceScore||50))),requires_reply:Boolean(c.requiresReply),reply_status:Boolean(c.requiresReply)?'recommended':'none',suggested_stance:c.suggestedStance||null,deadline_at:c.deadlineAt||null,summary:String(c.summary||'').slice(0,1000),last_synced_at:new Date().toISOString()}})
    const saved=await controlAction('email_upsert_batch',{items});if(!saved?.ok)throw new Error('Unable to save email intelligence');return NextResponse.json({synced:items.length,actions:items.filter(x=>x.classification==='action').length,waiting:items.filter(x=>x.classification==='waiting').length})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Email sync failed'},{status:500})}
}
