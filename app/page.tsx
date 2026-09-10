'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, Command, HeartPulse, IndianRupee, Inbox, ListChecks, Mail, MapPin, Mic,
  Plus, Repeat2, Search, ShieldCheck, Sparkles, Target, Utensils, WalletCards, Watch, X
} from 'lucide-react'

type Task = { id: number; title: string; meta: string; priority: 'High' | 'Medium' | 'Low'; done: boolean }
type Capture = { id: number; text: string; created: string }

const initialTasks: Task[] = [
  { id: 1, title: 'Review India house contractor milestone', meta: 'India House · Personal', priority: 'High', done: false },
  { id: 2, title: 'Review Ravi OS Phase 3 deployment', meta: 'Ravi OS · Today', priority: 'Medium', done: false },
  { id: 3, title: 'Check important personal emails', meta: 'Inbox · Personal', priority: 'Medium', done: false },
  { id: 4, title: 'Review weekly personal commitments', meta: 'Planning · Weekly', priority: 'Low', done: false },
]

const waiting = [
  { title: 'House contractor update', age: '3 days', owner: 'India House' },
  { title: 'Personal follow-up', age: '1 day', owner: 'Personal' },
]

const recurring = [
  { title: 'Weekly personal review', when: 'Sunday evening' },
  { title: 'Monthly finance check', when: '1st of every month' },
  { title: 'Important document backup', when: 'Every 3 months' },
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
  const [active, setActive] = useState('Home')
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    const savedTasks = localStorage.getItem('ravi-os-tasks-v3')
    const savedCaptures = localStorage.getItem('ravi-os-captures-v3')
    if (savedTasks) setTasks(JSON.parse(savedTasks))
    if (savedCaptures) setCaptures(JSON.parse(savedCaptures))
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setCommandOpen(v => !v)
      }
    }
    window.addEventListener('keydown', keyHandler)
    return () => { clearInterval(timer); window.removeEventListener('keydown', keyHandler) }
  }, [])

  useEffect(() => { localStorage.setItem('ravi-os-tasks-v3', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('ravi-os-captures-v3', JSON.stringify(captures)) }, [captures])

  const hello = useMemo(() => greeting(now), [now])
  const weekday = useMemo(() => aucklandWeekday(now), [now])
  const diet = useMemo(() => dietFor(weekday), [weekday])
  const openTasks = tasks.filter(t => !t.done)
  const completed = tasks.length - openTasks.length

  const enableLocation = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(
        () => setLoc('Live location enabled · Auckland'),
        () => setLoc('Sandringham · Auckland')
      )
    : setLoc('Location unavailable')

  const addCapture = () => {
    const text = capture.trim()
    if (!text) return
    setCaptures(prev => [{ id: Date.now(), text, created: 'Just now' }, ...prev].slice(0, 6))
    setCapture('')
  }

  const toggleTask = (id: number) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const nav = [
    ['Home', <Command key="home"/>], ['Inbox', <Inbox key="inbox"/>], ['Tasks', <ListChecks key="tasks"/>],
    ['Calendar', <CalendarDays key="calendar"/>], ['Projects', <Target key="projects"/>], ['Health', <HeartPulse key="health"/>],
    ['Finance', <WalletCards key="finance"/>], ['Journal', <Sparkles key="journal"/>]
  ] as const

  return <main className="osShell">
    <aside className="osSidebar">
      <div className="osBrand"><div className="osMark">RG</div><div><b>Ravi OS</b><span>Private command system</span></div></div>
      <nav className="osNav">{nav.map(([label, icon]) => <button key={label} onClick={() => setActive(label)} className={active === label ? 'active' : ''}>{icon}<span>{label}</span></button>)}</nav>
      <div className="sidebarBottom">
        <button className="commandHint" onClick={() => setCommandOpen(true)}><Search/><span>Quick command</span><kbd>⌘K</kbd></button>
        <div className="privacyBadge"><ShieldCheck/><span><b>Private workspace</b><small>PIN protected · no indexing</small></span></div>
      </div>
    </aside>

    <section className="osContent">
      <div className="topbar">
        <div><p className="overline">RAVI OS · PHASE 3</p><h1>{hello}, Ravi.</h1><p className="lead">One view for what matters today, what is waiting, and what needs action.</p></div>
        <div className="topActions"><button className="topCommand" onClick={() => setCommandOpen(true)}><Search/>Search or command <kbd>⌘K</kbd></button><button className="iconButton"><Bell/><i>2</i></button></div>
      </div>

      <section className="contextRail">
        <div><Clock3/><span><b>Auckland</b><small>{nzFmt(now)}</small></span></div>
        <div><IndianRupee/><span><b>India</b><small>{inFmt(now)}</small></span></div>
        <button onClick={enableLocation}><MapPin/><span><b>Location</b><small>{loc}</small></span></button>
        <div className={diet.allowed ? 'dietAllowed' : 'dietVeg'}><Utensils/><span><b>{weekday}</b><small>{diet.label}</small></span></div>
      </section>

      <div className="heroGrid">
        <section className="focusCard">
          <div className="sectionHeader"><div><p className="overline">FOCUS</p><h2>Your attention queue</h2></div><span>{openTasks.filter(t => t.priority === 'High').length + waiting.length} signals</span></div>
          <div className="focusRows">
            <div className="focusRow critical"><i/><span><b>India house contractor milestone</b><small>High priority · review commitment and progress</small></span><em>Action</em></div>
            <div className="focusRow waiting"><i/><span><b>Contractor update still pending</b><small>Waiting for 3 days</small></span><em>Follow up</em></div>
            <div className="focusRow normal"><i/><span><b>Connect live Gmail + Calendar</b><small>Required for inbox and appointments inside Ravi OS</small></span><em>Phase 3</em></div>
          </div>
        </section>

        <section className="dayScore">
          <div className="scoreRing"><strong>{completed}/{tasks.length}</strong><span>tasks done</span></div>
          <div><p className="overline">TODAY</p><h2>{openTasks.length} actions remain</h2><p>Your personal operating rhythm is on track.</p></div>
        </section>
      </div>

      <div className="dashboardGrid">
        <section className="module inboxModule">
          <div className="moduleHead"><div><p className="overline">INBOX INTELLIGENCE</p><h2>Mailboxes</h2></div><Mail/></div>
          <div className="accountList">
            <div><span className="accountDot personal"/><span><b>Personal</b><small>ravi14feb@gmail.com</small></span><em>ChatGPT connected</em></div>
            <div><span className="accountDot media"/><span><b>Webfit News</b><small>webfitnews@gmail.com</small></span><em>ChatGPT connected</em></div>
            <div><span className="accountDot career"/><span><b>Career / Professional</b><small>Connect your professional mailbox</small></span><em>Pending</em></div>
          </div>
          <div className="integrationNote"><Sparkles/><span><b>Ravi OS runtime connection is next</b><small>Google OAuth will let the app classify mail into Action, Waiting, Career, Personal and FYI without mixing accounts.</small></span></div>
        </section>

        <section className="module calendarModule">
          <div className="moduleHead"><div><p className="overline">CALENDAR</p><h2>Appointments</h2></div><CalendarDays/></div>
          <div className="emptyIntegration"><div className="emptyIcon"><CalendarDays/></div><b>Live calendar not linked yet</b><p>Once Google OAuth is connected, today’s appointments and upcoming commitments will appear here automatically.</p><button>Connection planned</button></div>
        </section>

        <section className="module taskModule">
          <div className="moduleHead"><div><p className="overline">ACTION</p><h2>Today’s tasks</h2></div><span>{openTasks.length} open</span></div>
          <div className="taskList">{tasks.map(task => <button className={task.done ? 'taskRow done' : 'taskRow'} key={task.id} onClick={() => toggleTask(task.id)}>
            <span className="taskCheck">{task.done && <Check/>}</span><span><b>{task.title}</b><small>{task.meta}</small></span><em className={task.priority.toLowerCase()}>{task.priority}</em>
          </button>)}</div>
        </section>

        <section className="module waitingModule">
          <div className="moduleHead"><div><p className="overline">WAITING FOR</p><h2>Open loops</h2></div><Repeat2/></div>
          <div className="compactList">{waiting.map(item => <div key={item.title}><span><b>{item.title}</b><small>{item.owner}</small></span><em>{item.age}</em></div>)}</div>
        </section>

        <section className="module healthModule">
          <div className="moduleHead"><div><p className="overline">HEALTH</p><h2>Daily signals</h2></div><Activity/></div>
          <div className="metricGrid"><Metric label="Steps" value="—"/><Metric label="Sleep" value="—"/><Metric label="Protein" value="—"/></div>
          <div className="healthFooter"><Watch/><span><b>Apple Health bridge not connected</b><small>iPhone companion app planned for HealthKit sync.</small></span></div>
        </section>

        <section className="module foodModule">
          <div className="moduleHead"><div><p className="overline">FOOD RULE</p><h2>{diet.label}</h2></div><Utensils/></div>
          <p className="moduleText">{diet.detail}</p>
          <div className="weekStrip">{['M','T','W','T','F','S','S'].map((d, i) => <div key={i} className={[0,2,4].includes(i) ? 'allowed' : ''}><b>{d}</b><span>{[0,2,4].includes(i) ? 'NV' : 'V'}</span></div>)}</div>
        </section>

        <section className="module moneyModule">
          <div className="moduleHead"><div><p className="overline">MONEY</p><h2>Finance watch</h2></div><CircleDollarSign/></div>
          <div className="moneyState"><strong>No bill due today</strong><span>Base currency NZD · original INR values preserved</span></div>
          <div className="financeMini"><div><b>Next</b><span>14 Sep</span></div><div><b>Vault</b><span>Planned</span></div><div><b>Alerts</b><span>Ready next</span></div></div>
        </section>

        <section className="module recurringModule">
          <div className="moduleHead"><div><p className="overline">ROUTINES</p><h2>Recurring obligations</h2></div><Repeat2/></div>
          <div className="compactList">{recurring.map(item => <div key={item.title}><span><b>{item.title}</b><small>{item.when}</small></span><ChevronRight/></div>)}</div>
        </section>
      </div>

      <section className="captureDock">
        <div className="captureLead"><div className="aiOrb"><Sparkles/></div><span><b>Tell Ravi OS anything</b><small>Task, reminder, expense, thought, appointment or follow-up. AI classification will sit behind human confirmation.</small></span></div>
        <div className="captureInput"><input value={capture} onChange={e => setCapture(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCapture()} placeholder="Try: remind me to call the contractor tomorrow at 7 PM"/><button className="mic"><Mic/></button><button className="addCapture" onClick={addCapture}><Plus/>Add</button></div>
        {captures.length > 0 && <div className="captureItems">{captures.map(item => <div key={item.id}><Sparkles/><span><b>{item.text}</b><small>{item.created} · saved on this device</small></span><button onClick={() => setCaptures(prev => prev.filter(x => x.id !== item.id))}><X/></button></div>)}</div>}
      </section>
    </section>

    <nav className="mobileNav">
      <button className={active === 'Home' ? 'active' : ''} onClick={() => setActive('Home')}><Command/><span>Home</span></button>
      <button className={active === 'Inbox' ? 'active' : ''} onClick={() => setActive('Inbox')}><Inbox/><span>Inbox</span></button>
      <button className="mobileAdd" onClick={() => document.querySelector<HTMLInputElement>('.captureInput input')?.focus()}><Plus/></button>
      <button className={active === 'Tasks' ? 'active' : ''} onClick={() => setActive('Tasks')}><ListChecks/><span>Tasks</span></button>
      <button className={active === 'Calendar' ? 'active' : ''} onClick={() => setActive('Calendar')}><CalendarDays/><span>Calendar</span></button>
    </nav>

    {commandOpen && <div className="commandOverlay" onClick={() => setCommandOpen(false)}><div className="commandPanel" onClick={e => e.stopPropagation()}><div className="commandSearch"><Search/><input autoFocus placeholder="Search Ravi OS or type a command…"/><kbd>ESC</kbd></div><div className="commandOptions"><p>QUICK ACTIONS</p>{['Capture a task','Add a reminder','Open inbox','Open calendar','Review finance'].map((x,i) => <button key={x}><span>{i === 0 ? <Plus/> : i === 1 ? <Clock3/> : i === 2 ? <Inbox/> : i === 3 ? <CalendarDays/> : <WalletCards/>}{x}</span><ChevronRight/></button>)}</div></div></div>}
  </main>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>
}
