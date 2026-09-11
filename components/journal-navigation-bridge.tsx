'use client'

import { useEffect } from 'react'

export default function JournalNavigationBridge(){
  useEffect(()=>{
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
