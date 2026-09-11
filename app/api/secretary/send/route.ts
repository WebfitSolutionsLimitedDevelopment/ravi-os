import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { controlAction } from '../../../../lib/server/control-client'
import { googleSuiteConfigured, sendGmailDraft } from '../../../../lib/server/google-suite'

export async function POST(request:Request){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!googleSuiteConfigured())return NextResponse.json({error:'Google OAuth is not configured yet',configured:false},{status:503})
  const b=await request.json().catch(()=>({}));const id=String(b.id||''),draftId=String(b.draftId||'');if(!id||!draftId)return NextResponse.json({error:'Approved Gmail draft required'},{status:400})
  try{const sent=await sendGmailDraft(draftId);await controlAction('email_update',{id,patch:{reply_status:'sent'}});return NextResponse.json({sent:true,messageId:String(sent.id||'')})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to send Gmail draft'},{status:500})}
}
