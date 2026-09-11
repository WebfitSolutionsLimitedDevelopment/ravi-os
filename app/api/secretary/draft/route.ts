import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'

function clean(s:string){return s.trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()}
export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return NextResponse.json({error:'Email Intelligence is not configured'},{status:503})
  const b=await request.json().catch(()=>({}));const id=String(b.id||''),stance=String(b.stance||'custom'),instruction=String(b.instruction||'')
  const list=await controlAction('email_list');const data=list?.ok?await list.json():{items:[]};const item=(data.items||[]).find((x:any)=>x.id===id);if(!item)return NextResponse.json({error:'Email item not found'},{status:404})
  const prompt=`You are Ravi OS Personal Secretary. Draft a concise, human, professional reply to the email metadata below. Do not invent facts or commitments. Stance requested: ${stance}. Extra instruction: ${instruction||'none'}. If the available context is insufficient, phrase the reply conservatively and ask the minimum necessary question. Return ONLY JSON {"draft":"","reasoning":"one short sentence","risk":"low|medium|high"}. Email: ${JSON.stringify(item).slice(0,10000)}`
  try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,max_output_tokens:1000})});if(!r.ok)throw new Error(await r.text());const d=await r.json();const text=String(d.output_text||d.output?.flatMap((x:any)=>x.content||[]).map((x:any)=>x.text||'').join('')||'');const parsed=JSON.parse(clean(text));const saved=await controlAction('email_draft_save',{draft:{email_item_id:id,stance,instruction,draft_text:String(parsed.draft||''),status:'drafted'}});const savedJson=saved?.ok?await saved.json():{};await controlAction('email_update',{id,patch:{reply_status:'drafted',suggested_stance:stance}});return NextResponse.json({draft:savedJson.draft||null,text:String(parsed.draft||''),reasoning:String(parsed.reasoning||''),risk:String(parsed.risk||'medium')})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Draft generation failed'},{status:500})}
}
