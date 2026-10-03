'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Reminder {
  id: string;
  title: string;
  event_date?: string;
  event_time?: string;
  date?: string;
  time?: string;
  notes: string;
  completed_at?: string;
}

export default function ReminderDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/reminders');
      if (r.ok) {
        const data = await r.json();
        const reminders = data.reminders || data || [];
        const found = reminders.find((rm: Reminder) => rm.id === params.id);
        setReminder(found);
      }
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete() {
    if (!reminder) return;
    setWorking(true);
    try {
      const completed_at = reminder.completed_at ? null : new Date().toISOString();
      await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at }),
      });
      await load();
    } catch (e) {
      console.error('Toggle failed:', e);
    } finally {
      setWorking(false);
    }
  }

  async function deleteReminder() {
    if (!confirm('Delete this reminder?')) return;
    setWorking(true);
    try {
      await fetch(`/api/reminders/${reminder?.id}`, { method: 'DELETE' });
      router.push('/reminders');
    } catch (e) {
      console.error('Delete failed:', e);
      setWorking(false);
    }
  }

  const getDate = () => reminder?.event_date || reminder?.date || '';
  const getTime = () => reminder?.event_time || reminder?.time || '';

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '16px', color: '#999' }}>Loading...</div>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '16px', color: '#999' }}>Reminder not found</div>
        <button onClick={() => router.push('/reminders')} style={{ padding: '10px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Back to reminders</button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', paddingBottom: '40px' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .container { animation: slideUp 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/reminders')} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>‹</button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>Reminder details</div>
        <button onClick={deleteReminder} disabled={working} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '8px', opacity: working ? 0.5 : 1 }}>🗑</button>
      </div>

      {/* Poster */}
      <div style={{ width: '100%', aspectRatio: '16/10', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <img
          src={`/api/reminders/${reminder.id}/poster`}
          alt={reminder.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '24px 20px' }} className="container">
        {/* Title */}
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: '0 0 16px', textDecoration: reminder.completed_at ? 'line-through' : 'none' }}>
          {reminder.title}
        </h1>

        {/* Date & Time */}
        <div style={{ padding: '16px', background: 'white', borderRadius: '12px', marginBottom: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>When</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111' }}>
            {formatDate(getDate())} at {formatTime(getTime())}
          </div>
        </div>

        {/* Notes/Venue */}
        {reminder.notes && (
          <div style={{ padding: '16px', background: 'white', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>Details</div>
            <div style={{ fontSize: '16px', color: '#374151', lineHeight: '1.6' }}>{reminder.notes}</div>
          </div>
        )}

        {/* Status */}
        <div style={{ padding: '16px', background: reminder.completed_at ? '#f0fdf4' : '#fef3c7', borderRadius: '12px', marginBottom: '24px', borderLeft: `4px solid ${reminder.completed_at ? '#10b981' : '#ea580c'}` }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: reminder.completed_at ? '#166534' : '#92400e' }}>
            {reminder.completed_at ? '✓ Done' : '⏱ Active'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button onClick={() => router.push('/reminders')} style={{ padding: '16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')} onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}>Back</button>
          <button onClick={toggleComplete} disabled={working} style={{ padding: '16px', background: reminder.completed_at ? '#f3f4f6' : '#10b981', color: reminder.completed_at ? '#111' : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: working ? 0.6 : 1, transition: 'all 0.2s ease' }}>
            {working ? 'Loading...' : reminder.completed_at ? 'Mark undone' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>
  );
}
