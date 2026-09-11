'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bell, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Cloud, CloudOff, ListChecks, Plus, RefreshCw } from 'lucide-react'
import styles from './calendar.module.css'

type Reminder={id:string;title:string;notes?:string;date:string;time:string;posterUrl?:string;createdBy?:string}
type Task={id:string;title:string;notes?:string;dueDate:string;dueTime:string;priority:'high'|'medium'|'low';category:string;status:'open'|'completed'|'cancelled'}
type Item={id:string;kind:'reminder'|'task';title:string;date:string;time:string;subtitle:string;href:string;notes?:string;priority?:string;posterUrl?:string}
type GoogleStatus={configured:boolean;connected:boolean;email?:string|null;updatedAt?:string|null}

function monthKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function monthLabel(key:string){const[y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}
function shiftMonth(key:string,delta:number){const[y,m]=key.split('-').map(Number);return monthKey(new Date(y,m-1+delta,1))}
function niceDate(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'})}
function stamp(item:Item){return new Date(`${item.date}T${item.time||'23:59'}:00`).getTime()}

export default function CalendarPage(){
  const[now]=useState(new Date());const[month,setMonth]=useState(monthKey(new Date()));const[reminders,setReminders]=useState<Reminder[]>([]);const[tasks,setTasks]=useState<Task[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('')
  const[google,setGoogle]=useState<GoogleStatus>({configured:false,connected:false});const[googleLoading,setGoogleLoading]=useState(true);const[syncing,setSyncing]=useState(false);const[syncMessage,setSyncMessage]=useState('')
  const loadGoogle=async()=>{try{const r=await fetch('/api/calendar/google/status',{cache:'no-store'});if(r.ok)setGoogle(await r.json())}catch{}finally{setGoogleLoading(false)}}
  useEffect(()=>{(async()=>{try{const[rr,tr]=await Promise.all([fetch('/api/reminders',{cache:'no-store'}),fetch('/api/tasks',{cache:'no-store'})]);if(rr.ok){const d=await rr.json();setReminders(d.reminders||[])}if(tr.ok){const d=await tr.json();setTasks(d.tasks||[])}if(!rr.ok&&!tr.ok)setError('Calendar could not be loaded.')}catch{setError('Calendar could not be loaded.')}finally{setLoading(false)}})();loadGoogle();const p=new URLSearchParams(window.location.search);const result=p.get('google');if(result==='connected')setSyncMessage('Google Calendar connected. You can sync upcoming items now.');else if(result&&result!=='connected')setSyncMessage('Google Calendar connection was not completed. Please try again.')},[])
  const allItems=useMemo<Item[]>(()=>{
    const reminderItems=reminders.map(r=>({id:r.id,kind:'reminder' as const,title:r.title,date:r.date,time:r.time||'',subtitle:r.notes||`Added by ${r.createdBy==='geet'?'Geet':'Ravi'}`,notes:r.notes||'',href:`/reminders/${r.id}`,posterUrl:r.posterUrl}))
    const taskItems=tasks.filter(t=>t.status==='open'&&t.dueDate).map(t=>({id:t.id,kind:'task' as const,title:t.title,date:t.dueDate,time:t.dueTime||'',subtitle:t.category||'Task',notes:t.notes||'',href:'/tasks',priority:t.priority}))
    return [...reminderItems,...taskItems].sort((a,b)=>stamp(a)-stamp(b))
  },[reminders,tasks])
  const items=useMemo(()=>allItems.filter(i=>i.date.startsWith(month)),[allItems,month])
  const grouped=useMemo(()=>{const map=new Map<string,Item[]>();for(const item of items){const row=map.get(item.date)||[];row.push(item);map.set(item.date,row)}return [...map.entries()]},[items])
  const today=dateKey(now)
  const upcoming=useMemo(()=>allItems.filter(i=>i.date>=today).slice(0,100),[allItems,today])

  const syncUpcoming=async()=>{if(!google.connected||syncing)return;setSyncing(true);setSyncMessage('Syncing upcoming reminders and tasks…');try{const r=await fetch('/api/calendar/google/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:upcoming.map(i=>({id:i.id,kind:i.kind,title:i.title,notes:i.notes||i.subtitle,date:i.date,time:i.time||undefined}))})});const d=await r.json();if(r.ok)setSyncMessage(`${d.synced||0} items synced. Google alerts are set for 24h, 12h, 6h and 1h before each event.`);else setSyncMessage(d.error||'Calendar sync failed.')}catch{setSyncMessage('Calendar sync failed. Please try again.')}finally{setSyncing(false)}}
  const disconnect=async()=>{if(!confirm('Disconnect Google Calendar from Ravi OS?'))return;const r=await fetch('/api/calendar/google/disconnect',{method:'POST'});if(r.ok){setGoogle(g=>({...g,connected:false,email:null}));setSyncMessage('Google Calendar disconnected.')}}

  return <main className={styles.shell}>
    <header className={styles.header}><Link href='/' className={styles.back}><ArrowLeft/>Ravi OS</Link><div><p>CALENDAR</p><h1>Your time, in one place.</h1><span>Reminders and tasks together, ordered by date and time.</span></div><div className={styles.quick}><Link href='/reminders'><Bell/>Reminder</Link><Link href='/tasks'><ListChecks/>Task</Link></div></header>

    <section className={styles.googleCard}><div className={styles.googleIcon}>{google.connected?<Cloud/>:<CloudOff/>}</div><div className={styles.googleBody}><small>GOOGLE CALENDAR</small><b>{googleLoading?'Checking connection…':google.connected?'Connected':'Not connected'}</b><span>{google.connected?(google.email||'Primary Google Calendar'):'Sync Ravi OS reminders and tasks to your Google Calendar.'}</span><em>Alerts: 24h · 12h · 6h · 1h</em></div><div className={styles.googleActions}>{google.connected?<><button onClick={syncUpcoming} disabled={syncing||!upcoming.length}><RefreshCw className={syncing?styles.spin:''}/>{syncing?'Syncing…':'Sync upcoming'}</button><button className={styles.secondary} onClick={disconnect}>Disconnect</button></>:google.configured?<a href='/api/calendar/google/connect'>Connect Google</a>:<button disabled>Google setup required</button>}</div></section>
    {syncMessage&&<div className={styles.syncMessage}>{syncMessage}</div>}

    <section className={styles.monthBar}><button onClick={()=>setMonth(m=>shiftMonth(m,-1))} aria-label='Previous month'><ChevronLeft/></button><div><small>{month===monthKey(now)?'THIS MONTH':'CALENDAR'}</small><b>{monthLabel(month)}</b></div><button onClick={()=>setMonth(m=>shiftMonth(m,1))} aria-label='Next month'><ChevronRight/></button></section>

    {loading?<section className={styles.empty}><CalendarDays/><b>Loading your calendar…</b></section>:error&&!items.length?<section className={styles.empty}><CalendarDays/><b>{error}</b></section>:grouped.length===0?<section className={styles.empty}><CalendarDays/><b>Nothing scheduled this month</b><span>Add a reminder or task when something comes up.</span><div><Link href='/reminders'><Plus/>Reminder</Link><Link href='/tasks'><Plus/>Task</Link></div></section>:<section className={styles.timeline}>{grouped.map(([date,rows])=><div className={styles.day} key={date}><div className={`${styles.dayLabel} ${date===today?styles.today:''}`}><small>{date===today?'TODAY':new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ',{weekday:'short'}).toUpperCase()}</small><b>{new Date(`${date}T12:00:00`).getDate()}</b><span>{new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ',{month:'short'})}</span></div><div className={styles.dayBody}><h2>{niceDate(date)}</h2><div className={styles.items}>{rows.map(item=><Link href={item.href} className={`${styles.item} ${item.kind==='task'?styles.task:styles.reminder}`} key={`${item.kind}-${item.id}`}><span className={styles.icon}>{item.kind==='task'?<CheckCircle2/>:<Bell/>}</span><span className={styles.itemBody}><b>{item.title}</b><small>{item.time?`${item.time} · `:''}{item.subtitle}</small></span>{item.posterUrl&&<img src={item.posterUrl} alt=''/>}<span className={styles.time}>{item.time||'Any time'}</span></Link>)}</div></div></div>)}</section>}

    <nav className={styles.bottom}><Link href='/'><span>Home</span></Link><Link href='/tasks'><ListChecks/><span>Tasks</span></Link><Link className={styles.plus} href='/reminders'><Plus/></Link><span className={styles.current}><CalendarDays/><b>Calendar</b></span></nav>
  </main>
}
