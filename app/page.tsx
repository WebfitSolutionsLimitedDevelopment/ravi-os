'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, CheckCircle2, Clock3, HeartPulse, IndianRupee, MapPin, Mic, Plus, ShieldCheck, Sun, WalletCards } from 'lucide-react'

const nzFmt = (d: Date) => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short' }).format(d)
const inFmt = (d: Date) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit', month: 'short' }).format(d)
function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', hour: '2-digit', hourCycle: 'h23' }).format(d))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Page() {
  const [now, setNow] = useState(new Date())
  const [loc, setLoc] = useState('Location not enabled')
  const [capture, setCapture] = useState('')
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i) }, [])
  const hello = useMemo(() => greeting(now), [now])
  const enableLocation = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(() => setLoc('Auckland · Live location enabled'), () => setLoc('Location permission denied'))
    : setLoc('Location unavailable')

  return <main className="shell">
    <aside className="side">
      <div className="brand"><div className="logo">RG</div><div><b>Ravi OS</b><span>Private System</span></div></div>
      {['Today','Tasks','Calendar','Projects','Family','Journal','Health','Finance'].map((x,i)=><button className={i===0?'nav active':'nav'} key={x}>{x}</button>)}
      <div className="secure"><ShieldCheck size={16}/><span>Private workspace<br/><small>RLS + encrypted vault ready</small></span></div>
    </aside>
    <section className="main">
      <header><div><p className="eyebrow">PERSONAL COMMAND CENTRE</p><h1>{hello}, Ravi.</h1><p className="sub">Here is what needs your attention right now.</p></div><button className="bell"><Bell size={18}/></button></header>
      <div className="clocks">
        <div><Clock3/><span><b>Auckland</b>{nzFmt(now)}</span></div>
        <div><IndianRupee/><span><b>India</b>{inFmt(now)}</span></div>
        <button onClick={enableLocation}><MapPin size={16}/>{loc}</button>
      </div>
      <section className="attention">
        <div className="section-title"><span>Needs attention</span><b>2</b></div>
        <article><div className="dot red"/><div><b>Insurance premium</b><span>Due tomorrow · Finance</span></div><strong>High</strong></article>
        <article><div className="dot amber"/><div><b>House contractor follow-up</b><span>Waiting 3 days · India house</span></div><strong>Follow up</strong></article>
      </section>
      <div className="grid">
        <Card title="Next" icon={<CalendarDays/>}><b>08:30 AM</b><span>Daily planning · 30 min</span><small>Upcoming</small></Card>
        <Card title="Health" icon={<HeartPulse/>}><div className="stats"><Stat n="6h 18m" l="Sleep"/><Stat n="8,214" l="Steps"/><Stat n="91g" l="Protein"/></div><small>Today: Vegetarian</small></Card>
        <Card title="Money" icon={<WalletCards/>}><b>No bills due today</b><span>Next payment · 14 Sep</span><small>NZD base · INR tracked</small></Card>
        <Card title="Today" icon={<CheckCircle2/>}><div className="stats"><Stat n="7" l="Tasks"/><Stat n="3" l="Meetings"/><Stat n="2" l="Waiting"/></div><small>3 priority items</small></Card>
      </div>
      <section className="capture">
        <div><Sun/><span><b>Ask Ravi OS</b><small>Type, speak or add a screenshot. AI actions will require confirmation.</small></span></div>
        <div className="capturebar"><input value={capture} onChange={e=>setCapture(e.target.value)} placeholder="e.g. Pay LIC premium ₹28,500 by 20 September"/><button title="Voice"><Mic size={18}/></button><button className="add" onClick={()=>setCapture('')}><Plus size={18}/><span>Add</span></button></div>
      </section>
    </section>
    <nav className="mobile"><button>Today</button><button>Tasks</button><button className="round"><Plus/></button><button>Health</button><button>More</button></nav>
  </main>
}

function Card({title, icon, children}:{title:string; icon:React.ReactNode; children:React.ReactNode}) { return <article className="card"><div className="cardhead"><span>{title}</span>{icon}</div>{children}</article> }
function Stat({n,l}:{n:string;l:string}) { return <div><b>{n}</b><span>{l}</span></div> }
