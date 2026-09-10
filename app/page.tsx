'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell, CalendarDays, Check, ChevronRight, CircleDollarSign, Command, HardHat,
  HeartPulse, Home, Inbox, ListChecks, Mail, MapPin, Mic, MoreHorizontal, Plus,
  Search, ShieldCheck, Sparkles, StickyNote, Target, Users, Utensils, WalletCards,
  X, Image as ImageIcon, Clock3
} from 'lucide-react'

type Section = 'Home' | 'Inbox' | 'Tasks' | 'Calendar' | 'Family' | 'Projects' | 'Health' | 'Finance' | 'Journal'
type Task = { id:number; title:string; meta:string; priority:'High'|'Medium'|'Low'; done:boolean }
type Note = { id:number; text:string; created:string }

const initialTasks: Task[] = [
  { id:1, title:'Review India house contractor milestone', meta:'Construction · India House', priority:'High', done:false },
  { id:2, title:'Review Ravi OS deployment', meta:'Ravi OS · Today', priority:'Medium', done:false },
  { id:3, title:'Review weekly personal commitments', meta:'Planning · Weekly', priority:'Low', done:false },
]

const inboxes = [
  { name:'Personal', address:'ravi14feb@gmail.com', unread:1 },
  { name:'Webfit News', address:'webfitnews@gmail.com', unread:1 },
  { name:'Career', address:'Professional mailbox', unread:0 },
]

function greeting(d:Date){
  const h=Number(new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'2-digit',hourCycle:'h23'}).format(d))
  return h<12?'Good morning':h<17?'Good afternoon':'Good evening'
}

function weekday(d:Date){return new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',weekday:'long'}).format(d)}
function dietFor(day:string){return ['Monday','Wednesday','Friday'].includes(day)?'Non-veg allowed':'Vegetarian day'}

export default function Page(){
  const [now,setNow]=useState(new Date())
  const [active,setActive]=useState<Section>('Home')
  const [tasks,setTasks]=useState<Task[]>(initialTasks)
  const [notes,setNotes]=useState<Note[]>([])
  const [sheet,setSheet]=useState<'actions'|'notifications'|'task'|'note'|'more'|null>(null)
  const [taskTitle,setTaskTitle]=useState('')
  const [noteText,setNoteText]=useState('')
  const [location,setLocation]=useState('Auckland')

  useEffect(()=>{
    const timer=setInterval(()=>setNow(new Date()),30000)
    const savedTasks=localStorage.getItem('ravi-os-tasks-v5')
    const savedNotes=localStorage.getItem('ravi-os-notes-v1')
    if(savedTasks) setTasks(JSON.parse(savedTasks))
    if(savedNotes) setNotes(JSON.parse(savedNotes))
    return()=>clearInterval(timer)
  },[])

  useEffect(()=>localStorage.setItem('ravi-os-tasks-v5',JSON.stringify(tasks)),[tasks])
  useEffect(()=>localStorage.setItem('ravi-os-notes-v1',JSON.stringify(notes)),[notes])

  const day=useMemo(()=>weekday(now),[now])
  const openTasks=tasks.filter(t=>!t.done)
  const go=(s:Section)=>{setActive(s);setSheet(null);window.scrollTo({top:0,behavior:'smooth'})}
  const toggleTask=(id:number)=>setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t))
  const addTask=()=>{
    const title=taskTitle.trim(); if(!title)return
    setTasks(p=>[{id:Date.now(),title,meta:'Personal · Added now',priority:'Medium',done:false},...p])
    setTaskTitle('');setSheet(null);setActive('Tasks')
  }
  const addNote=()=>{
    const text=noteText.trim();if(!text)return
    setNotes(p=>[{id:Date.now(),text,created:'Just now'},...p]);setNoteText('');setSheet(null);setActive('Journal')
  }
  const enableLocation=()=>navigator.geolocation?.getCurrentPosition(()=>setLocation('Live location enabled'),()=>setLocation('Auckland'))

  return <main className="appShell">
    <aside className="sidebar desktopOnly">
      <button className="brand" onClick={()=>go('Home')}><span className="brandMark">RG</span><span><b>Ravi OS</b><small>Personal assistant</small></span></button>
      <nav className="sideNav">
        <button className={active==='Home'?'active':''} onClick={()=>go('Home')}><Home/>Home</button>
        <button className={active==='Inbox'?'active':''} onClick={()=>go('Inbox')}><Inbox/>Inbox <i>2</i></button>
        <button className={active==='Tasks'?'active':''} onClick={()=>go('Tasks')}><ListChecks/>Tasks</button>
        <button className={active==='Calendar'?'active':''} onClick={()=>go('Calendar')}><CalendarDays/>Calendar</button>
        <Link href="/reminders"><Bell/>Reminders</Link>
        <Link href="/construction"><HardHat/>Construction <i>2</i></Link>
        <button className={active==='Family'?'active':''} onClick={()=>go('Family')}><Users/>Family</button>
        <button className={active==='Health'?'active':''} onClick={()=>go('Health')}><HeartPulse/>Health</button>
        <button className={active==='Finance'?'active':''} onClick={()=>go('Finance')}><WalletCards/>Finance</button>
      </nav>
      <div className="sidebarFooter"><ShieldCheck/><span><b>Private workspace</b><small>PIN protected</small></span></div>
    </aside>

    <section className="content">
      <header className="mobileHeader">
        <div><p>RAVI OS</p><h1>{active==='Home'?`${greeting(now)}, Ravi.`:active}</h1></div>
        <div className="headerIcons"><button aria-label="Search"><Search/></button><button aria-label="Notifications" onClick={()=>setSheet('notifications')}><Bell/><i>4</i></button></div>
      </header>

      {active==='Home'&&<HomeView now={now} day={day} location={location} diet={dietFor(day)} openTasks={openTasks.length} go={go} setSheet={setSheet} enableLocation={enableLocation}/>} 
      {active==='Inbox'&&<InboxView/>}
      {active==='Tasks'&&<TasksView tasks={tasks} toggleTask={toggleTask} onAdd={()=>setSheet('task')}/>} 
      {active==='Calendar'&&<CalendarView/>}
      {active==='Family'&&<SimpleView icon={<Users/>} title="Family" text="Family appointments, school, PTM, doctor visits and shared responsibilities."/>}
      {active==='Projects'&&<SimpleView icon={<Target/>} title="Projects" text="Personal and professional projects, separated from daily tasks."/>}
      {active==='Health'&&<SimpleView icon={<HeartPulse/>} title="Health" text="Health signals and Apple Health integration will live here."/>}
      {active==='Finance'&&<SimpleView icon={<CircleDollarSign/>} title="Finance" text="Protected bills, accounts, payments and financial reminders."/>}
      {active==='Journal'&&<JournalView notes={notes}/>} 
    </section>

    <nav className="bottomNav">
      <button className={active==='Home'?'active':''} onClick={()=>go('Home')}><Home/><span>Home</span></button>
      <button className={active==='Tasks'?'active':''} onClick={()=>go('Tasks')}><ListChecks/><span>Tasks</span></button>
      <button className="primaryAdd" onClick={()=>setSheet('actions')} aria-label="Add"><Plus/></button>
      <button className={active==='Calendar'?'active':''} onClick={()=>go('Calendar')}><CalendarDays/><span>Calendar</span></button>
      <button onClick={()=>setSheet('more')}><MoreHorizontal/><span>More</span></button>
    </nav>

    {sheet&&<div className="sheetBackdrop" onClick={()=>setSheet(null)}><div className="bottomSheet" onClick={e=>e.stopPropagation()}>
      <div className="sheetHandle"/><button className="sheetClose" onClick={()=>setSheet(null)}><X/></button>
      {sheet==='actions'&&<ActionSheet onTask={()=>setSheet('task')} onNote={()=>setSheet('note')}/>} 
      {sheet==='notifications'&&<NotificationSheet go={go}/>} 
      {sheet==='task'&&<CreateTask title={taskTitle} setTitle={setTaskTitle} save={addTask}/>} 
      {sheet==='note'&&<CreateNote text={noteText} setText={setNoteText} save={addNote}/>} 
      {sheet==='more'&&<MoreSheet go={go}/>} 
    </div></div>}
  </main>
}

function HomeView({now,day,location,diet,openTasks,go,setSheet,enableLocation}:{now:Date;day:string;location:string;diet:string;openTasks:number;go:(s:Section)=>void;setSheet:(s:any)=>void;enableLocation:()=>void}){
  const time=new Intl.DateTimeFormat('en-NZ',{timeZone:'Pacific/Auckland',hour:'numeric',minute:'2-digit'}).format(now)
  return <>
    <section className="todayStrip">
      <button onClick={enableLocation}><MapPin/><span>{location}</span></button><span>{day}</span><span>{time}</span><span className="dietChip"><Utensils/>{diet}</span>
    </section>

    <section className="quickCapture">
      <div><Sparkles/><span><b>What do you need to remember?</b><small>Speak, scan a poster, create a reminder or task.</small></span></div>
      <button onClick={()=>setSheet('actions')}><Plus/>Add something</button>
    </section>

    <section className="sectionBlock">
      <div className="sectionTitle"><div><p>RIGHT NOW</p><h2>Needs your attention</h2></div><button onClick={()=>setSheet('notifications')}>View all</button></div>
      <div className="notificationList">
        <button onClick={()=>go('Inbox')}><span className="notifIcon blue"><Mail/></span><span><b>2 new emails</b><small>Across your connected inboxes</small></span><ChevronRight/></button>
        <Link href="/reminders"><span className="notifIcon amber"><Bell/></span><span><b>Reminders ready</b><small>Capture by voice, text or poster</small></span><ChevronRight/></Link>
        <Link href="/construction"><span className="notifIcon red"><HardHat/></span><span><b>Construction update</b><small>2 items need attention</small></span><ChevronRight/></Link>
      </div>
    </section>

    <section className="homeCards">
      <button className="summaryCard" onClick={()=>go('Tasks')}><span><ListChecks/></span><div><small>OPEN TASKS</small><strong>{openTasks}</strong><p>Tap to review and add tasks</p></div><ChevronRight/></button>
      <button className="summaryCard" onClick={()=>go('Calendar')}><span><CalendarDays/></span><div><small>NEXT</small><strong>Calendar</strong><p>Appointments and commitments</p></div><ChevronRight/></button>
    </section>
  </>
}

function ActionSheet({onTask,onNote}:{onTask:()=>void;onNote:()=>void}){
  return <><div className="sheetTitle"><p>QUICK ADD</p><h2>What are you adding?</h2></div><div className="actionGrid">
    <Link href="/reminders"><span className="actionIcon green"><Bell/></span><b>Reminder</b><small>Voice, text or image</small></Link>
    <button onClick={onTask}><span className="actionIcon blue"><ListChecks/></span><b>Task</b><small>Something to do</small></button>
    <Link href="/reminders"><span className="actionIcon purple"><Mic/></span><b>Speak</b><small>Say it naturally</small></Link>
    <Link href="/reminders"><span className="actionIcon amber"><ImageIcon/></span><b>Scan poster</b><small>Photo or image</small></Link>
    <button onClick={onNote}><span className="actionIcon grey"><StickyNote/></span><b>Note</b><small>Save a thought</small></button>
    <Link href="/construction"><span className="actionIcon red"><HardHat/></span><b>Construction</b><small>House update</small></Link>
  </div></>
}

function NotificationSheet({go}:{go:(s:Section)=>void}){
  return <><div className="sheetTitle"><p>NOTIFICATIONS</p><h2>4 things to know</h2></div><div className="sheetList">
    <button onClick={()=>go('Inbox')}><Mail/><span><b>2 new emails</b><small>Open Inbox</small></span><ChevronRight/></button>
    <button onClick={()=>go('Calendar')}><CalendarDays/><span><b>Upcoming appointment</b><small>Open Calendar</small></span><ChevronRight/></button>
    <Link href="/construction"><HardHat/><span><b>Construction update</b><small>2 items need attention</small></span><ChevronRight/></Link>
    <Link href="/reminders"><Bell/><span><b>Reminder Centre</b><small>Create or review reminders</small></span><ChevronRight/></Link>
  </div></>
}

function CreateTask({title,setTitle,save}:{title:string;setTitle:(v:string)=>void;save:()=>void}){
  return <div className="formSheet"><div className="sheetTitle"><p>NEW TASK</p><h2>Add a task</h2></div><label>What needs to be done?<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="e.g. Call contractor tomorrow"/></label><button className="primaryButton" onClick={save}>Add task</button></div>
}

function CreateNote({text,setText,save}:{text:string;setText:(v:string)=>void;save:()=>void}){
  return <div className="formSheet"><div className="sheetTitle"><p>NEW NOTE</p><h2>Save a thought</h2></div><label>Note<textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Write anything you want to remember…"/></label><button className="primaryButton" onClick={save}>Save note</button></div>
}

function MoreSheet({go}:{go:(s:Section)=>void}){
  return <><div className="sheetTitle"><p>MORE</p><h2>Your workspaces</h2></div><div className="sheetList twoCol">
    <button onClick={()=>go('Inbox')}><Inbox/><span><b>Inbox</b></span></button><button onClick={()=>go('Family')}><Users/><span><b>Family</b></span></button>
    <button onClick={()=>go('Health')}><HeartPulse/><span><b>Health</b></span></button><button onClick={()=>go('Finance')}><WalletCards/><span><b>Finance</b></span></button>
    <button onClick={()=>go('Journal')}><StickyNote/><span><b>Journal</b></span></button><Link href="/construction"><HardHat/><span><b>Construction</b></span></Link>
  </div></>
}

function InboxView(){return <section className="pageSection"><div className="sectionTitle"><div><p>INBOX</p><h2>Your mailboxes</h2></div><span className="countBadge">2 new</span></div><div className="accountList">{inboxes.map(box=><div key={box.name}><span className="avatar">{box.name[0]}</span><span><b>{box.name}</b><small>{box.address}</small></span><em>{box.unread?`${box.unread} new`:'No new mail'}</em></div>)}</div><div className="emptyState"><Mail/><b>Mailbox detail comes here</b><p>Home will only show counts. Email detail stays inside Inbox.</p></div></section>}

function TasksView({tasks,toggleTask,onAdd}:{tasks:Task[];toggleTask:(id:number)=>void;onAdd:()=>void}){return <section className="pageSection"><div className="sectionTitle"><div><p>TASKS</p><h2>Things to do</h2></div><button className="smallPrimary" onClick={onAdd}><Plus/>Task</button></div><div className="taskList">{tasks.map(t=><button key={t.id} className={t.done?'taskRow done':'taskRow'} onClick={()=>toggleTask(t.id)}><span className="checkBox">{t.done&&<Check/>}</span><span><b>{t.title}</b><small>{t.meta}</small></span><em className={t.priority.toLowerCase()}>{t.priority}</em></button>)}</div></section>}

function CalendarView(){return <section className="pageSection"><div className="sectionTitle"><div><p>CALENDAR</p><h2>Appointments</h2></div></div><div className="emptyState"><CalendarDays/><b>Google Calendar integration is next</b><p>Doctor visits, PTM, community events and personal appointments will appear here.</p><Link href="/reminders">Create a reminder</Link></div></section>}
function JournalView({notes}:{notes:Note[]}){return <section className="pageSection"><div className="sectionTitle"><div><p>JOURNAL</p><h2>Your notes</h2></div></div>{notes.length===0?<div className="emptyState"><StickyNote/><b>No notes yet</b><p>Use the centre + button and choose Note.</p></div>:<div className="noteList">{notes.map(n=><div key={n.id}><b>{n.text}</b><small>{n.created}</small></div>)}</div>}</section>}
function SimpleView({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <section className="pageSection"><div className="emptyState large">{icon}<b>{title}</b><p>{text}</p></div></section>}
