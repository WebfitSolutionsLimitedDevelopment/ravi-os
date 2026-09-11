'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function HomePolishBridge(){
  const pathname=usePathname()
  useEffect(()=>{
    if(pathname!=='/')return
    const cleanPrototypeSignals=()=>{
      document.querySelectorAll<HTMLElement>('.notificationList > *, .sheetList > *').forEach(row=>{
        const text=(row.textContent||'').replace(/\s+/g,' ').trim()
        if(text.includes('2 new emails')||text.includes('Upcoming appointment'))row.style.display='none'
      })
      document.querySelectorAll<HTMLElement>('.headerIcons i').forEach(badge=>{badge.style.display='none'})
      document.querySelectorAll<HTMLElement>('.sheetTitle h2').forEach(title=>{if(title.textContent?.includes('4 things to know'))title.textContent='Things to know'})
    }
    cleanPrototypeSignals();const observer=new MutationObserver(cleanPrototypeSignals);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()
  },[pathname])
  return null
}
