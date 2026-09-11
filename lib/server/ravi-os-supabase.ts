const SUPABASE_URL='https://pvnfwippvojplzedbnba.supabase.co'

function serviceKey(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!key)throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return key
}

export async function sbRest(path:string,init:RequestInit={}){
  const key=serviceKey();const headers=new Headers(init.headers)
  headers.set('apikey',key);headers.set('Authorization',`Bearer ${key}`)
  if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json')
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers,cache:'no-store'})
}

export async function sbStorage(path:string,init:RequestInit={}){
  const key=serviceKey();const headers=new Headers(init.headers)
  headers.set('apikey',key);headers.set('Authorization',`Bearer ${key}`)
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`,{...init,headers,cache:'no-store'})
}
