import { cookies } from 'next/headers'

const FAMILY_COOKIE='ravi_os_family_session'
const EDGE_URL='https://pvnfwippvojplzedbnba.supabase.co/functions/v1/ravi-os-intelligence'

export async function intelligenceAction(action:string,payload:Record<string,unknown>={}){
  const store=await cookies()
  const token=store.get(FAMILY_COOKIE)?.value||''
  if(!token)return null
  return fetch(EDGE_URL,{method:'POST',headers:{'Content-Type':'application/json','x-family-session':token},body:JSON.stringify({action,...payload}),cache:'no-store'})
}
