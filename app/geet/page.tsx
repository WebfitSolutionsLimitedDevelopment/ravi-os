'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarClock, ChevronRight, Clock3, Edit3, Image as ImageIcon, LockKeyhole, LogOut, Plus, Save, Trash2, X } from 'lucide-react'
import { extractPosterFields } from '../../lib/poster-extract-client'
import { GEET_PHOTO_DATA_URI } from '../../lib/geet-photo'
import styles from './geet.module.css'

type Reminder={id:string;title:string;notes:string;date:string;time:string;source:'text'|'voice'|'image';imageName?:string;posterUrl?:string;createdBy?:string;updatedBy?:string}

// Reminder times are usually "HH:MM" but some (bulk-imported/shared ones)
// come through as "HH:MM:SS" — naively appending ":00" to those produces
// an invalid date, which broke sorting and showed "NaNd left" countdowns.
function normTime(t:string){const m=String(t||'').match(/^(\d{1,2}):(\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:'23:59'}
function stamp(r:Reminder){return new Date(`${r.date}T${normTime(r.time)}:00`).getTime()}
function countdown(r:Reminder){const d=stamp(r)-Date.now();if(d<0)return'Overdue';const m=Math.max(1,Math.round(d/60000));if(m<60)return`${m}m left`;const h=Math.floor(m/60);if(h<24)return`${h}h ${m%60}m left`;const days=Math.floor(h/24);return`${days}d ${h%24}h left`}
function urgency(r:Reminder){const h=(stamp(r)-Date.now())/3600000;if(h<=24)return styles.urgent;if(h<=48)return styles.tomorrow;if(h<=72)return styles.soon;return styles.later}
function dueAt(date:string,time:string){return new Date(`${date}T${normTime(time)}:00`).toISOString()}
function formatClock(now:Date,timeZone:string){return new Intl.DateTimeFormat('en-NZ',{timeZone,hour:'numeric',minute:'2-digit'}).format(now)}
function GeetPhoto({small=false}:{small?:boolean}){return <div className={small?styles.profilePhotoSmall:styles.profilePhoto}><img src={GEET_PHOTO_DATA_URI} alt="Geet"/></div>}

export default function GeetPage(){
  const[auth,setAuth]=useState<boolean|null>(null);const[pin,setPin]=useState('');const[loginError,setLoginError]=useState('')
  const[reminders,setReminders]=useState<Reminder[]>([]);const[showAll,setShowAll]=useState(false);const[formOpen,setFormOpen]=useState(false);const[syncError,setSyncError]=useState('')
  const[editing,setEditing]=useState<string|null>(null);const[title,setTitle]=useState('');const[date,setDate]=useState('');const[time,setTime]=useState('');const[venue,setVenue]=useState('')
  const[imageName,setImageName]=useState('');const[imageData,setImageData]=useState('');const[working,setWorking]=useState(false);const[message,setMessage]=useState('');const[now,setNow]=useState(new Date())

  const load=async()=>{try{const r=await fetch('/api/reminders',{cache:'no-store'});if(r.status===401){setAuth(false);return}if(r.ok){const d=await r.json();setReminders(d.reminders||[]);setSyncError('');setAuth(true);return}setSyncError('Shared reminders are temporarily unavailable.')}catch{setSyncError('Shared reminders are temporarily unavailable.')}}
  useEffect(()=>{fetch('/api/geet-auth',{cache:'no-store'}).then(r=>r.json()).then(d=>{setAuth(Boolean(d.authenticated));if(d.authenticated)load()}).catch(()=>setAuth(false));const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer)},[])

  const sorted=useMemo(()=>[...reminders].sort((a,b)=>stamp(a)-stamp(b)),[reminders]);const visible=showAll?sorted:sorted.slice(0,4)
  const reset=()=>{setEditing(null);setTitle('');setDate('');setTime('');setVenue('');setImageName('');setImageData('');setMessage('')}
  const openAdd=()=>{reset();setFormOpen(true)}
  const edit=(r:Reminder)=>{setEditing(r.id);setTitle(r.title);setDate(r.date);setTime(r.time);setVenue(r.notes||'');setImageName(r.imageName||'');setFormOpen(true);window.scrollTo({top:0,behavior:'smooth'})}

  async function login(e:FormEvent){e.preventDefault();setLoginError('');const r=await fetch('/api/geet-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});if(!r.ok){setLoginError('Incorrect PIN');setPin('');return}setPin('');setAuth(true);await load()}
  async function logout(){await fetch('/api/geet-auth',{method:'DELETE'});setAuth(false);setReminders([]);setSyncError('')}
  async function onPoster(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setWorking(true);setMessage('Reading event title, date, time and venue…');setImageName(file.name);setTitle('');setDate('');setTime('');setVenue('');try{const p=await extractPosterFields(file);setImageData(p.imageDataUrl);setTitle(p.title==='Event reminder'?'':p.title);setDate(p.date||'');setTime(p.time||'');setVenue([p.venue,p.address].filter(Boolean).join(', '));setMessage(p.title&&p.title!=='Event reminder'&&p.date&&p.time?'Looks good. Check once and save.':'Please check the missing field(s), then save.')}catch{setMessage('I could not read this poster reliably. Please enter the missing details.')}finally{setWorking(false)}}
  async function save(e:FormEvent){e.preventDefault();if(!title.trim()||!date||!time)return;setWorking(true);const body={title:title.trim(),notes:venue.trim(),date,time,dueAt:dueAt(date,time),source:imageName?'image':'text',imageName:imageName||undefined,imageDataUrl:imageData||undefined};const r=await fetch(editing?`/api/reminders/${editing}`:'/api/reminders',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.ok){await load();setFormOpen(false);reset()}else setMessage('Could not save this reminder. Please try again.');setWorking(false)}
  async function remove(id:string){if(!confirm('Delete this reminder?'))return;const r=await fetch(`/api/reminders/${id}`,{method:'DELETE'});if(r.ok)await load()}

  if(auth===null)return <main className={styles.loginShell}><div className={styles.loading}>Opening shared reminders…</div></main>
  if(!auth)return <main className={styles.loginShell}><section className={styles.loginCard}><GeetPhoto/><p>SHARED FAMILY REMINDERS</p><h1>Hi Geet 👋</h1><span>Enter your PIN to open Ravi & Geet reminders.</span><form onSubmit={login}><label><LockKeyhole/>PIN</label><input autoFocus inputMode="numeric" type="password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="Enter PIN"/>{loginError&&<small className={styles.error}>{loginError}</small>}<button disabled={!pin}>Open reminders</button></form></section></main>

  return <main className={styles.shell}>
    <header className={styles.top}><div className={styles.identity}><GeetPhoto small/><div><p>RAVI + GEET</p><h1>Our reminders</h1><span>Nearest reminder always comes first.</span></div></div><button onClick={logout} aria-label="Sign out"><LogOut/></button></header>
    <section className={styles.clocks}><div><Clock3/><span><small>AUCKLAND</small><b>{formatClock(now,'Pacific/Auckland')}</b></span></div><div><Clock3/><span><small>INDIA</small><b>{formatClock(now,'Asia/Kolkata')}</b></span></div></section>
    {syncError&&<div className={styles.syncWarning}><b>Shared sync issue</b><span>{syncError}</span></div>}
    <button className={styles.add} onClick={openAdd}><Plus/>Add reminder</button>

    {formOpen&&<section className={styles.formCard}><div className={styles.formHead}><div><p>{editing?'EDIT REMINDER':'NEW REMINDER'}</p><h2>{editing?'Update reminder':'What should we remember?'}</h2></div><button onClick={()=>{setFormOpen(false);reset()}}><X/></button></div>{!editing&&<label className={styles.posterButton}><ImageIcon/>Choose event poster<input type="file" accept="image/*" onChange={onPoster}/></label>}{imageData&&<img className={styles.preview} src={imageData} alt="Selected poster"/>}{message&&<div className={styles.message}>{working?'Please wait. ':''}{message}</div>}<form onSubmit={save} className={styles.form}><label>Event title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Meet the Candidates"/></label><div className={styles.row}><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><label>Venue & address<input value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Venue name and address"/></label><button disabled={working||!title.trim()||!date||!time}><Save/>{working?'Saving…':editing?'Save changes':'Save reminder'}</button></form></section>}

    <section className={styles.reminderBlock}><div className={styles.blockHead}><div><p>NEXT UP</p><h2><Bell/>Upcoming reminders</h2></div>{sorted.length>4&&<button onClick={()=>setShowAll(v=>!v)}>{showAll?'Show less':'View all'} <ChevronRight/></button>}</div>{syncError?<div className={styles.empty}><CalendarClock/><b>Shared reminders are unavailable</b><span>Please try again shortly.</span></div>:sorted.length===0?<div className={styles.empty}><CalendarClock/><b>No shared reminders yet</b><span>Add one from a poster or type it in.</span></div>:<div className={styles.list}>{visible.map(r=><article key={r.id} className={`${styles.card} ${urgency(r)}`}>{r.posterUrl?<a className={styles.poster} href={r.posterUrl} target="_blank" rel="noreferrer"><img src={r.posterUrl} alt="Event poster"/></a>:<div className={styles.dateTile}><b>{new Date(`${r.date}T12:00:00`).toLocaleDateString('en-NZ',{day:'2-digit',month:'short'})}</b><span>{r.time}</span></div>}<div className={styles.body}><b>{r.title}</b><small>{new Date(`${r.date}T12:00:00`).toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {r.time}</small>{r.notes&&<span>{r.notes}</span>}<em>{countdown(r)} · Added by {r.createdBy==='geet'?'Geet':'Ravi'}</em></div><div className={styles.actions}><button onClick={()=>edit(r)} aria-label="Edit"><Edit3/></button><button onClick={()=>remove(r.id)} aria-label="Delete"><Trash2/></button></div></article>)}</div>}</section>
  </main>
}