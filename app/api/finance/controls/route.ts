import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { journalAction } from '../../../../lib/server/journal-client'
import { controlAction } from '../../../../lib/server/control-client'

export async function GET(){
  if(await reminderActor()!=='ravi')return NextResponse.json({error:'Unauthorized'},{status:401})
  const [j,a]=await Promise.all([journalAction('list'),controlAction('automation_list')])
  const jd=j?.ok?await j.json():{obligations:[]},ad=a?.ok?await a.json():{rules:[],runs:[]}
  return NextResponse.json({obligations:(jd.obligations||[]).filter((x:any)=>String(x.category||'').toLowerCase().includes('financ')||String(x.category||'').toLowerCase().includes('bill')),rules:(ad.rules||[]).filter((x:any)=>x.domain==='finance'),runs:(ad.runs||[]).filter((x:any)=>x.domain==='finance').slice(0,20)})
}
