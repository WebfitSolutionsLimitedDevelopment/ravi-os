'use client'

import { useEffect } from 'react'

const seededTitles=new Set([
  'Review India house contractor milestone',
  'Review Ravi OS deployment',
  'Review weekly personal commitments',
])

function goTasks(){window.location.assign('/tasks')}

export default function TaskNavigationBridge(){
  useEffect(()=>{
    let alive=true

    const refreshCount=async()=>{
      try{
        const response=await fetch('/api/tasks',{cache:'no-store'})
        if(!response.ok)return
        const data=await response.json()
        if(!alive)return
        const openCount=Array.isArray(data.tasks)?data.tasks.filter((task:{status?:string})=>task.status==='open').length:0
        document.querySelectorAll<HTMLElement>('.summaryCard').forEach(card=>{
          if(card.textContent?.includes('OPEN TASKS')){
            const value=card.querySelector('strong')
            if(value)value.textContent=String(openCount)
          }
        })
      }catch{}
    }

    const migrateLegacy=async()=>{
      if(localStorage.getItem('ravi-os-tasks-v5-migrated')==='1')return
      let rows:Array<{title?:string;meta?:string;priority?:string;done?:boolean}>=[]
      try{rows=JSON.parse(localStorage.getItem('ravi-os-tasks-v5')||'[]')}catch{}
      const genuine=rows.filter(row=>row.title&&!seededTitles.has(row.title))
      let ok=true
      for(const row of genuine){
        try{
          const response=await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            title:String(row.title),
            notes:String(row.meta||''),
            priority:String(row.priority||'medium').toLowerCase(),
            category:'Personal',
          })})
          if(!response.ok)ok=false
        }catch{ok=false}
      }
      if(ok)localStorage.setItem('ravi-os-tasks-v5-migrated','1')
      await refreshCount()
    }

    const intercept=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null
      const button=target?.closest('button') as HTMLButtonElement|null
      if(!button)return
      const text=(button.textContent||'').replace(/\s+/g,' ').trim()
      const inBottom=Boolean(button.closest('.bottomNav'))
      const inSide=Boolean(button.closest('.sideNav'))
      const isSummary=button.classList.contains('summaryCard')&&text.includes('OPEN TASKS')
      const isQuickTask=Boolean(button.closest('.actionGrid'))&&/^Task\b/i.test(text)
      if((inBottom&&/^Tasks\b/i.test(text))||(inSide&&/^Tasks\b/i.test(text))||isSummary||isQuickTask){
        event.preventDefault();event.stopPropagation();goTasks()
      }
    }

    document.addEventListener('click',intercept,true)
    migrateLegacy().catch(()=>refreshCount())
    const onVisible=()=>{if(document.visibilityState==='visible')refreshCount()}
    document.addEventListener('visibilitychange',onVisible)
    return()=>{alive=false;document.removeEventListener('click',intercept,true);document.removeEventListener('visibilitychange',onVisible)}
  },[])
  return null
}
