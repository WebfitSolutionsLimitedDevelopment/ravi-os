'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, Command,
  HardHat, HeartPulse, Inbox, IndianRupee, ListChecks, Mail, MapPin, Mic, Plus, Repeat2,
  Search, ShieldCheck, Sparkles, Target, Users, Utensils, WalletCards, Watch, X
} from 'lucide-react'

type Section = 'Home' | 'Inbox' | 'Tasks' | 'Calendar' | 'Family' | 'Projects' | 'Health' | 'Finance' | 'Journal'
type Task = { id:number; title:string; meta:string; priority:'High'|'Medium'|'Low'; done:boolean }
type Capture = { id:number; text:string; created:string }

const initialTasks: Task[] = [
  { id:1, title:'Review India house contractor milestone', meta:'Construction · India House', priority:'High', done:false },
  { id:2, title:'Review Ravi OS deployment', meta:'Ravi OS · Today', priority:'Medium', done:false },
  { id:3, title:'Review weekly personal commitments', meta:'Planning · Weekly', priority:'Low', done:false },
]

const inboxes = [
  { name:'Personal', address:'ravi14feb@gmail.com', unread:1, status:'Connected' },
  { name:'Webfit News', address:'webfitnews@gmail.com', unread:1, status:'Connected' },
  { name:'Career / Professional', address:'Professional mailbox', unread:0, status:'Connect next' },
]

const waiting = [
  { title:'House contractor update', age:'3 days', owner:'Construction' },
  { title:'Personal follow-up', age:'1 day', owner:'Personal' },
]
const recurring = [
  { title:'Weekly personal review', when:'Sunday evening' },
  { title:'Monthly finance check', when:'1st of every month' },
  { title:'Important document backup', when:'Every 3 months' },
]

const nzFmt=(d:Date)=>new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'2-digit',minute:'2-digit',weekday:'short',day:'2-digit',month:'short'}).format(d)
const inFmt=(d:Date)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',weekday:'short',day:'2-digit',month:'short'}).format(d)
const weekday=(d:Date)=>new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',weekday:'long'}).format(d)
function greeting(d:Date){const h=Number(new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'2-digit',hourCycle:'h23'}).format(d));return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function dietFor(day:string){const allowed=['Monday','Wednesday','Friday'].includes(day);return allowed?{allowed,label:'Non-veg allowed',detail:'Chicken, mutton and egg are allowed today.'}:{allowed,label:'Vegetarian day',detail:'No chicken, mutton or egg today.'}}

export default function Page(){
  const [now,setNow]=useState(new Date())
  const [active,setActive]=useState<Section>('Home')
  const [loc,setLoc]=useState('Sandringham · Auckland')
  const [tasks,setTasks]=useState<Task[]>(initialTasks)
  const [capture,setCapture]=useState('')
  const [captures,setCaptures]=useState<Capture[]>([])
  const [commandOpen,setCommandOpen]=useState(false)

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);const st=localStorage.getItem('ravi-os-tasks-v4');const sc=localStorage.getItem('ravi-os-captures-v4');if(st)setTasks(JSON.parse(st));if(sc)setCaptures(JSON.parse(sc));const kh=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommandOpen(v=>!v)}};window.addEventListener('keydown',kh);return()=>{clearInterval(t);window.removeEventListener('keydown',kh)}},[])
  useEffect(()=>localStorage.setItem('ravi-os-tasks-v4',JSON.stringify(tasks)),[tasks])
  useEffect(()=>localStorage.setItem('ravi-os-captures-v4',JSON.stringify(captures)),[captures])

  const day=useMemo(()=>weekday(now),[now]);const diet=useMemo(()=>dietFor(day),[day]);const openTasks=tasks.filter(t=>!t.done);const completed=tasks.length-openTasks.length
  const go=(s:Section)=>{setActive(s);window.scrollTo({top:0,behavior:'smooth'})}
  const toggleTask=(id:number)=>setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t))
  const addCapture=()=>{const text=capture.trim();if(!text)return;setCaptures(p=>[{id:Date.now(),text,created:'Just now'},...p].slice(0,6));setCapture('')}
  const enableLocation=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(()=>setLoc('Live location enabled · Auckland'),()=>setLoc('Sandringham · Auckland')):setLoc('Location unavailable')

  const nav:{label:Section;icon:React.ReactNode}[]=[
    {label:'Home',icon:<Command/>},{label:'Inbox',icon:<Inbox/>},{label:'Tasks',icon:<ListChecks/>},{label:'Calendar',icon:<CalendarDays/>},
    {label:'Family',icon:<Users/>},{label:'Projects',icon:<Target/>},{label:'Health',icon:<HeartPulse/>},{label:'Finance',icon:<WalletCards/>},{label:'Journal',icon:<Sparkles/>}
  ]

  return <main className="appShell">
    <aside className="sidebar">
      <button className="brand" onClick={()=>go('Home')}><span className="brandMark">RG</span><span><b>Ravi OS</b><small>Private command system</small></span></button>
      <nav>{nav.map(item=><button key={item.label} className={active===item.label?'active':''} onClick={()=>go(item.label)}>{item.icon}<span>{item.label}</span>{item.label==='Inbox'&&<i>2</i>}</button>)}<Link className="domainNavLink" href="/construction"><HardHat/><span>Construction</span><i>2</i></Link></nav>
      <div className="sidebarFooter"><button className="quickSearch" onClick={()=>setCommandOpen(true)}><Search/><span>Quick command</span><kbd>⌘K</kbd></button><div className="private"><ShieldCheck/><span><b>Private workspace</b><small>PIN protected · no indexing</small></span></div></div>
    </aside>

    <section className="content">
      <header className="pageHeader"><div><p className="eyebrow">RAVI OS · PERSONAL COMMAND CENTRE</p><h1>{active==='Home'?`${greeting(now)}, Ravi.`:active}</h1><p className="subtitle">{subtitle(active)}</p></div><div className="headerActions"><button className="searchButton" onClick={()=>setCommandOpen(true)}><Search/>Search or command<kbd>⌘K</kbd></button><button className="bell" onClick={()=>go('Home')}><Bell/><i>4</i></button></div></header>

      {active==='Home'&&<HomeView now={now} loc={loc} day={day} diet={diet} openTasks={openTasks.length} completed={completed} go={go} enableLocation={enableLocation}/>} 
      {active==='Inbox'&&<InboxView/>}
      {active==='Tasks'&&<TasksView tasks={tasks} toggleTask={toggleTask}/>} 
      {active==='Calendar'&&<CalendarView/>}
      {active==='Family'&&<FamilyView/>}
      {active==='Projects'&&<SimpleView icon={<Target/>} title="Projects" text="Track personal, family and portfolio projects without cluttering Home."/>}
      {active==='Health'&&<HealthView diet={diet} day={day}/>} 
      {active==='Finance'&&<SimpleView icon={<CircleDollarSign/>} title="Finance" text="Bills, accounts, assets and reminders live here. Home only surfaces exceptions and due items."/>}
      {active==='Journal'&&<SimpleView icon={<Sparkles/>} title="Journal" text="Private life notes and reflections remain separate from operational tasks."/>}

      <section className="captureDock"><div><span className="spark"><Sparkles/></span><span><b>Capture anything</b><small>Task, reminder, expense, thought, appointment or follow-up.</small></span></div><div className="captureBar"><input value={capture} onChange={e=>setCapture(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCapture()} placeholder="Tell Ravi OS what you need to remember…"/><button><Mic/></button><button className="add" onClick={addCapture}><Plus/>Add</button></div>{captures.length>0&&<div className="captures">{captures.map(item=><div key={item.id}><Sparkles/><span><b>{item.text}</b><small>{item.created} · saved on this device</small></span><button onClick={()=>setCaptures(p=>p.filter(x=>x.id!==item.id))}><X/></button></div>)}</div>}</section>
    </section>

    <nav className="mobileNav">{(['Home','Inbox','Tasks','Calendar'] as Section[]).map(s=><button key={s} className={active===s?'active':''} onClick={()=>go(s)}>{s==='Home'?<Command/>:s==='Inbox'?<Inbox/>:s==='Tasks'?<ListChecks/>:<CalendarDays/>}<span>{s}</span></button>)}<button className="mobileAdd" onClick={()=>document.querySelector<HTMLInputElement>('.captureBar input')?.focus()}><Plus/></button></nav>
    {commandOpen&&<div className="commandOverlay" onClick={()=>setCommandOpen(false)}><div className="commandPanel" onClick={e=>e.stopPropagation()}><div className="commandInput"><Search/><input autoFocus placeholder="Go to Inbox, Calendar, Tasks, Construction…"/><kbd>ESC</kbd></div><div className="commandLinks">{nav.slice(0,7).map(item=><button key={item.label} onClick={()=>{go(item.label);setCommandOpen(false)}}>{item.icon}<span>{item.label}</span><ChevronRight/></button>)}<Link href="/construction"><HardHat/><span>Construction</span><ChevronRight/></Link></div></div></div>}
  </main>
}

function HomeView({now,loc,day,diet,openTasks,completed,go,enableLocation}:{now:Date;loc:string;day:string;diet:{allowed:boolean;label:string;detail:string};openTasks:number;completed:number;go:(s:Section)=>void;enableLocation:()=>void}){
  return <>
    <section className="contextBar"><div><Clock3/><span><b>Auckland</b><small>{nzFmt(now)}</small></span></div><div><IndianRupee/><span><b>India</b><small>{inFmt(now)}</small></span></div><button onClick={enableLocation}><MapPin/><span><b>Location</b><small>{loc}</small></span></button><div className={diet.allowed?'diet ok':'diet'}><Utensils/><span><b>{day}</b><small>{diet.label}</small></span></div></section>
    <section className="homeHero"><div><p className="eyebrow">TODAY AT A GLANCE</p><h2>Only what needs your attention.</h2><p>Details stay inside their own workspace. Home remains a clean decision surface.</p></div><div className="progress"><strong>{completed}</strong><span>done</span><b>{openTasks}</b><span>open</span></div></section>
    <section className="signalGrid">
      <button className="signal info" onClick={()=>go('Inbox')}><span className="signalIcon"><Mail/></span><span><b>2 new emails</b><small>Across connected inboxes</small></span><em>2</em><ChevronRight/></button>
      <button className="signal good" onClick={()=>go('Calendar')}><span className="signalIcon"><CalendarDays/></span><span><b>1 upcoming appointment</b><small>Open Calendar for detail</small></span><em>1</em><ChevronRight/></button>
      <Link href="/construction" className="signal urgent constructionSignal"><span className="signalIcon"><HardHat/></span><span><b>Construction update</b><small>2 items need attention · India House</small></span><em>2</em><ChevronRight/></Link>
    </section>
    <div className="homeGrid"><section className="panel priorityPanel"><div className="panelHead"><div><p className="eyebrow">NEXT ACTIONS</p><h2>Priority queue</h2></div><button onClick={()=>go('Tasks')}>View tasks <ChevronRight/></button></div><div className="rows"><div><i className="redDot"/><span><b>India house milestone</b><small>Construction workspace</small></span><Link href="/construction">Open</Link></div><div><i className="amberDot"/><span><b>Contractor update</b><small>Waiting 3 days</small></span><Link href="/construction">Open</Link></div></div></section><section className="panel"><div className="panelHead"><div><p className="eyebrow">UPCOMING</p><h2>Schedule</h2></div><button onClick={()=>go('Calendar')}>Open calendar <ChevronRight/></button></div><div className="emptyCompact"><CalendarDays/><span><b>Calendar connection is next</b><small>Appointments, PTM, doctor visits and family commitments will surface here as concise reminders.</small></span></div></section></div>
  </>
}

function InboxView(){return <div className="sectionGrid"><section className="panel full"><div className="panelHead"><div><p className="eyebrow">MAIL ACCOUNTS</p><h2>Inboxes</h2></div><span className="countPill">2 unread</span></div><div className="accountCards">{inboxes.map(box=><div key={box.name}><span className="accountAvatar">{box.name[0]}</span><span><b>{box.name}</b><small>{box.address}</small></span><em>{box.unread?`${box.unread} new`:box.status}</em></div>)}</div></section><section className="panel full"><div className="panelHead"><div><p className="eyebrow">NEW & IMPORTANT</p><h2>Messages</h2></div><span className="mutedLabel">Read-only first</span></div><div className="mailList"><button><span className="mailAccount">Personal</span><span><b>New message requiring review</b><small>Personal inbox · Today</small></span><em>Review</em><ChevronRight/></button><button><span className="mailAccount">Webfit News</span><span><b>New media message requiring review</b><small>Media inbox · Today</small></span><em>Review</em><ChevronRight/></button></div><div className="infoNote"><ShieldCheck/><span><b>Account separation is preserved.</b><small>Ravi OS will know which mailbox received each message without mixing Personal, Career or Media.</small></span></div></section></div>}
function TasksView({tasks,toggleTask}:{tasks:Task[];toggleTask:(id:number)=>void}){return <section className="panel full"><div className="panelHead"><div><p className="eyebrow">ACTION SYSTEM</p><h2>Tasks</h2></div><span className="countPill">{tasks.filter(t=>!t.done).length} open</span></div><div className="taskList">{tasks.map(task=><button key={task.id} className={task.done?'task done':'task'} onClick={()=>toggleTask(task.id)}><span className="taskCheck">{task.done&&<Check/>}</span><span><b>{task.title}</b><small>{task.meta}</small></span><em className={task.priority.toLowerCase()}>{task.priority}</em></button>)}</div><div className="subPanels"><div><p className="eyebrow">WAITING FOR</p>{waiting.map(x=><p key={x.title} className="miniRow"><span><b>{x.title}</b><small>{x.owner}</small></span><em>{x.age}</em></p>)}</div><div><p className="eyebrow">RECURRING</p>{recurring.map(x=><p key={x.title} className="miniRow"><span><b>{x.title}</b><small>{x.when}</small></span><Repeat2/></p>)}</div></div></section>}
function CalendarView(){return <div className="sectionGrid"><section className="panel full"><div className="panelHead"><div><p className="eyebrow">PERSONAL SCHEDULE</p><h2>Calendar & appointments</h2></div><span className="mutedLabel">Google Calendar · next integration</span></div><div className="appointmentList"><div><span className="timeBox">Next</span><span><b>Calendar connection pending</b><small>Google Calendar will populate appointments here</small></span><ChevronRight/></div></div><div className="calendarCategories"><span>Personal</span><span>Family</span><span>Career</span><span>Medical</span><span>School / PTM</span><span>Projects</span></div></section></div>}
function FamilyView(){return <section className="panel full"><div className="panelHead"><div><p className="eyebrow">FAMILY</p><h2>Shared responsibilities</h2></div><Users/></div><div className="featureCards"><div><b>Appointments</b><small>Doctor, dentist and family commitments</small></div><div><b>School</b><small>PTM, events and important dates</small></div><div><b>Shared tasks</b><small>Items that can later be shared with family members</small></div></div><div className="infoNote"><ShieldCheck/><span><b>Privacy boundaries stay explicit.</b><small>Family items can be shared later, while Finance, Journal and sensitive data remain private by default.</small></span></div></section>}
function HealthView({diet,day}:{diet:{allowed:boolean;label:string;detail:string};day:string}){return <div className="sectionGrid"><section className="panel full"><div className="panelHead"><div><p className="eyebrow">HEALTH</p><h2>Daily health signals</h2></div><Activity/></div><div className="metricCards"><div><Watch/><strong>—</strong><span>Steps</span></div><div><HeartPulse/><strong>—</strong><span>Sleep</span></div><div><Utensils/><strong>{diet.allowed?'NV':'V'}</strong><span>{day}</span></div></div><div className="infoNote"><Watch/><span><b>Apple Health is not connected yet.</b><small>The iPhone HealthKit companion will provide real steps and health signals.</small></span></div></section></div>}
function SimpleView({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <section className="panel full simplePage"><span className="largeIcon">{icon}</span><h2>{title}</h2><p>{text}</p><span className="coming">Next functionality phase</span></section>}
function subtitle(section:Section){const map:Record<Section,string>={Home:'Your day, reduced to the signals that matter.',Inbox:'All mail detail stays here, separated by account and purpose.',Tasks:'Actions, waiting items and recurring obligations.',Calendar:'Appointments and commitments across personal and family life.',Family:'Shared responsibilities without exposing private areas.',Projects:'A clean view of active personal and professional projects.',Health:'Real health signals only, with no fabricated data.',Finance:'Protected financial tracking and due-date intelligence.',Journal:'Private life notes and reflections.'};return map[section]}
