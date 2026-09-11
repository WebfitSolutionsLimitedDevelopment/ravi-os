'use client'

import { useEffect } from 'react'

const STORAGE_KEY='ravi-os-reminders-v2'
const MIGRATION_KEY='ravi-os-reminders-family-v1-migrated'

type LegacyReminder={id:number;title:string;notes?:string;date:string;time:string;source?:'text'|'voice'|'image';imageName?:string;imageDataUrl?:string}

function dueAt(date:string,time:string){return new Date(`${date}T${time}:00`).toISOString()}

export default function ReminderSyncBootstrap(){
  useEffect(()=>{
    let cancelled=false
    async function run(){
      if(localStorage.getItem(MIGRATION_KEY)==='1')return
      let rows:LegacyReminder[]=[]
      try{rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return}
      if(!rows.length){localStorage.setItem(MIGRATION_KEY,'1');return}
      let allSaved=true
      for(const item of rows){
        try{
          const response=await fetch('/api/reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:item.title,notes:item.notes||'',date:item.date,time:item.time,dueAt:dueAt(item.date,item.time),source:item.source||'text',imageName:item.imageName,imageDataUrl:item.imageDataUrl,legacyClientId:String(item.id)
          })})
          if(!response.ok)allSaved=false
        }catch{allSaved=false}
      }
      if(allSaved&&!cancelled){localStorage.setItem(MIGRATION_KEY,'1');window.location.reload()}
    }
    run()
    return()=>{cancelled=true}
  },[])
  return null
}
