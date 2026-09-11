'use client'

import { useEffect } from 'react'

export default function FinanceNavigationBridge(){
  useEffect(()=>{
    const intercept=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null
      const el=target?.closest('button,a') as HTMLElement|null
      if(!el)return
      const text=(el.textContent||'').replace(/\s+/g,' ').trim()
      if(/^Finance\b/i.test(text)){
        event.preventDefault();event.stopPropagation();window.location.assign('/finance')
      }
    }
    document.addEventListener('click',intercept,true)
    return()=>document.removeEventListener('click',intercept,true)
  },[])
  return null
}
