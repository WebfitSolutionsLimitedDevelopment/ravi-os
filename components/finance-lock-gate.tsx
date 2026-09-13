'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CircleDollarSign, LockKeyhole, ShieldCheck } from 'lucide-react'
import styles from './lock-gate.module.css'

// A second PIN gate in front of Finance specifically — separate from the
// PIN that unlocks the rest of Ravi OS. This is where net worth, credit
// card balances and both countries' accounts live, so it stays behind
// its own lock even once the app itself is open.
export default function FinanceLockGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/finance-auth', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const response = await fetch('/api/finance-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      if (!response.ok) { setError('Wrong PIN. Try again.'); setPin(''); return }
      setAuthenticated(true); setPin('')
    } catch { setError('Unable to unlock Finance right now.') } finally { setSubmitting(false) }
  }

  if (checking) return <main className={styles.shell}><div className={styles.loading}><CircleDollarSign size={22} /><span>Securing Finance…</span></div></main>
  if (!authenticated) return <main className={styles.shell}>
    <section className={styles.card}>
      <div className={styles.profilePhoto} style={{ display: 'grid', placeItems: 'center', background: '#173d2f', color: '#fff' }}><CircleDollarSign size={32} /></div>
      <p className={styles.eyebrow}>PRIVATE · FINANCE ONLY</p><h1>Enter your Finance PIN.</h1>
      <p className={styles.intro}>This section holds net worth, credit cards and both countries' accounts, so it needs its own PIN even though Ravi OS is already unlocked.</p>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="finance-pin"><LockKeyhole size={15} /> Finance PIN</label>
        <input id="finance-pin" autoFocus inputMode="numeric" type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Enter PIN" autoComplete="off" />
        {error && <p className={styles.error}>{error}</p>}<button disabled={!pin || submitting}>{submitting ? 'Unlocking…' : 'Unlock Finance'}</button>
      </form>
      <div className={styles.privacy}><ShieldCheck size={15} /><span>Locks again after 30 minutes of inactivity</span></div>
    </section>
  </main>
  return <>{children}</>
}
