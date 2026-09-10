'use client'

import { FormEvent, useEffect, useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

export default function LockGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!response.ok) {
        setError('Incorrect PIN. Please try again.')
        setPin('')
        return
      }
      setAuthenticated(true)
      setPin('')
    } catch {
      setError('Unable to unlock Ravi OS right now.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return <main className="lockShell"><div className="lockLoading"><div className="lockMark">RG</div><span>Securing Ravi OS…</span></div></main>
  }

  if (!authenticated) {
    return <main className="lockShell">
      <section className="lockCard">
        <div className="lockMark">RG</div>
        <p className="eyebrow">PRIVATE PERSONAL SYSTEM</p>
        <h1>Welcome to Ravi OS</h1>
        <p className="lockIntro">Enter your PIN to open your personal command centre.</p>
        <form onSubmit={submit} className="lockForm">
          <label htmlFor="pin"><LockKeyhole size={15}/> Access PIN</label>
          <input id="pin" autoFocus inputMode="numeric" type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="Enter PIN" autoComplete="current-password" />
          {error && <p className="lockError">{error}</p>}
          <button disabled={!pin || submitting}>{submitting ? 'Unlocking…' : 'Unlock Ravi OS'}</button>
        </form>
        <div className="lockPrivacy"><ShieldCheck size={15}/><span>Private by design · Search indexing disabled</span></div>
      </section>
    </main>
  }

  return <>{children}</>
}
