type CacheEntry={body:string;status:number;contentType:string;expiresAt:number}

let cache:CacheEntry|null=null
const TTL_MS=15000

export function getReminderListCache(){
  if(!cache||cache.expiresAt<Date.now())return null
  return cache
}

export function setReminderListCache(body:string,status:number,contentType='application/json'){
  if(status>=200&&status<300)cache={body,status,contentType,expiresAt:Date.now()+TTL_MS}
}

export function clearReminderListCache(){cache=null}
