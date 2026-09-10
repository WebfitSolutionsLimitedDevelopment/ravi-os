'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Building2, CalendarClock, CheckCircle2, CircleDollarSign, FileCheck2,
  HardHat, IndianRupee, Mail, MessageCircle, NotebookPen, Phone, Plus, ReceiptIndianRupee,
  ShieldCheck, UserRound, WalletCards
} from 'lucide-react'
import styles from './construction.module.css'

type Reminder = { id:number; text:string; done:boolean }
type Note = { id:number; text:string; created:string }

const CONTRACT_TOTAL = 1200000
const INITIAL_PAID = 0

export default function ConstructionPage() {
  const [paid, setPaid] = useState(INITIAL_PAID)
  const [reminders, setReminders] = useState<Reminder[]>([
    { id:1, text:'Confirm written scope, material specifications and completion date', done:false },
    { id:2, text:'Collect contractor ID, address and signed agreement', done:false },
    { id:3, text:'Record every payment against a milestone', done:false },
  ])
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    const p = localStorage.getItem('ravi-os-construction-paid')
    const r = localStorage.getItem('ravi-os-construction-reminders')
    const n = localStorage.getItem('ravi-os-construction-notes')
    if (p) setPaid(Number(p) || 0)
    if (r) setReminders(JSON.parse(r))
    if (n) setNotes(JSON.parse(n))
  }, [])

  useEffect(() => localStorage.setItem('ravi-os-construction-paid', String(paid)), [paid])
  useEffect(() => localStorage.setItem('ravi-os-construction-reminders', JSON.stringify(reminders)), [reminders])
  useEffect(() => localStorage.setItem('ravi-os-construction-notes', JSON.stringify(notes)), [notes])

  const remaining = Math.max(CONTRACT_TOTAL - paid, 0)
  const paidPct = useMemo(() => Math.min(Math.round((paid / CONTRACT_TOTAL) * 100), 100), [paid])

  function addNote() {
    const text = note.trim(); if (!text) return
    setNotes(prev => [{ id:Date.now(), text, created:'Just now' }, ...prev])
    setNote('')
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.leftHead}>
        <Link href="/" className={styles.back}><ArrowLeft/> Ravi OS</Link>
        <div className={styles.titleBlock}><span className={styles.icon}><HardHat/></span><span><p>CONSTRUCTION WORKSPACE</p><h1>Kaptanganj House</h1><small>Personal property · Kushinagar, Uttar Pradesh, India</small></span></div>
      </div>
      <span className={styles.private}><ShieldCheck/> Private</span>
    </header>

    <section className={styles.summary}>
      <div><span className={styles.metricIcon}><CircleDollarSign/></span><span><small>Contract value</small><strong>₹12,00,000</strong><em>Materials + construction</em></span></div>
      <div><span className={styles.metricIcon}><WalletCards/></span><span><small>Paid</small><strong>₹{paid.toLocaleString('en-IN')}</strong><em>{paidPct}% of contract</em></span></div>
      <div><span className={styles.metricIcon}><ReceiptIndianRupee/></span><span><small>Remaining</small><strong>₹{remaining.toLocaleString('en-IN')}</strong><em>Track before every payment</em></span></div>
      <div><span className={styles.metricIcon}><CalendarClock/></span><span><small>Target</small><strong>2–3 months</strong><em>Handover commitment</em></span></div>
    </section>

    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.contractor}`}>
        <div className={styles.cardHead}><div><p>CONTRACTOR</p><h2>Primary contact</h2></div><UserRound/></div>
        <div className={styles.person}><span className={styles.avatar}>C</span><span><b>Contractor details</b><small>Add verified name, mobile, email and address when agreement is finalised.</small></span></div>
        <div className={styles.actions}><button><Phone/> Call</button><button><MessageCircle/> WhatsApp</button><button><Mail/> Email</button></div>
        <div className={styles.info}><ShieldCheck/><span><b>Before next payment</b><small>Verify identity, written scope, GST/tax status if applicable, material brands, milestones, defects responsibility and handover date.</small></span></div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p>PAYMENTS</p><h2>Payment tracker</h2></div><IndianRupee/></div>
        <div className={styles.progress}><div style={{width:`${paidPct}%`}}/></div>
        <div className={styles.paymentNumbers}><span><b>{paidPct}%</b><small>paid</small></span><span><b>₹{remaining.toLocaleString('en-IN')}</b><small>remaining</small></span></div>
        <label className={styles.paymentInput}><span>Total paid so far</span><div><span>₹</span><input type="number" min="0" max={CONTRACT_TOTAL} value={paid} onChange={e=>setPaid(Math.max(0,Math.min(Number(e.target.value)||0,CONTRACT_TOTAL)))}/></div></label>
        <small className={styles.helper}>Temporary device storage. Supabase ledger comes in the data phase.</small>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p>PROGRESS</p><h2>Construction milestones</h2></div><Building2/></div>
        <div className={styles.milestones}>
          <div className={styles.current}><span>01</span><div><b>Agreement & mobilisation</b><small>Scope, timeline, labour and material commitments</small></div><em>Current</em></div>
          <div><span>02</span><div><b>Structure & civil work</b><small>Track work against agreed drawings and quality</small></div><em>Planned</em></div>
          <div><span>03</span><div><b>Electrical, plumbing & finishes</b><small>Record brands, quantities and defects</small></div><em>Planned</em></div>
          <div><span>04</span><div><b>Inspection & handover</b><small>Snag list, completion proof and final payment</small></div><em>Planned</em></div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p>DOCUMENTS</p><h2>Required records</h2></div><FileCheck2/></div>
        <div className={styles.docs}>
          {['Signed construction agreement','Detailed scope of work','Material specification / brands','Milestone payment schedule','Contractor identity & address','Completion / handover commitment','Warranty / defect responsibility','Payment receipts'].map((x,i)=><div key={x}><CheckCircle2/><span>{x}</span><em>{i<1?'Priority':'Required'}</em></div>)}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p>REMINDERS</p><h2>Things to take care of</h2></div><CalendarClock/></div>
        <div className={styles.reminders}>{reminders.map(r=><button key={r.id} className={r.done?styles.done:''} onClick={()=>setReminders(prev=>prev.map(x=>x.id===r.id?{...x,done:!x.done}:x))}><span className={styles.check}>{r.done&&<CheckCircle2/>}</span><span>{r.text}</span></button>)}</div>
        <button className={styles.secondary} onClick={()=>setReminders(prev=>[...prev,{id:Date.now(),text:'New construction reminder',done:false}])}><Plus/> Add reminder</button>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}><div><p>PRIVATE NOTES</p><h2>Notes to myself</h2></div><NotebookPen/></div>
        <div className={styles.noteBox}><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Ask contractor to send photos before releasing the next milestone payment."/><button onClick={addNote}><Plus/> Save note</button></div>
        <div className={styles.noteList}>{notes.length===0?<p>No notes yet.</p>:notes.map(n=><div key={n.id}><b>{n.text}</b><small>{n.created}</small></div>)}</div>
      </section>
    </div>
  </main>
}
