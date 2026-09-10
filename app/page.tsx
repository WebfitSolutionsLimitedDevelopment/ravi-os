'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bell, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, CreditCard,
  HeartPulse, IndianRupee, ListTodo, MapPin, Mic, Plus, Repeat2, ShieldCheck,
  Sparkles, Sun, Utensils, WalletCards, Watch, X
} from 'lucide-react'

type Task = { id: number; title: string; meta: string; priority: 'High' | 'Medium' | 'Low'; done: boolean }
type Capture = { id: number; text: string; created: string }

const initialTasks: Task[] = [
  { id: 1, title: 'Review India house contractor milestone', meta: 'Personal · India House', priority: 'High', done: false },
  { id: 2, title: 'Check Ravi OS Phase 2 on mobile', meta: 'Ravi OS · Today', priority: 'Medium', done: false },
  { id: 3, title: 'Review this week’s personal commitments', meta: 'Weekly review', priority: 'Low', done: false },
]

const waiting = [
  { title: 'House contractor update', age: 'Waiting 3 days', owner: 'India House' },
  { title: 'Personal follow-up', age: 'Waiting 1 day', owner: 'Personal' },
]

const recurring = [
  { title: 'Weekly personal review', when: 'Sunday evening' },
  { title: 'Monthly finance check', when: '1st of every month' },
  { title: 'Backup important documents', when: 'Every 3 months' },
]

const nzFmt = (d: Date) => new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short'
}).format(d)
const inFmt = (d: Date) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short'
}).format(d)

function aucklandWeekday(d: Date) {
  return new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'long' }).format(d)
}

function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', hourCycle: 'h23' }).format(d))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function dietFor(day: string) {
  const nonVegDays = ['Monday', 'Wednesday', 'Friday']
  return nonVegDays.includes(day)
    ? { allowed: true, label: 'Non-veg allowed', detail: 'Chicken, mutton and egg are allowed today.' }
    : { allowed: false, label: 'Vegetarian day', detail: 'No chicken, mutton or egg today.' }
}

export default function Page() {
  const [now, setNow] = useState(new Date())
  const [loc, setLoc] = useState('Sandringham · Auckland')
  const [capture, setCapture] = useState('')
  const [captures, setCaptures] = useState<Capture[]>([])
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [active, setActive] = useState('Today')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000)
    const savedTasks = localStorage.getItem('ravi-os-tasks')
    const savedCaptures = localStorage.getItem('ravi-os-captures')
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    if (savedCaptures) setCaptures(JSON.parse(savedCaptures))
    return () => clearInterval(i)
  }, [])

  useEffect(() => { localStorage.setItem('ravi-os-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('ravi-os-captures', JSON.stringify(captures)) }, [captures])

  const hello = useMemo(() => greeting(now), [now])
  const weekday = useMemo(() => aucklandWeekday(now), [now])
  const diet = useMemo(() => dietFor(weekday), [weekday])
  const openTasks = tasks.filter(t => !t.done)
  const completed = tasks.filter(t => t.done).length

  const enableLocation = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(
        () => setLoc('Live location enabled · Auckland'),
        () => setLoc('Sandringham · Auckland')
      )
    : setLoc('Location unavailable')

  const addCapture = () => {
    const text = capture.trim()
    if (!text) return
    setCaptures(prev => [{ id: Date.now(), text, created: 'Just now' }, ...prev].slice(0, 5))
    setCapture('')
  }

  const toggleTask = (id: number) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const nav = ['Today', 'Tasks', 'Calendar', 'Projects', 'Family', 'Journal', 'Health', 'Finance']

  return <main className="shell">
    <aside className="side">
      <div className="brand"><div className="logo">RG</div><div><b>Ravi OS</b><span>Private System</span></div></div>
      <div className="navgroup">{nav.map(x => <button onClick={() => setActive(x)} className={active === x ? 'nav active' : 'nav'} key={x}>{x}</button>)}</div>
      <div className="secure"><ShieldCheck size={16}/><span>Private workspace<br/><small>Personal data stays protected</small></span></div>
    </aside>

    <section className="main">
      <header>
        <div><p className="eyebrow">PERSONAL COMMAND CENTRE · PHASE 2</p><h1>{hello}, Ravi.</h1><p className="sub">Your day, commitments and personal signals in one place.</p></div>
        <button className="bell" aria-label="Notifications"><Bell size={18}/><i>2</i></button>
      </header>

      <div className="clocks">
        <div><Clock3/><span><b>Auckland</b>{nzFmt(now)}</span></div>
        <div><IndianRupee/><span><b>India</b>{inFmt(now)}</span></div>
        <button onClick={enableLocation}><MapPin size={16}/>{loc}</button>
      </div>

      <section className="statusStrip">
        <div className={diet.allowed ? 'status good' : 'status veg'}><Utensils/><span><b>{weekday}</b><small>{diet.label}</small></span></div>
        <div className="status"><ListTodo/><span><b>{openTasks.length} open tasks</b><small>{completed} completed</small></span></div>
        <div className="status"><Repeat2/><span><b>{waiting.length} waiting</b><small>Follow-ups tracked</small></span></div>
        <div className="status"><ShieldCheck/><span><b>Privacy first</b><small>PIN gate next</small></span></div>
      </section>

      <section className="attention">
        <div className="section-title"><span>Needs attention</span><b>{openTasks.filter(t => t.priority === 'High').length + 1}</b><button onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'View all'}</button></div>
        <article><div className="dot red"/><div><b>Review India house contractor milestone</b><span>Personal · India House</span></div><strong>High</strong></article>
        <article><div className="dot amber"/><div><b>House contractor update</b><span>Waiting 3 days · follow up required</span></div><strong>Waiting</strong></article>
        {showAll && <article><div className="dot greenDot"/><div><b>Ravi OS mobile check</b><span>Open the latest deployment on your phone</span></div><strong>Today</strong></article>}
      </section>

      <div className="grid">
        <Card title="Next" icon={<CalendarDays/>}>
          <b>08:30 AM</b><span>Daily planning · 30 min</span><div className="pill"><Clock3/> Upcoming</div>
        </Card>

        <Card title="Food today" icon={<Utensils/>}>
          <b>{diet.label}</b><span>{diet.detail}</span><div className={diet.allowed ? 'pill greenPill' : 'pill'}>{weekday} rule</div>
        </Card>

        <Card title="Health" icon={<HeartPulse/>}>
          <div className="stats"><Stat n="—" l="Steps"/><Stat n="—" l="Sleep"/><Stat n="—" l="Protein"/></div>
          <div className="healthConnect"><Watch size={15}/><span>Apple Health not connected yet</span></div>
        </Card>

        <Card title="Money" icon={<WalletCards/>}>
          <b>No bills due today</b><span>NZD base currency · INR preserved</span><div className="pill"><CreditCard/> Finance vault planned</div>
        </Card>
      </div>

      <div className="wideGrid">
        <section className="panel">
          <div className="panelHead"><div><p className="eyebrow">ACTION</p><h2>Today’s tasks</h2></div><span>{openTasks.length} remaining</span></div>
          <div className="taskList">{tasks.map(task => <button className={task.done ? 'task done' : 'task'} key={task.id} onClick={() => toggleTask(task.id)}>
            <span className="check">{task.done ? <Check size={15}/> : null}</span><span className="taskText"><b>{task.title}</b><small>{task.meta}</small></span><em className={'priority ' + task.priority.toLowerCase()}>{task.priority}</em>
          </button>)}</div>
        </section>

        <section className="panel">
          <div className="panelHead"><div><p className="eyebrow">FOLLOW-UP</p><h2>Waiting for</h2></div><span>{waiting.length} items</span></div>
          <div className="simpleList">{waiting.map(x => <div key={x.title}><span><b>{x.title}</b><small>{x.owner}</small></span><em>{x.age}</em></div>)}</div>
        </section>
      </div>

      <div className="wideGrid lower">
        <section className="panel">
          <div className="panelHead"><div><p className="eyebrow">ROUTINE</p><h2>Recurring obligations</h2></div><Repeat2/></div>
          <div className="simpleList">{recurring.map(x => <div key={x.title}><span><b>{x.title}</b><small>{x.when}</small></span><ChevronRight size={16}/></div>)}</div>
        </section>

        <section className="panel wellness">
          <div className="panelHead"><div><p className="eyebrow">WELLNESS</p><h2>This week’s food rhythm</h2></div><Utensils/></div>
          <div className="weekFood">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
            const allowed = [0,2,4].includes(i)
            return <div key={d} className={allowed ? 'day allowed' : 'day'}><b>{d}</b><span>{allowed ? 'Non-veg' : 'Veg'}</span></div>
          })}</div>
        </section>
      </div>

      <section className="capture">
        <div><Sparkles/><span><b>Capture anything</b><small>Type a thought, reminder, expense, task or note. AI classification comes next.</small></span></div>
        <div className="capturebar"><input value={capture} onChange={e => setCapture(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCapture()} placeholder="e.g. Remind me to call contractor tomorrow evening"/><button title="Voice capture coming next"><Mic size={18}/></button><button className="add" onClick={addCapture}><Plus size={18}/><span>Add</span></button></div>
        {captures.length > 0 && <div className="captureHistory">{captures.map(c => <div key={c.id}><CheckCircle2/><span><b>{c.text}</b><small>{c.created} · saved on this device</small></span><button onClick={() => setCaptures(prev => prev.filter(x => x.id !== c.id))}><X size={14}/></button></div>)}</div>}
      </section>
    </section>

    <nav className="mobile">
      <button onClick={() => setActive('Today')} className={active === 'Today' ? 'mobileActive' : ''}>Today</button>
      <button onClick={() => setActive('Tasks')} className={active === 'Tasks' ? 'mobileActive' : ''}>Tasks</button>
      <button className="round" onClick={() => document.querySelector<HTMLInputElement>('.capturebar input')?.focus()}><Plus/></button>
      <button onClick={() => setActive('Health')} className={active === 'Health' ? 'mobileActive' : ''}>Health</button>
      <button onClick={() => setActive('Finance')} className={active === 'Finance' ? 'mobileActive' : ''}>Money</button>
    </nav>
  </main>
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <article className="card"><div className="cardhead"><span>{title}</span>{icon}</div>{children}</article>
}
function Stat({ n, l }: { n: string; l: string }) {
  return <div><b>{n}</b><span>{l}</span></div>
}
