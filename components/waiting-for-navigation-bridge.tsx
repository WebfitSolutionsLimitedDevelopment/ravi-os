'use client'

import { useEffect } from 'react'

export default function WaitingForNavigationBridge(){
  useEffect(()=>{
    const enhance=()=>{
      const side=document.querySelector('.sideNav')
      if(side&&!side.querySelector('[data-waiting-for-link]')){
        const a=document.createElement('a');a.href='/waiting-for';a.setAttribute('data-waiting-for-link','1');a.textContent='Waiting For';side.appendChild(a)
      }
      const more=document.querySelector('.sheetList.twoCol')
      if(more&&!more.querySelector('[data-waiting-for-link]')){
        const a=document.createElement('a');a.href='/waiting-for';a.setAttribute('data-waiting-for-link','1');
        const span=document.createElement('span');const b=document.createElement('b');b.textContent='Waiting For';span.appendChild(b);a.appendChild(span);more.appendChild(a)
      }
    }
    enhance()
    const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[])
  return null
}
