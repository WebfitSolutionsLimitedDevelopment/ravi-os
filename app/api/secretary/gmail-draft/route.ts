import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { createGmailReplyDraft, googleSuiteConfigured } from '../../../../lib/server/google-suite'

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleSuiteConfigured())return NextResponse.json({error:'Google OAuth is not configured yet',configured:false},{status:503})
  const b=await request.json().catch(()=>({}));const id=String(b.id||''),text=String(b.text||'').trim();if(!id||!text)return NextResponse.json({error:'Email and draft text required'},{status:400})
  const list=await controlAction('email_list');const data=list?.ok?await list.json():{items:[]};const item=(data.items||[]).find((x:any)=>x.id===id);if(!item)return NextResponse.json({error:'Email item not found'},{status:404})
  if(!item.sender_email)return NextResponse.json({error:'Sender email address is unavailable'},{status:400})
  try{const draft=await createGmailReplyDraft(String(item.provider_thread_id||''),String(item.sender_email),String(item.subject||''),text);const draftId=String(draft.id||'');await controlAction('email_update',{id,patch:{reply_status:'approved',provider_draft_id:draftId}});return NextResponse.json({draftId})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to create Gmail draft'},{status:500})}
}
