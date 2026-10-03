'use client';
import { useState, useEffect, useRef } from 'react';

interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  completed?: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [completedReminders, setCompletedReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [working, setWorking] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = reminders.filter(r => !r.completed);
    const done = reminders.filter(r => r.completed);
    
    const todayList = active.filter(r => r.date === today).sort((a, b) => a.time.localeCompare(b.time));
    const upcomingList = active.filter(r => r.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    
    setTodayReminders(todayList);
    setUpcomingReminders(upcomingList);
    setCompletedReminders(done);
  }, [reminders]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/reminders');
      if (r.ok) {
        const data = await r.json();
        setReminders(data.reminders || []);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete(id: string) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    try {
      await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !reminder.completed }),
      });
      await load();
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  }

  async function extractFromPoster(file: File) {
    setExtracting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (!base64) return;

        try {
          const r = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'extract_poster', poster: base64 }),
          });
          if (r.ok) {
            const data = await r.json();
            setTitle(data.title || '');
            setDate(data.date || '');
            setTime(data.time || '');
            setVenue(data.location || '');
          }
        } catch (err) {
          console.error('Extraction failed:', err);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    if (!title.trim() || !date || !time) return;
    setWorking(true);
    try {
      const r = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), notes: venue.trim(), date, time, dueAt: `${date}T${time}:00Z`, source: 'text' }),
      });
      if (r.ok) {
        await load();
        reset();
        setFormOpen(false);
      }
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setWorking(false);
    }
  }

  async function deleteReminder(id: string) {
    if (!confirm('Delete?')) return;
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  function reset() {
    setTitle('');
    setDate('');
    setTime('');
    setVenue('');
  }

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const readableTime = (date: string, time: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let prefix = '';
    if (daysDiff === 0) prefix = 'Today at';
    else if (daysDiff === 1) prefix = 'Tomorrow at';
    else if (daysDiff > 1) prefix = `in ${daysDiff} days at`;
    else prefix = 'Overdue';
    
    return `${prefix} ${formatTime(time)}`;
  };

  const urgencyColor = (date: string, time: string) => {
    const target = new Date(`${date}T${time}:00`);
    const now = new Date();
    const hours = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hours < 0) return '#dc2626';
    if (hours < 24) return '#ea580c';
    if (hours < 72) return '#eab308';
    return '#10b981';
  };

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', paddingBottom: '80px' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        
        .reminder { animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; transition: all 0.3s ease; }
        .reminder:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        .reminder.completed { opacity: 0.6; background: #f3f4f6 !important; }
      `}</style>

      <div style={{ background: 'white', padding: '24px 20px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reminders</div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 0', color: '#111' }}>What's coming up?</h1>
          </div>
          <button onClick={() => setFormOpen(true)} style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontSize: '24px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = '#059669')} onMouseLeave={e => (e.currentTarget.style.background = '#10b981')}>+</button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {loading && <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999', animation: 'fadeIn 0.3s ease' }}>Loading reminders...</div>}

        {!loading && (
          <>
            {todayReminders.length > 0 && (
              <div style={{ marginBottom: '32px', animation: 'scaleIn 0.4s ease' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>📅 Today</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {todayReminders.map((r, i) => (
                    <div key={r.id} className={`reminder ${r.completed ? 'completed' : ''}`} style={{ background: 'white', padding: '16px', borderRadius: '12px', borderLeft: `5px solid ${urgencyColor(r.date, r.time)}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start', animationDelay: `${i * 0.08}s` }}>
                      <button onClick={() => toggleComplete(r.id)} style={{ minWidth: '28px', width: '28px', height: '28px', borderRadius: '6px', border: `2px solid ${urgencyColor(r.date, r.time)}`, background: r.completed ? urgencyColor(r.date, r.time) : 'white', color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (!r.completed) { e.currentTarget.style.background = urgencyColor(r.date, r.time); e.currentTarget.style.color = 'white'; } }} onMouseLeave={e => { if (!r.completed) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'inherit'; } }}>{r.completed ? '✓' : ''}</button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '4px', textDecoration: r.completed ? 'line-through' : 'none' }}>{r.title}</div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>{readableTime(r.date, r.time)}{r.notes && ` • ${r.notes}`}</div>
                      </div>
                      <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', color: '#ccc', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', transition: 'color 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.color = '#999')} onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingReminders.length > 0 && (
              <div style={{ animation: 'scaleIn 0.4s ease 0.1s both' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>🗓️ Next {upcomingReminders.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {upcomingReminders.map((r, i) => (
                    <div key={r.id} className={`reminder ${r.completed ? 'completed' : ''}`} style={{ background: 'white', padding: '14px 16px', borderRadius: '10px', borderLeft: `4px solid ${urgencyColor(r.date, r.time)}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animationDelay: `${i * 0.05}s` }}>
                      <button onClick={() => toggleComplete(r.id)} style={{ minWidth: '24px', width: '24px', height: '24px', borderRadius: '5px', border: `2px solid ${urgencyColor(r.date, r.time)}`, background: r.completed ? urgencyColor(r.date, r.time) : 'white', color: 'white', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', flexShrink: 0 }}>{r.completed ? '✓' : ''}</button>
                      <div style={{ flex: 1, marginLeft: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '2px', textDecoration: r.completed ? 'line-through' : 'none' }}>{r.title}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{readableTime(r.date, r.time)}</div>
                      </div>
                      <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', color: '#e5e7eb', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px', transition: 'color 0.2s ease', flexShrink: 0 }} onMouseEnter={e => (e.currentTarget.style.color = '#d1d5db')} onMouseLeave={e => (e.currentTarget.style.color = '#e5e7eb')}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedReminders.length > 0 && (
              <div style={{ marginTop: '32px', animation: 'scaleIn 0.4s ease' }}>
                <button onClick={() => setShowCompleted(!showCompleted)} style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>✓ {completedReminders.length} Done {showCompleted ? '−' : '+'}</button>
                {showCompleted && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {completedReminders.map((r) => (
                      <div key={r.id} style={{ background: '#f3f4f6', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginBottom: '2px', textDecoration: 'line-through' }}>{r.title}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{readableTime(r.date, r.time)}</div>
                        </div>
                        <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', color: '#d1d5db', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '4px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {todayReminders.length === 0 && upcomingReminders.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✨</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>All clear!</div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>You have no upcoming reminders</div>
              </div>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', zIndex: 1000, animation: 'fadeIn 0.2s ease' }} onClick={() => !working && !extracting && setFormOpen(false)}>
          <div style={{ background: 'white', width: '100%', borderRadius: '20px 20px 0 0', padding: '24px', maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#111' }}>Add reminder</h2>

            <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '12px' }}>📸 Quick add from poster</div>
              <button onClick={() => fileInputRef.current?.click()} disabled={extracting || working} style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid #86efac', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#166534', cursor: extracting || working ? 'not-allowed' : 'pointer', opacity: extracting || working ? 0.6 : 1 }}>{extracting ? '🔍 Extracting...' : '📷 Choose poster'}</button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && extractFromPoster(e.target.files[0])} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>What do you need to remember?</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Reminder title" style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }} /></div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Details (optional)</label>
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Location, description..." style={{ width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setFormOpen(false)} style={{ padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={working || !title.trim() || !date || !time} style={{ padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer', opacity: working ? 0.6 : 1 }}>{working ? 'Saving...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
