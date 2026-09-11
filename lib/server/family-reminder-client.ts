import { cookies } from 'next/headers'

const FAMILY_COOKIE='ravi_os_family_session'
const EDGE_URL='https://pvnfwippvojplzedbnba.supabase.co/functions/v1/ravi-os-reminders'

type Actor='ravi'|'geet'

async function callEdge(body:Record<string,unknown>,token?:string){
  const headers:Record<string,string>={'Content-Type':'application/json'}
  if(token)headers['x-family-session']=token
  return fetch(EDGE_URL,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'})
}

export async function familyLogin(actor:Actor,pin:string){
  const response=await callEdge({action:'login',actor,pin})
  if(!response.ok)return null
  const data=await response.json()
  if(!data?.token)return null
  return {token:String(data.token),expiresAt:String(data.expiresAt||'')}
}

export async function setFamilySession(token:string){
  const store=await cookies()
  store.set(FAMILY_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*24*30})
}

export async function clearFamilySession(){
  const store=await cookies();store.delete(FAMILY_COOKIE)
}

export async function familyAction(action:string,payload:Record<string,unknown>={}){
  const store=await cookies();const token=store.get(FAMILY_COOKIE)?.value||''
  if(!token)return null
  return callEdge({action,...payload},token)
}

export async function familyLogout(){
  const store=await cookies();const token=store.get(FAMILY_COOKIE)?.value||''
  if(token){try{await callEdge({action:'logout'},token)}catch{}}
  store.delete(FAMILY_COOKIE)
}
