import { NextResponse } from 'next/server'
import { reminderActor } from '../../../../../lib/server/ravi-os-auth'
import { familyAction } from '../../../../../lib/server/family-reminder-client'

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await reminderActor())return new NextResponse('Unauthorized',{status:401})
  const {id}=await params
  const response=await familyAction('get',{id})
  if(!response)return new NextResponse('Shared reminder session required',{status:428})
  if(!response.ok)return new NextResponse('Poster not found',{status:response.status})
  const data=await response.json().catch(()=>null)
  const url=data?.reminder?.posterUrl
  if(!url)return new NextResponse('Poster not found',{status:404})
  return NextResponse.redirect(url)
}
