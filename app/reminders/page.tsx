'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BellRing, CalendarPlus, Camera, CheckCircle2, ChevronRight, FileImage, Image as ImageIcon, Mail, Mic, Plus, Sparkles, Trash2 } from 'lucide-react'
import { parsePosterSemantics } from '../../lib/reminder-poster-parser'
import styles from './reminders.module.css'

type Reminder = {
  id: number
  title: string
  notes: string
  date: string
  time: string
  source: 'text' | 'voice' | 'image'
  imageName?: string
  imageDataUrl?: string
  notified?: boolean
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

const storageKey = 'ravi-os-reminders-v2'
const monthNumbers: Record<string, string> = {
  jan:'01', january:'01', feb:'02', february:'02', mar:'03', march:'03', apr:'04', april:'04', may:'05',
  jun:'06', june:'06', jul:'07', july:'07', aug:'08', august:'08', sep:'09', sept:'09', september:'09',
  oct:'10', october:'10', nov:'11', november:'11', dec:'12', december:'12',
  'जनवरी':'01','फरवरी':'02','मार्च':'03','अप्रैल':'04','मई':'05','जून':'06','जुलाई':'07','अगस्त':'08','सितंबर':'09','सितम्बर':'09','अक्टूबर':'10','नवंबर':'11','नवम्बर':'11','दिसंबर':'12'
}

function aucklandISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
}

function normalizeDigits(input: string) {
  const devanagari = '०१२३४५६७८९'
  return input.replace(/[०-९]/g, char => String(devanagari.indexOf(char)))
}

function calendarUrl(r: Reminder) {
  const start = new Date(`${r.date}T${r.time || '09:00'}:00`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const p = new URLSearchParams({ action:'TEMPLATE', text:r.title, dates:`${fmt(start)}/${fmt(end)}`, details:r.notes || 'Created from Ravi OS', ctz:'Pacific/Auckland' })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function extractDate(input: string) {
  const lower = normalizeDigits(input).toLowerCase()
  if (lower.includes('tomorrow') || lower.includes('कल')) return aucklandISO(1)
  if (lower.includes('today') || lower.includes('आज')) return aucklandISO()
  const numeric = lower.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/)
  if (numeric) {
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]
    return `${year}-${numeric[2].padStart(2,'0')}-${numeric[1].padStart(2,'0')}`
  }
  const english = lower.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/)
  if (english) {
    const month = monthNumbers[english[2]]
    if (month) return `${english[3]}-${month}-${english[1].padStart(2,'0')}`
  }
  const hindi = lower.match(/(\d{1,2})\s*(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|नवम्बर|दिसंबर)\s*(\d{4})/)
  if (hindi) {
    const month = monthNumbers[hindi[2]]
    if (month) return `${hindi[3]}-${month}-${hindi[1].padStart(2,'0')}`
  }
  return aucklandISO()
}

function smartParse(input: string) {
  const text = normalizeDigits(input.trim())
  const lower = text.toLowerCase()
  const date = extractDate(lower)
  let time = ''
  const m = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/)
  if (m) {
    let h = Number(m[1]); const mins = m[2] || '00'; const meridiem = m[3].replace(/\./g,'')
    if (meridiem === 'pm' && h < 12) h += 12
    if (meridiem === 'am' && h === 12) h = 0
    time = `${String(h).padStart(2,'0')}:${mins}`
  } else {
    const twentyFour = lower.match(/(?:समय|time)?\s*[:\-]?\s*([01]?\d|2[0-3]):([0-5]\d)/)
    if (twentyFour) time = `${twentyFour[1].padStart(2,'0')}:${twentyFour[2]}`
    else if (lower.includes('evening') || lower.includes('शाम')) time = '19:00'
    else if (lower.includes('morning') || lower.includes('सुबह')) time = '08:00'
    else if (lower.includes('afternoon') || lower.includes('दोपहर')) time = '15:00'
    else if (lower.includes('night') || lower.includes('रात')) time = '20:00'
  }
  const lines = text.split(/\n+/).map(x => x.trim()).filter(Boolean)
  const firstUsefulLine = lines.find(x => x.length > 4 && !/^\d+[\s\/:.-]/.test(x)) || lines[0] || text
  const cleaned = firstUsefulLine.replace(/\b(remind me to|tomorrow|today|morning|afternoon|evening|night|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi,' ').replace(/(याद दिला(?:ना|ए)?|कल|आज|सुबह|दोपहर|शाम|रात)/g,' ').replace(/\s+/g,' ').trim()
  return { title: cleaned.slice(0,120) || 'New reminder', date, time }
}

function reminderTimestamp(r: Reminder) { return new Date(`${r.date}T${r.time || '23:59'}:00`).getTime() }
function urgency(r: Reminder) { const h=(reminderTimestamp(r)-Date.now())/3_600_000; if(h<=24)return'today'; if(h<=48)return'tomorrow'; if(h<=72)return'soon'; return'later' }
function countdown(r: Reminder) { const diff=reminderTimestamp(r)-Date.now(); if(diff<0)return'Overdue'; const mins=Math.max(1,Math.round(diff/60000)); if(mins<60)return`${mins}m left`; const hrs=Math.floor(mins/60); if(hrs<24)return`${hrs}h ${mins%60}m left`; const days=Math.floor(hrs/24); return`${days}d ${hrs%24}h left` }

function makePosterPreview(file: File): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 900
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height)
        resolve(canvas.toDataURL('image/jpeg',0.72))
      }
      img.onerror = () => resolve('')
      img.src = String(reader.result || '')
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

async function showReminderNotification(reminder: Reminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = reminder.notes || `Reminder scheduled for ${reminder.time}`
  try { const registration=await navigator.serviceWorker?.ready; if(registration){ await registration.showNotification(reminder.title,{body,tag:`ravi-os-reminder-${reminder.id}`,data:{url:`/reminders/${reminder.id}`}}); return } } catch {}
  new Notification(reminder.title,{body})
}

export default function ReminderCentre() {
  const [reminders,setReminders]=useState<Reminder[]>([])
  const [raw,setRaw]=useState(''); const [title,setTitle]=useState(''); const [notes,setNotes]=useState('')
  const [date,setDate]=useState(aucklandISO(1)); const [time,setTime]=useState('19:00'); const [source,setSource]=useState<Reminder['source']>('text')
  const [listening,setListening]=useState(false); const [imageName,setImageName]=useState(''); const [imagePreview,setImagePreview]=useState('')
  const [ocrStatus,setOcrStatus]=useState(''); const [notificationStatus,setNotificationStatus]=useState('Not enabled'); const [savedMessage,setSavedMessage]=useState('')
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null)

  useEffect(()=>{ const saved=localStorage.getItem(storageKey); if(saved) try{setReminders(JSON.parse(saved))}catch{}; if('Notification'in window)setNotificationStatus(Notification.permission==='granted'?'Enabled on this device':'Not enabled'); if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>undefined) },[])
  useEffect(()=>{ try{localStorage.setItem(storageKey,JSON.stringify(reminders))}catch{} },[reminders])
  useEffect(()=>{ const tick=async()=>{const now=Date.now(); const due=reminders.find(r=>!r.notified&&reminderTimestamp(r)<=now&&reminderTimestamp(r)>now-60000); if(!due)return; await showReminderNotification(due); setReminders(p=>p.map(r=>r.id===due.id?{...r,notified:true}:r))}; tick(); const timer=window.setInterval(tick,15000); return()=>window.clearInterval(timer) },[reminders])

  const sortedReminders=useMemo(()=>[...reminders].sort((a,b)=>reminderTimestamp(a)-reminderTimestamp(b)),[reminders])
  const upcoming=useMemo(()=>sortedReminders.filter(r=>reminderTimestamp(r)>=Date.now()),[sortedReminders])
  const applyParsedText=(text:string)=>{const p=smartParse(text);setTitle(p.title);setDate(p.date);if(p.time)setTime(p.time)}
  const analyse=()=>{if(!raw.trim())return;applyParsedText(raw);setOcrStatus('Details prepared. Review the title, date and time, then tap Save reminder.')}

  const createReminder=()=>{
    if(!title.trim()||!date||!time)return
    const reminder:Reminder={id:Date.now(),title:title.trim(),notes:notes.trim(),date,time,source,imageName:imageName||undefined,imageDataUrl:imagePreview||undefined,notified:false}
    setReminders(p=>[reminder,...p]); setSavedMessage(`Reminder saved for ${new Date(`${date}T${time}:00`).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'})}`)
    if('Notification'in window&&Notification.permission==='granted')new Notification('Reminder saved',{body:`${reminder.title} · ${date} ${time}`})
    setRaw('');setTitle('');setNotes('');setImageName('');setImagePreview('');setOcrStatus('');setSource('text')
  }

  const requestNotifications=async()=>{if(!('Notification'in window)){setNotificationStatus('Use Home Screen app or Calendar alerts on this browser');return} const result=await Notification.requestPermission();setNotificationStatus(result==='granted'?'Enabled on this device':'Permission not granted')}
  const startVoice=()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){alert('Live speech-to-text is not available in this browser yet. Type the reminder or use your phone keyboard microphone.');return} const rec=new Speech();recognitionRef.current=rec;rec.lang='en-NZ';rec.continuous=false;rec.interimResults=false;rec.onresult=(event:any)=>{const text=event.results?.[0]?.[0]?.transcript||'';setRaw(text);setSource('voice');applyParsedText(text)};rec.onerror=()=>setListening(false);rec.onend=()=>setListening(false);setListening(true);rec.start()}

  const onImage=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return
    setImageName(file.name);setSource('image');setSavedMessage('');setOcrStatus('Reading English and Hindi text from poster…')
    const preview=await makePosterPreview(file);setImagePreview(preview)
    try{const{createWorker}=await import('tesseract.js');const worker=await createWorker(['eng','hin']);const result=await worker.recognize(file);await worker.terminate();const extracted=result.data.text.trim();if(!extracted)throw new Error('No text');const parsed=smartParse(extracted);const poster=parsePosterSemantics(extracted);setRaw(extracted);setTitle(poster.title!=='Event reminder'?poster.title:parsed.title);setDate(parsed.date);if(parsed.time)setTime(parsed.time);setNotes(poster.venue?`${poster.venue}\nCaptured from poster: ${file.name}`:`Captured from poster: ${file.name}`);setOcrStatus('Poster read successfully. Review the title, date and time below, then save.')}catch{setOcrStatus('I could not read this poster clearly. Type the key details below and save the reminder.')}
  }

  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/" className={styles.back}><ArrowLeft/> Ravi OS</Link><div className={styles.heading}><p>REMINDER CENTRE</p><h1>Capture it once. Don’t forget it.</h1><span>Type, speak, or choose a poster. Review the details, then save.</span></div><button onClick={requestNotifications} className={styles.notify}><BellRing/><span><b>Phone alerts</b><small>{notificationStatus}</small></span></button></header>
    <section className={styles.statusStrip}><div><CheckCircle2/><span><b>English + Hindi posters</b><small>OCR reads both languages</small></span></div><div><BellRing/><span><b>Device alerts</b><small>{notificationStatus}</small></span></div><div><CalendarPlus/><span><b>Calendar-ready</b><small>Google Calendar handoff</small></span></div></section>

    <section className={styles.captureGrid}>
      <div className={styles.captureCard}><div className={styles.captureHead}><span><Sparkles/></span><div><p>STEP 1</p><h2>Add what you need to remember</h2></div></div><textarea value={raw} onChange={e=>{setRaw(e.target.value);setSource('text')}} placeholder="Type here, use your phone keyboard microphone, or choose a poster below…"/><div className={styles.captureActions}><button onClick={startVoice} className={listening?styles.listening:''}><Mic/>{listening?'Listening…':'Speak'}</button><label><ImageIcon/>Browse library<input type="file" accept="image/*" onChange={onImage}/></label><label><Camera/>Use camera<input type="file" accept="image/*" capture="environment" onChange={onImage}/></label><button className={styles.analyse} onClick={analyse}><Sparkles/>Prepare reminder</button></div>{imagePreview&&<div className={styles.previewWrap}><img src={imagePreview} alt="Selected poster"/><div><FileImage/><span><b>{imageName}</b><small>{ocrStatus||'Image ready'}</small></span></div></div>}</div>
      <div className={styles.confirmCard}><div className={styles.confirmHead}><div><p>STEP 2</p><h2>Review reminder</h2></div><span>Confirm before saving</span></div><label>What is the reminder?<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Reminder title"/></label><div className={styles.two}><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><label>Extra details<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Venue, address, person, what to carry…"/></label><button className={styles.create} onClick={createReminder}><Plus/>Save reminder</button>{savedMessage&&<div className={styles.saved}><CheckCircle2/>{savedMessage}</div>}</div>
    </section>

    <section className={styles.delivery}><div><BellRing/><span><b>Ravi OS notification</b><small>Works while Ravi OS is active where supported.</small></span></div><div><CalendarPlus/><span><b>Google Calendar</b><small>Add to Calendar for reliable phone alerts.</small></span></div><div><Mail/><span><b>Email delivery</b><small>Server-side delivery will be added with persistent reminders.</small></span></div></section>

    <section className={styles.listCard}><div className={styles.listHead}><div><p>UPCOMING</p><h2>Your reminders</h2></div><span>{upcoming.length} upcoming</span></div>{reminders.length===0?<div className={styles.empty}><BellRing/><b>No reminders yet</b><span>Type one, speak one, or choose a poster above.</span></div>:<div className={styles.list}>{sortedReminders.map(r=><article key={r.id} className={styles[urgency(r)]}><Link href={`/reminders/${r.id}`} className={styles.reminderLink}>{r.imageDataUrl?<img src={r.imageDataUrl} className={styles.thumb} alt="Reminder poster"/>:<div className={styles.dateBox}><b>{new Date(`${r.date}T12:00:00`).toLocaleDateString('en-NZ',{day:'2-digit',month:'short'})}</b><span>{r.time}</span></div>}<div className={styles.reminderText}><b>{r.title}</b><small>{r.notes||`Captured by ${r.source}`}</small><span>{countdown(r)}</span></div><ChevronRight className={styles.chevron}/></Link><div className={styles.rowActions}><a href={calendarUrl(r)} target="_blank" rel="noreferrer"><CalendarPlus/>Calendar</a><button aria-label="Delete reminder" onClick={()=>setReminders(p=>p.filter(x=>x.id!==r.id))}><Trash2/></button></div></article>)}</div>}</section>
  </main>
}
