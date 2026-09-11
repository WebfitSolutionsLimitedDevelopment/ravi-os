'use client'

import { useEffect } from 'react'

export default function JournalNavigationBridge(){
  useEffect(()=>{
    const migrateLegacy=async()=>{
      if(localStorage.getItem('ravi-os-notes-v1-migrated')==='1')return
      let notes:Array<{text?:string;created?:string}>=[]
      try{notes=JSON.parse(localStorage.getItem('ravi-os-notes-v1')||'[]')}catch{}
      let ok=true
      for(const note of notes){
        if(!note.text?.trim())continue
        try{
          const r=await fetch('/api/journal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'entry_create',entryType:'note',body:note.text.trim(),title:'',tags:['legacy-note']})})
          if(!r.ok)ok=false
        }catch{ok=false}
      }
      if(ok)localStorage.setItem('ravi-os-notes-v1-migrated','1')
    }
    migrateLegacy().catch(()=>{})

    const intercept=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null
      const el=target?.closest('button,a') as HTMLElement|null
      if(!el)return
      const text=(el.textContent||'').replace(/\s+/g,' ').trim()
      const inActionGrid=Boolean(el.closest('.actionGrid'))
      const inMore=Boolean(el.closest('.sheetList'))
      const isJournal=/^Journal\b/i.test(text)
      const isQuickNote=inActionGrid&&/^Note\b/i.test(text)
      if(isJournal||isQuickNote||(inMore&&/journal|notes/i.test(text))){
        event.preventDefault();event.stopPropagation();window.location.assign(isQuickNote?'/journal?new=1':'/journal')
      }
    }
    document.addEventListener('click',intercept,true)
    return()=>document.removeEventListener('click',intercept,true)
  },[])
  return null
}
