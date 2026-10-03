'use client';
import { useState, useEffect } from 'react';
import css from './reminders.module.css';

interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  source: string;
  isRecurring?: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayList = reminders.filter(r => r.date === today).sort((a, b) => a.time.localeCompare(b.time));
    const upcomingList = reminders.filter(r => r.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    setTodayReminders(todayList);
    setUpcomingReminders(upcomingList);
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
      console.error('Failed to load reminders:', e);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!title.trim() || !date || !time) return;
    setWorking(true);
    try {
      const body = {
        title: title.trim(),
        notes: venue.trim(),
        date,
        time,
        dueAt: `${date}T${time}:00Z`,
        source: 'text',
      };
      const r = await fetch(editing ? `/api/reminders/${editing}` : '/api/reminders', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
    if (!confirm('Delete this reminder?')) return;
    try {
      const r = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (r.ok) await load();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  function reset() {
    setTitle('');
    setDate('');
    setTime('');
    setVenue('');
    setEditing(null);
  }

  const timeUntil = (date: string, time: string) => {
    const target = new Date(`${date}T${time}:00`);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff < 0) return 'past';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'soon';
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date === today.toISOString().slice(0, 10)) return 'Today';
    if (date === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow';
    
    return d.toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className={css.page}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafaf9; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        
        .reminder-item {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .reminder-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        }
        
        .reminder-item:active {
          transform: translateY(0);
        }
        
        button {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          border: none;
          font-weight: 500;
          font-size: 14px;
        }
        
        button:hover:not(:disabled) {
          transform: scale(1.02);
        }
        
        button:active:not(:disabled) {
          transform: scale(0.98);
        }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        input, select {
          transition: all 0.2s ease;
          border: 1px solid #e5e5e5;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #173d2f;
          box-shadow: 0 0 0 3px rgba(23, 61, 47, 0.1);
        }
        
        .form-overlay {
          animation: fadeIn 0.2s ease-in;
        }
      `}</style>

      {/* Header */}
      <div className={css.header} style={{ animation: 'fadeIn 0.3s ease' }}>
        <h1>Reminders</h1>
        <button
          onClick={() => setFormOpen(true)}
          style={{
            background: '#173d2f',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + Add
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '24px', textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
          Loading reminders...
        </div>
      )}

      {!loading && (
        <>
          {/* Today Section */}
          {todayReminders.length > 0 && (
            <section style={{ padding: '0 16px 24px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#999',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                TODAY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayReminders.map((r, i) => (
                  <div
                    key={r.id}
                    className="reminder-item"
                    style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '12px',
                      borderLeft: '4px solid #E8A87C',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#173d2f', marginBottom: '4px' }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          {formatTime(r.time)}
                          {r.notes && ` • ${r.notes}`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#E8A87C', fontWeight: 500 }}>
                          {timeUntil(r.date, r.time)} remaining
                        </div>
                      </div>
                      <button
                        onClick={() => deleteReminder(r.id)}
                        style={{
                          background: 'none',
                          color: '#ccc',
                          padding: '4px',
                          fontSize: '16px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Section */}
          {upcomingReminders.length > 0 && (
            <section style={{ padding: '0 16px 24px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#999',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                UPCOMING ({upcomingReminders.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {upcomingReminders.map((r, i) => (
                  <div
                    key={r.id}
                    className="reminder-item"
                    style={{
                      background: 'white',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '2px' }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {formatDate(r.date)} at {formatTime(r.time)}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      style={{
                        background: 'none',
                        color: '#ccc',
                        padding: '4px',
                        fontSize: '14px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {todayReminders.length === 0 && upcomingReminders.length === 0 && (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#999',
              animation: 'fadeIn 0.4s ease',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <div style={{ fontSize: '14px' }}>No reminders yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Tap + Add to create one</div>
            </div>
          )}
        </>
      )}

      {/* Add Form Modal */}
      {formOpen && (
        <div
          className="form-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 1000,
          }}
          onClick={() => !working && setFormOpen(false)}
        >
          <div
            style={{
              background: 'white',
              width: '100%',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              maxHeight: '80vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What do you need to remember?"
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                  Date
                </label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                  Time
                </label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>
                Details (optional)
              </label>
              <input
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="Location, description, or notes"
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setFormOpen(false)}
                style={{
                  background: '#f0f0f0',
                  color: '#333',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={working || !title.trim() || !date || !time}
                style={{
                  background: '#173d2f',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                {working ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
