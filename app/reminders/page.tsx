'use client'

import Link from 'next/link'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BellRing, CalendarPlus, Camera, CheckCircle2, Clock3, FileImage, Image as ImageIcon, Mail, Mic, Plus, Sparkles, Trash2 } from 'lucide-react'
import styles from './reminders.module.css'

type Reminder = {
  id: number
  title: string
  notes: string
  date: string
  time: string
  source: 'text' | 'voice' | 'image'
  imageName?: string
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

function aucklandISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
}

function calendarUrl(r: Reminder) {
  const start = new Date(`${r.date}T${r.time || '09:00'}:00`)
  const end = new Date(start.getTime() + 30 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: r.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: r.notes || 'Created from Ravi OS',
    ctz: 'Pacific/Auckland',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function smartParse(input: string) {
  const text = input.trim()
  const lower = text.toLowerCase()
  let date = aucklandISO()
  if (lower.includes('tomorrow')) date = aucklandISO(1)
  let time = ''
  const m = lower.match(/(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)
  if (m) {
    let h = Number(m[1])
    const mins = m[2] || '00'
    if (m[3] === 'pm' && h < 12) h += 12
    if (m[3] === 'am' && h === 12) h = 0
    time = `${String(h).padStart(2, '0')}:${mins}`
  } else if (lower.includes('evening')) time = '19:00'
  else if (lower.includes('morning')) time = '08:00'
  else if (lower.includes('afternoon')) time = '15:00'

  const title = text
    .replace(/\b(remind me to|tomorrow|today|morning|afternoon|evening|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return { title: title || text || 'New reminder', date, time }
}

async function showReminderNotification(reminder: Reminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const body = reminder.notes || `Reminder scheduled for ${reminder.time}`
  try {
    const registration = await navigator.serviceWorker?.ready
    if (registration) {
      await registration.showNotification(reminder.title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `ravi-os-reminder-${reminder.id}`,
        data: { url: '/reminders' },
      })
      return
    }
  } catch {}
  new Notification(reminder.title, { body })
}

export default function ReminderCentre() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(aucklandISO(1))
  const [time, setTime] = useState('19:00')
  const [source, setSource] = useState<Reminder['source']>('text')
  const [listening, setListening] = useState(false)
  const [imageName, setImageName] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [notificationStatus, setNotificationStatus] = useState('Not enabled')
  const [savedMessage, setSavedMessage] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setReminders(JSON.parse(saved))
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission === 'granted' ? 'Enabled on this device' : 'Not enabled')
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reminders))
  }, [reminders])

  useEffect(() => {
    const tick = async () => {
      const now = Date.now()
      const due = reminders.find(r => {
        if (r.notified) return false
        const target = new Date(`${r.date}T${r.time}:00`).getTime()
        return target <= now && target > now - 60_000
      })
      if (!due) return
      await showReminderNotification(due)
      setReminders(prev => prev.map(r => r.id === due.id ? { ...r, notified: true } : r))
    }
    tick()
    const timer = window.setInterval(tick, 15_000)
    return () => window.clearInterval(timer)
  }, [reminders])

  const upcoming = useMemo(
    () => reminders
      .filter(r => new Date(`${r.date}T${r.time || '23:59'}`) >= new Date())
      .sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [reminders]
  )

  const analyse = () => {
    const parsed = smartParse(raw)
    setTitle(parsed.title)
    setDate(parsed.date)
    if (parsed.time) setTime(parsed.time)
  }

  const createReminder = async () => {
    if (!title.trim() || !date || !time) return
    const reminder: Reminder = {
      id: Date.now(),
      title: title.trim(),
      notes: notes.trim(),
      date,
      time,
      source,
      imageName: imageName || undefined,
      notified: false,
    }
    setReminders(prev => [reminder, ...prev])
    setSavedMessage(`Saved for ${new Date(`${date}T${time}:00`).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}`)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Reminder saved', { body: `${reminder.title} · ${date} ${time}` })
    }
    setRaw('')
    setTitle('')
    setNotes('')
    setImageName('')
    setImagePreview('')
    setSource('text')
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('Not supported in this browser')
      return
    }
    const result = await Notification.requestPermission()
    setNotificationStatus(result === 'granted' ? 'Enabled on this device' : 'Permission not granted')
    if (result === 'granted') {
      try {
        const registration = await navigator.serviceWorker?.ready
        await registration?.showNotification('Ravi OS reminders enabled', {
          body: 'This device can now show Ravi OS reminder notifications while the web app is active.',
          icon: '/icons/icon-192.png',
          data: { url: '/reminders' },
        })
      } catch {
        new Notification('Ravi OS reminders enabled', { body: 'Notifications are enabled on this device.' })
      }
    }
  }

  const startVoice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) {
      alert('Voice recognition is not supported by this browser. Use text capture or try a supported Safari/Chrome version.')
      return
    }
    const rec = new Speech()
    recognitionRef.current = rec
    rec.lang = 'en-NZ'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || ''
      setRaw(text)
      setSource('voice')
      const parsed = smartParse(text)
      setTitle(parsed.title)
      setDate(parsed.date)
      if (parsed.time) setTime(parsed.time)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }

  const onImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageName(file.name)
    setSource('image')
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
    setNotes(`Poster/image selected: ${file.name}. Enter or paste the event details above, then confirm the extracted reminder fields.`)
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <Link href="/" className={styles.back}><ArrowLeft/> Ravi OS</Link>
      <div className={styles.heading}><p>REMINDER CENTRE</p><h1>Capture it once. Don’t forget it.</h1><span>Voice, text and image capture in one place. Confirm before anything is scheduled.</span></div>
      <button onClick={requestNotifications} className={styles.notify}><BellRing/><span><b>Push notifications</b><small>{notificationStatus}</small></span></button>
    </header>

    <section className={styles.statusStrip}>
      <div><CheckCircle2/><span><b>3 capture modes</b><small>Voice · Text · Image</small></span></div>
      <div><BellRing/><span><b>Device alerts</b><small>{notificationStatus}</small></span></div>
      <div><CalendarPlus/><span><b>Calendar-ready</b><small>One-tap Google Calendar handoff</small></span></div>
    </section>

    <section className={styles.captureGrid}>
      <div className={styles.captureCard}>
        <div className={styles.captureHead}><span><Sparkles/></span><div><p>QUICK CAPTURE</p><h2>What do you need to remember?</h2></div></div>
        <textarea value={raw} onChange={e => { setRaw(e.target.value); setSource('text') }} placeholder="Example: Remind me to attend the community event tomorrow at 7 pm" />
        <div className={styles.captureActions}>
          <button onClick={startVoice} className={listening ? styles.listening : ''}><Mic/>{listening ? 'Listening…' : 'Speak'}</button>
          <label><Camera/>Browse image<input type="file" accept="image/*" onChange={onImage}/></label>
          <label><ImageIcon/>Use camera<input type="file" accept="image/*" capture="environment" onChange={onImage}/></label>
          <button className={styles.analyse} onClick={analyse}><Sparkles/>Extract details</button>
        </div>
        {imagePreview && <div className={styles.previewWrap}><img src={imagePreview} alt="Selected reminder poster preview"/><div><FileImage/><span><b>{imageName}</b><small>Image attached to this capture</small></span></div></div>}
      </div>

      <div className={styles.confirmCard}>
        <div className={styles.confirmHead}><div><p>CONFIRM</p><h2>Reminder details</h2></div><span>Human approval</span></div>
        <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Reminder title"/></label>
        <div className={styles.two}><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e => setTime(e.target.value)}/></label></div>
        <label>Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Address, contact, what to carry, context…"/></label>
        <button className={styles.create} onClick={createReminder}><Plus/>Save reminder</button>
        {savedMessage && <div className={styles.saved}><CheckCircle2/>{savedMessage}</div>}
      </div>
    </section>

    <section className={styles.delivery}>
      <div><BellRing/><span><b>Ravi OS notification</b><small>Fires when the reminder is due while Ravi OS is active on this device.</small></span></div>
      <div><CalendarPlus/><span><b>Google Calendar</b><small>Add the reminder to Calendar for reliable phone alerts even when Ravi OS is closed.</small></span></div>
      <div><Mail/><span><b>Email delivery</b><small>Next server-side step after reminder persistence is moved to Supabase.</small></span></div>
    </section>

    <section className={styles.listCard}>
      <div className={styles.listHead}><div><p>UPCOMING</p><h2>Your reminders</h2></div><span>{upcoming.length} upcoming</span></div>
      {reminders.length === 0 ? <div className={styles.empty}><BellRing/><b>No reminders yet</b><span>Create one above. Voice is the fastest way to test it.</span></div> : <div className={styles.list}>
        {reminders.map(r => <article key={r.id}>
          <div className={styles.dateBox}><b>{new Date(`${r.date}T12:00:00`).toLocaleDateString('en-NZ',{day:'2-digit',month:'short'})}</b><span>{r.time}</span></div>
          <div className={styles.reminderText}><b>{r.title}</b><small>{r.notes || `Captured by ${r.source}`}</small><span>{r.source === 'voice' ? 'Voice' : r.source === 'image' ? 'Image/poster' : 'Text'} capture</span></div>
          <div className={styles.rowActions}><a href={calendarUrl(r)} target="_blank" rel="noreferrer"><CalendarPlus/>Calendar</a><button aria-label="Delete reminder" onClick={() => setReminders(prev => prev.filter(x => x.id !== r.id))}><Trash2/></button></div>
        </article>)}
      </div>}
    </section>
  </main>
}
