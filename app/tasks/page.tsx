'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, Circle, Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import styles from './tasks.module.css'

type Task={id:string;title:string;notes:string;dueDate:string;dueTime:string;priority:'high'|'medium'|'low';category:string;status:'open'|'completed'|'cancelled';completedAt?:string|null;createdAt?:string;updatedAt?:string}
type Filter='today'|'upcoming'|'completed'|'all'

function todayNZ(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function dueStamp(t:Task){if(!t.dueDate)return Number.MAX_SAFE_INTEGER;return new Date(`${t.dueDate}T${t.dueTime||'23:59'}:00`).getTime()}
function dueLabel(t:Task){if(!t.dueDate)return'No due date';const d=new Date(`${t.dueDate}T12:00:00`);const label=d.toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short'});return t.dueTime?`${label} · ${t.dueTime}`:label}

export default function TasksPage(){
  const[tasks,setTasks]=useState<Task[]>([]);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState<Filter>('today');const[open,setOpen]=useState(false);const[editing,setEditing]=useState<string|null>(null)
  const[title,setTitle]=useState('');const[notes,setNotes]=useState('');const[dueDate,setDueDate]=useState('');const[dueTime,setDueTime]=useState('');const[priority,setPriority]=useState<'high'|'medium'|'low'>('medium');const[category,setCategory]=useState('Personal');const[working,setWorking]=useState(false);const[error,setError]=useState('')
  const load=async()=>{try{const r=await fetch('/api/tasks',{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();setTasks(d.tasks||[]);setError('')}catch{setError('Tasks could not be loaded. Please refresh.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const counts=useMemo(()=>{const today=todayNZ();return{today:tasks.filter(t=>t.status==='open'&&t.dueDate===today).length,upcoming:tasks.filter(t=>t.status==='open'&&(!t.dueDate||t.dueDate>today)).length,completed:tasks.filter(t=>t.status==='completed').length}},[tasks])
  const visible=useMemo(()=>{const today=todayNZ();return[...tasks].filter(t=>filter==='completed'?t.status==='completed':filter==='today'?t.status==='open'&&t.dueDate===today:filter==='upcoming'?t.status==='open'&&(!t.dueDate||t.dueDate>today):t.status!=='cancelled').sort((a,b)=>a.status===b.status?dueStamp(a)-dueStamp(b):a.status==='open'?-1:1)},[tasks,filter])
  const reset=()=>{setEditing(null);setTitle('');setNotes('');setDueDate('');setDueTime('');setPriority('medium');setCategory('Personal');setError('')}
  const startAdd=()=>{reset();setOpen(true)}
  const startEdit=(t:Task)=>{setEditing(t.id);setTitle(t.title);setNotes(t.notes||'');setDueDate(t.dueDate||'');setDueTime(t.dueTime||'');setPriority(t.priority);setCategory(t.category||'Personal');setOpen(true);window.scrollTo({top:0,behavior:'smooth'})}
  async function save(e:FormEvent){e.preventDefault();if(!title.trim())return;setWorking(true);const body={title:title.trim(),notes:notes.trim(),dueDate:dueDate||null,dueTime:dueTime||null,priority,category};const r=await fetch(editing?`/api/tasks/${editing}`:'/api/tasks',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.ok){await load();setOpen(false);reset()}else setError('Task could not be saved.');setWorking(false)}
  async function toggle(t:Task){const completed=t.status!=='completed';const r=await fetch(`/api/tasks/${t.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed})});if(r.ok)await load()}
  async function remove(id:string){if(!confirm('Delete this task?'))return;const r=await fetch(`/api/tasks/${id}`,{method:'DELETE'});if(r.ok)await load()}

  return <main className={styles.shell}>
    <header className={styles.header}><Link href='/' className={styles.back}><ArrowLeft/>Ravi OS</Link><div><p>TASKS</p><h1>What needs to get done?</h1><span>Private to Ravi. Due work first, completed work out of the way.</span></div><button className={styles.add} onClick={startAdd}><Plus/>Add task</button></header>

    <section className={styles.stats}><button className={filter==='today'?styles.active:''} onClick={()=>setFilter('today')}><b>{counts.today}</b><span>Today</span></button><button className={filter==='upcoming'?styles.active:''} onClick={()=>setFilter('upcoming')}><b>{counts.upcoming}</b><span>Upcoming</span></button><button className={filter==='completed'?styles.active:''} onClick={()=>setFilter('completed')}><b>{counts.completed}</b><span>Completed</span></button><button className={filter==='all'?styles.active:''} onClick={()=>setFilter('all')}><b>{tasks.length}</b><span>All</span></button></section>

    {open&&<section className={styles.formCard}><div className={styles.formHead}><div><p>{editing?'EDIT TASK':'NEW TASK'}</p><h2>{editing?'Update task':'Add something to do'}</h2></div><button onClick={()=>{setOpen(false);reset()}}><X/></button></div><form onSubmit={save}><label>Task<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder='e.g. Call contractor about milestone'/></label><label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder='Anything useful to remember'/></label><div className={styles.two}><label>Due date<input type='date' value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Time<input type='time' value={dueTime} onChange={e=>setDueTime(e.target.value)}/></label></div><div className={styles.two}><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as 'high'|'medium'|'low')}><option value='high'>High</option><option value='medium'>Medium</option><option value='low'>Low</option></select></label><label>Category<input value={category} onChange={e=>setCategory(e.target.value)} placeholder='Personal'/></label></div>{error&&<div className={styles.error}>{error}</div>}<button className={styles.save} disabled={working||!title.trim()}><Save/>{working?'Saving…':'Save task'}</button></form></section>}

    <section className={styles.listCard}><div className={styles.listHead}><div><p>{filter.toUpperCase()}</p><h2>{filter==='today'?"Today's tasks":filter==='upcoming'?'Coming up':filter==='completed'?'Completed':'All tasks'}</h2></div><span>{visible.length}</span></div>{loading?<div className={styles.empty}>Loading tasks…</div>:error&&!tasks.length?<div className={styles.empty}>{error}</div>:visible.length===0?<div className={styles.empty}><Circle/><b>Nothing here</b><span>{filter==='today'?'No tasks are due today.':'Add a task when something needs your attention.'}</span><button onClick={startAdd}><Plus/>Add task</button></div>:<div className={styles.list}>{visible.map(t=><article key={t.id} className={`${styles.task} ${t.status==='completed'?styles.done:''}`}><button className={styles.check} onClick={()=>toggle(t)} aria-label={t.status==='completed'?'Reopen task':'Complete task'}>{t.status==='completed'?<Check/>:<Circle/>}</button><div className={styles.body}><div className={styles.titleRow}><b>{t.title}</b><em className={styles[t.priority]}>{t.priority}</em></div><small>{t.category} · {dueLabel(t)}</small>{t.notes&&<span>{t.notes}</span>}</div><div className={styles.actions}><button onClick={()=>startEdit(t)} aria-label='Edit'><Edit3/></button><button onClick={()=>remove(t.id)} aria-label='Delete'><Trash2/></button></div></article>)}</div>}</section>

    <nav className={styles.bottom}><Link href='/'><span>Home</span></Link><button className={styles.current}><span>Tasks</span></button><button className={styles.plus} onClick={startAdd}><Plus/></button><Link href='/reminders'><CalendarDays/><span>Reminders</span></Link></nav>
  </main>
}
