export type CachedReminder={id:string;title:string;notes?:string;date:string;time:string;source?:'text'|'voice'|'image';imageName?:string;posterUrl?:string;createdBy?:string;updatedBy?:string;legacyClientId?:string}

const KEY='ravi-os-shared-reminders-cache-v1'
const TS='ravi-os-shared-reminders-cache-ts-v1'

export function readReminderCache<T extends CachedReminder=CachedReminder>():T[]{
  if(typeof window==='undefined')return[]
  try{return JSON.parse(localStorage.getItem(KEY)||'[]') as T[]}catch{return[]}
}

export function writeReminderCache(rows:CachedReminder[]){
  if(typeof window==='undefined')return
  try{localStorage.setItem(KEY,JSON.stringify(rows));localStorage.setItem(TS,String(Date.now()))}catch{}
}

export function reminderCacheAge(){
  if(typeof window==='undefined')return Number.POSITIVE_INFINITY
  const ts=Number(localStorage.getItem(TS)||0)
  return ts?Date.now()-ts:Number.POSITIVE_INFINITY
}
