'use client';
import { useState, useEffect } from 'react';

interface Reminder {
  id: string;
  title: string;
  date?: string;
  time?: string;
  event_date?: string;
  event_time?: string;
  notes?: string;
  completed?: boolean;
  completed_at?: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/reminders');
      const data = await res.json();
      console.log('API response:', data);
      
      // Handle both { reminders: [...] } and direct array
      const list = Array.isArray(data) ? data : (data.reminders || []);
      setReminders(list);
      setError('');
    } catch (e) {
      console.error('Load error:', e);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }

  async function toggleDone(id: string) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    try {
      const newCompleted = reminder.completed_at ? null : new Date().toISOString();
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: newCompleted }),
      });
      
      if (res.ok) {
        await load();
      }
    } catch (e) {
      console.error('Toggle error:', e);
    }
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        {error}
        <button onClick={load} style={{ marginLeft: '10px', padding: '5px 10px' }}>Retry</button>
      </div>
    );
  }

  const getDate = (r: Reminder) => r.event_date || r.date || '';
  const getTime = (r: Reminder) => r.event_time || r.time || '';

  const active = reminders.filter(r => !r.completed_at);
  const done = reminders.filter(r => r.completed_at);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Reminders</h1>

      {active.length === 0 && done.length === 0 ? (
        <p style={{ color: '#999' }}>No reminders</p>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>Active ({active.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {active.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      backgroundColor: '#fff',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!r.completed_at}
                      onChange={() => toggleDone(r.id)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{r.title}</div>
                      {(getDate(r) || getTime(r)) && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                          {getDate(r)} {getTime(r) && `at ${getTime(r)}`}
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                          {r.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 style={{ fontSize: '14px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>Done ({done.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {done.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'start',
                      backgroundColor: '#f5f5f5',
                      opacity: 0.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!r.completed_at}
                      onChange={() => toggleDone(r.id)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', textDecoration: 'line-through' }}>
                        {r.title}
                      </div>
                      {(getDate(r) || getTime(r)) && (
                        <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                          {getDate(r)} {getTime(r) && `at ${getTime(r)}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
