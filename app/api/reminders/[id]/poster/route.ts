import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { sbRest, sbStorage } from '../../../../../lib/server/ravi-os-supabase'

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return new NextResponse('Unauthorized',{status:401})
  const {id}=await params
  try{
    const meta=await sbRest(`ravi_os_reminder_attachments?select=bucket_id,object_path,mime_type&reminder_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=1`)
    if(!meta.ok)return new NextResponse('Poster not found',{status:404})
    const rows=await meta.json();const item=rows[0]
    if(!item)return new NextResponse('Poster not found',{status:404})
    const file=await sbStorage(`object/${item.bucket_id}/${item.object_path}`)
    if(!file.ok)return new NextResponse('Poster not found',{status:404})
    const bytes=await file.arrayBuffer()
    return new NextResponse(bytes,{headers:{'Content-Type':item.mime_type||'image/jpeg','Cache-Control':'private, max-age=300'}})
  }catch{return new NextResponse('Poster unavailable',{status:500})}
}
