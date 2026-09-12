import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { aiEngineAvailable, aiJson } from '../../../../lib/server/ai-client'

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!aiEngineAvailable())return NextResponse.json({error:'Email Intelligence is not configured'},{status:503})
  const b=await request.json().catch(()=>({}));const id=String(b.id||''),stance=String(b.stance||'custom'),instruction=String(b.instruction||'')
  const list=await controlAction('email_list');const data=list?.ok?await list.json():{items:[]};const item=(data.items||[]).find((x:any)=>x.id===id);if(!item)return NextResponse.json({error:'Email item not found'},{status:404})
  const system=`You are Ravi OS Personal Secretary. Draft a concise, human, professional reply to the email metadata below. Do not invent facts or commitments. Stance requested: ${stance}. Extra instruction: ${instruction||'none'}. If the available context is insufficient, phrase the reply conservatively and ask the minimum necessary question. Return ONLY JSON {"draft":"","reasoning":"one short sentence","risk":"low|medium|high"}.`
  try{
    const {data:parsed}=await aiJson<any>({system,input:`Email: ${JSON.stringify(item).slice(0,10000)}`,maxTokens:1000})
    const saved=await controlAction('email_draft_save',{draft:{email_item_id:id,stance,instruction,draft_text:String(parsed.draft||''),status:'drafted'}});const savedJson=saved?.ok?await saved.json():{};await controlAction('email_update',{id,patch:{reply_status:'drafted',suggested_stance:stance}});return NextResponse.json({draft:savedJson.draft||null,text:String(parsed.draft||''),reasoning:String(parsed.reasoning||''),risk:String(parsed.risk||'medium')})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Draft generation failed'},{status:500})}
}
