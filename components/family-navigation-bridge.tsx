'use client'

import { useEffect } from 'react'

export default function FamilyNavigationBridge(){
  useEffect(()=>{
    const intercept=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null
      const button=target?.closest('button') as HTMLButtonElement|null
      if(!button)return
      const text=(button.textContent||'').replace(/\s+/g,' ').trim()
      const inSide=Boolean(button.closest('.sideNav'))
      const inMore=Boolean(button.closest('.sheetList'))
      if((inSide||inMore)&&/^Family\b/i.test(text)){
        event.preventDefault();event.stopPropagation();window.location.assign('/family')
      }
    }
    document.addEventListener('click',intercept,true)
    return()=>document.removeEventListener('click',intercept,true)
  },[])
  return null
}
