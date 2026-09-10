'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BellRing, CalendarPlus, Camera, Check, Clock3, FileImage, Mail, Mic, Plus, Sparkles, Trash2 } from 'lucide-react'
import styles from './reminders.module.css'

type Reminder = {
  id: number
  title: string
  notes: string
  date: string
  time: string
  source: 'text' | 'voice' | 'image'
  calendarAdded?: boolean
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

const storageKey = 'ravi-os-reminders-v1'

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
}

function calendarUrl(r: Reminder) {
  const start = new Date(`${r.date}T${r.time || '09:00'}:00`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: r.title, dates: `${fmt(start)}/${fmt(end)}`, details: r.notes || 'Created from Ravi OS', ctz: 'Pacific/Auckland' })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function smartParse(input: string) {
  const text = input.trim()
  const lower = text.toLowerCase()
  let date = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  if (lower.includes('tomorrow')) date = tomorrowISO()
  let time = ''
  const m = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)
  if (m) {
    let h = Number(m[1]); const mins = m[2] || '00'
    if (m[3] === 'pm' && h < 12) h += 12
    if (m[3] === 'am' && h === 12) h = 0
    time = `${String(h).padStart(2, '0')}:${mins}`
  } else if (lower.includes('evening')) time = '19:00'
  else if (lower.includes('morning')) time = '08:00'
  else if (lower.includes('afternoon')) time = '15:00'
  const title = text.replace(/\b(remind me to|tomorrow|today|morning|afternoon|evening|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi, ' ').replace(/\s+/g, ' ').trim()
  return { title: title || text || 'New reminder', date, time }
}

export default function ReminderCentre() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(tomorrowISO())
  const [time, setTime] = useState('19:00')
  const [source, setSource] = useState<Reminder['source']>('text')
  const [listening, setListening] = useState(false)
  const [imageName, setImageName] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('Not enabled')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setReminders(JSON.parse(saved))
    if ('Notification' in window) setNotificationStatus(Notification.permission === 'granted' ? 'Enabled' : 'Not enabled')
  }, [])

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(reminders)) }, [reminders])

  const upcoming = useMemo(() => reminders.filter(r => new Date(`${r.date}T${r.time || '23:59'}`) >= new Date()).sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [reminders])

  const analyse = () => {
    const parsed = smartParse(raw)
    setTitle(parsed.title)
    setDate(parsed.date)
    if (parsed.time) setTime(parsed.time)
  }

  const createReminder = () => {
    if (!title.trim() || !date || !time) return
    const reminder: Reminder = { id: Date.now(), title: title.trim(), notes: notes.trim(), date, time, source }
    setReminders(prev => [reminder, ...prev])
    setRaw(''); setTitle(''); setNotes(''); setImageName(''); setSource('text')
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) { setNotificationStatus('Not supported in this browser'); return }
    const result = await Notification.requestPermission()
    setNotificationStatus(result === 'granted' ? 'Enabled' : 'Permission not granted')
    if (result === 'granted') new Notification('Ravi OS reminders enabled', { body: 'Browser notifications are now allowed on this device.' })
  }

  const startVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) { alert('Voice recognition is not supported by this browser. Try Safari/Chrome on a supported device or type the reminder.'); return }
    const rec = new Speech(); recognitionRef.current = rec
    rec.lang = 'en-NZ'; rec.continuous = false; rec.interimResults = false
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || ''
      setRaw(text); setSource('voice')
      const parsed = smartParse(text); setTitle(parsed.title); setDate(parsed.date); if (parsed.time) setTime(parsed.time)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    setListening(true); rec.start()
  }

  const onImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageName(file.name); setSource('image')
    setNotes(`Poster/image attached: ${file.name}. Automatic poster text extraction will activate when the AI parser is connected.`)
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <Link href="/" className={styles.back}><ArrowLeft/> Ravi OS</Link>
      <div><p>REMINDER CENTRE</p><h1>Capture it once. Don’t forget it.</h1><span>Speak, type or add a poster. Confirm the reminder, then send it to your calendar.</span></div>
      <button onClick={requestNotifications} className={styles.notify}><BellRing/><span><b>Notifications</b><small>{notificationStatus}</small></span></button>
    </header>

    <section className={styles.captureGrid}>
      <div className={styles.captureCard}>
        <div className={styles.captureHead}><span><Sparkles/></span><div><p>QUICK CAPTURE</p><h2>What do you need to remember?</h2></div></div>
        <textarea value={raw} onChange={e => { setRaw(e.target.value); setSource('text') }} placeholder="Example: Remind me to attend BJSM community meeting tomorrow at 7 pm" />
        <div className={styles.captureActions}>
          <button onClick={startVoice} className={listening ? styles.listening : ''}><Mic/>{listening ? 'Listening…' : 'Speak reminder'}</button>
          <label><Camera/>Add poster/image<input type="file" accept="image/*" capture="environment" onChange={onImage}/></label>
          <button className={styles.analyse} onClick={analyse}><Sparkles/>Extract details</button>
        </div>
        {imageName && <div className={styles.imageChip}><FileImage/>{imageName}<span>image ready</span></div>}
      </div>

      <div className={styles.confirmCard}>
        <div className={styles.confirmHead}><div><p>CONFIRM</p><h2>Reminder details</h2></div><span>Human approval</span></div>
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Reminder title"/></label>
        <div className={styles.two}><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e => setTime(e.target.value)}/></label></div>
        <label>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional details, address, phone number, what to carry…"/></label>
        <button className={styles.create} onClick={createReminder}><Plus/>Save reminder</button>
      </div>
    </section>

    <section className={styles.delivery}>
      <div><BellRing/><span><b>Ravi OS</b><small>Reminder saved in your private reminder list</small></span></div>
      <div><CalendarPlus/><span><b>Google Calendar</b><small>One tap creates the event on the calendar used by your phone</small></span></div>
      <div><Mail/><span><b>Email alerts</b><small>Architecture ready, will activate with server-side notification service</small></span></div>
    </section>

    <section className={styles.listCard}>
      <div className={styles.listHead}><div><p>UPCOMING</p><h2>Your reminders</h2></div><span>{upcoming.length} upcoming</span></div>
      {reminders.length === 0 ? <div className={styles.empty}><BellRing/><b>No reminders yet</b><span>Create one above. Try voice first.</span></div> : <div className={styles.list}>
        {reminders.map(r => <article key={r.id}>
          <div className={styles.dateBox}><b>{new Date(`${r.date}T12:00:00`).toLocaleDateString('en-NZ',{day:'2-digit',month:'short'})}</b><span>{r.time}</span></div>
          <div className={styles.reminderText}><b>{r.title}</b><small>{r.notes || `Captured by ${r.source}`}</small><span>{r.source === 'voice' ? 'Voice' : r.source === 'image' ? 'Image/poster' : 'Text'} capture</span></div>
          <div className={styles.rowActions}><a href={calendarUrl(r)} target="_blank" rel="noreferrer"><CalendarPlus/>Add to Calendar</a><button onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}><Trash2/></button></div>
        </article>)}
      </div>}
    </section>
  </main>
}
