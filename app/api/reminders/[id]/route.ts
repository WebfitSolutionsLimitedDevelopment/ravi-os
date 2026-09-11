import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../lib/server/ravi-os-auth'
import { sbRest } from '../../../../lib/server/ravi-os-supabase'

function unauthorized(){return NextResponse.json({error:'Unauthorized'},{status:401})}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await reminderActor();if(!actor)return unauthorized()
  const {id}=await params
  try{
    const body=await request.json()
    const title=String(body.title||'').trim(),date=String(body.date||''),time=String(body.time||'')
    if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return NextResponse.json({error:'Title, date and time are required'},{status:400})
    const dueAt=String(body.dueAt||new Date(`${date}T${time}:00`).toISOString())
    const r=await sbRest(`ravi_os_reminders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({title,notes:String(body.notes||''),due_at:dueAt,event_date:date,event_time:time,updated_by:actor,updated_at:new Date().toISOString()})})
    if(!r.ok)throw new Error(await r.text())
    return NextResponse.json({ok:true})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to update reminder'},{status:500})}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return unauthorized()
  const {id}=await params
  try{
    const r=await sbRest(`ravi_os_reminders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'deleted',updated_at:new Date().toISOString()})})
    if(!r.ok)throw new Error(await r.text())
    return NextResponse.json({ok:true})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to delete reminder'},{status:500})}
}
