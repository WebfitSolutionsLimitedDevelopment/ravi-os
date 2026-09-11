import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { reminderActor } from '../../../lib/server/ravi-os-auth'
import { sbRest, sbStorage } from '../../../lib/server/ravi-os-supabase'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}

async function listReminders(){
  const r=await sbRest('ravi_os_reminders?select=id,title,notes,due_at,event_date,event_time,timezone,source,status,legacy_client_id,created_by,updated_by,created_at&status=eq.active&order=due_at.asc')
  if(!r.ok)throw new Error(await r.text())
  const reminders=await r.json()
  const a=await sbRest('ravi_os_reminder_attachments?select=id,reminder_id,original_filename,object_path,expires_at&order=created_at.desc')
  const attachments=a.ok?await a.json():[]
  const byReminder=new Map<string,any>()
  for(const item of attachments){if(!byReminder.has(item.reminder_id))byReminder.set(item.reminder_id,item)}
  return reminders.map((x:any)=>{
    const at=byReminder.get(x.id)
    return {
      id:x.id,title:x.title,notes:x.notes||'',date:x.event_date||String(x.due_at).slice(0,10),time:x.event_time?String(x.event_time).slice(0,5):'',source:x.source,
      imageName:at?.original_filename||undefined,posterUrl:at?`/api/reminders/${x.id}/poster`:undefined,createdBy:x.created_by||'ravi',updatedBy:x.updated_by||'ravi',legacyClientId:x.legacy_client_id||undefined
    }
  })
}

export async function GET(){
  if(!await reminderActor())return unauthorized()
  try{return NextResponse.json({reminders:await listReminders()})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to load reminders'},{status:500})}
}

function decodeDataUrl(value:string){
  const m=value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if(!m)return null
  return {mime:m[1],bytes:Buffer.from(m[2],'base64')}
}

export async function POST(request:Request){
  const actor=await reminderActor();if(!actor)return unauthorized()
  try{
    const body=await request.json()
    const title=String(body.title||'').trim(),date=String(body.date||''),time=String(body.time||'')
    if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return NextResponse.json({error:'Title, date and time are required'},{status:400})
    const dueAt=String(body.dueAt||new Date(`${date}T${time}:00`).toISOString())
    const legacy=body.legacyClientId?String(body.legacyClientId):null
    if(legacy){
      const existing=await sbRest(`ravi_os_reminders?select=id&legacy_client_id=eq.${encodeURIComponent(legacy)}&limit=1`)
      if(existing.ok){const rows=await existing.json();if(rows[0])return NextResponse.json({id:rows[0].id,duplicate:true})}
    }
    const id=randomUUID()
    const insert=await sbRest('ravi_os_reminders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id,title,notes:String(body.notes||''),due_at:dueAt,event_date:date,event_time:time,timezone:'Pacific/Auckland',source:['text','voice','image'].includes(body.source)?body.source:'text',status:'active',legacy_client_id:legacy,created_by:actor,updated_by:actor})})
    if(!insert.ok)throw new Error(await insert.text())

    if(body.imageDataUrl){
      const decoded=decodeDataUrl(String(body.imageDataUrl))
      if(decoded&&decoded.bytes.length<=10*1024*1024){
        const ext=decoded.mime.includes('png')?'png':decoded.mime.includes('webp')?'webp':'jpg'
        const objectPath=`shared/${id}/${randomUUID()}.${ext}`
        const upload=await sbStorage(`object/ravi-os-reminder-images/${objectPath}`,{method:'POST',headers:{'Content-Type':decoded.mime,'x-upsert':'true'},body:decoded.bytes})
        if(upload.ok){
          await sbRest('ravi_os_reminder_attachments',{method:'POST',body:JSON.stringify({reminder_id:id,bucket_id:'ravi-os-reminder-images',object_path:objectPath,original_filename:String(body.imageName||`poster.${ext}`),mime_type:decoded.mime,size_bytes:decoded.bytes.length,expires_at:new Date(Date.now()+90*86400000).toISOString()})})
        }
      }
    }
    return NextResponse.json({id})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save reminder'},{status:500})}
}
