'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarPlus, FileImage } from 'lucide-react'
import styles from './reminder-detail.module.css'

type Reminder={id:string;title:string;notes:string;date:string;time:string;source:'text'|'voice'|'image';imageName?:string;posterUrl?:string;createdBy?:string;updatedBy?:string}
function calendarUrl(r:Reminder){const start=new Date(`${r.date}T${r.time||'09:00'}:00`);const end=new Date(start.getTime()+30*60*1000);const fmt=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const p=new URLSearchParams({action:'TEMPLATE',text:r.title,dates:`${fmt(start)}/${fmt(end)}`,details:r.notes||'Created from Ravi OS',ctz:'Pacific/Auckland'});return`https://calendar.google.com/calendar/render?${p.toString()}`}

export default function ReminderDetail({params}:{params:Promise<{id:string}>}){
  const[id,setId]=useState('');const[reminder,setReminder]=useState<Reminder|null>(null);const[ready,setReady]=useState(false)
  useEffect(()=>{params.then(p=>setId(p.id))},[params])
  useEffect(()=>{if(!id)return;(async()=>{try{const r=await fetch('/api/reminders',{cache:'no-store'});if(r.ok){const d=await r.json();setReminder((d.reminders||[]).find((x:Reminder)=>x.id===id)||null)}}finally{setReady(true)}})()},[id])
  const when=useMemo(()=>reminder?new Date(`${reminder.date}T${reminder.time}:00`).toLocaleString('en-NZ',{dateStyle:'full',timeStyle:'short'}):'',[reminder])
  if(!ready)return <main className={styles.shell}><div className={styles.card}>Loading reminder…</div></main>
  if(!reminder)return <main className={styles.shell}><div className={styles.card}><nav className={styles.navRow}><Link href="/" className={styles.back}><ArrowLeft/>Ravi OS</Link><Link href="/reminders" className={styles.backSecondary}>All reminders</Link></nav><h1>Reminder not found</h1><p>This reminder may have been deleted or is unavailable.</p></div></main>
  return <main className={styles.shell}><section className={styles.card}><nav className={styles.navRow}><Link href="/" className={styles.back}><ArrowLeft/>Ravi OS</Link><Link href="/reminders" className={styles.backSecondary}>All reminders</Link></nav><p className={styles.eyebrow}>SHARED REMINDER</p><h1>{reminder.title}</h1><div className={styles.when}>{when}</div>{reminder.notes&&<div className={styles.section}><span>Venue & address</span><p>{reminder.notes}</p></div>}{reminder.posterUrl?<div className={styles.section}><span>Poster</span><a href={reminder.posterUrl} target="_blank" rel="noreferrer" className={styles.posterLink}><img src={reminder.posterUrl} alt="Reminder poster"/></a><small>Tap the poster to view it full size.</small></div>:reminder.imageName?<div className={styles.missingPoster}><FileImage/><span><b>{reminder.imageName}</b><small>The original poster is not available for this older reminder.</small></span></div>:null}<div className={styles.section}><span>Shared by</span><p>{reminder.createdBy==='geet'?'Geet':'Ravi'}</p></div><a className={styles.calendar} href={calendarUrl(reminder)} target="_blank" rel="noreferrer"><CalendarPlus/>Add to Google Calendar</a></section></main>
}
