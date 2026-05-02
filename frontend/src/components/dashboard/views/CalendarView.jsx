import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

const TYPE_STYLE = {
  reel:  { bg: 'rgba(244,114,182,0.2)', color: '#F472B6', label: 'Reel' },
  post:  { bg: 'rgba(77,217,255,0.15)', color: '#4DD9FF', label: 'Post' },
  story: { bg: 'rgba(232,115,74,0.15)', color: '#E8734A', label: 'Story' },
  ad:    { bg: 'rgba(167,139,250,0.2)', color: '#A78BFA', label: 'Ad' },
};

function EventModal({ event, clients, onClose, onSave, isEdit }) {
  const [form, setForm] = useState(event || { client_id: clients[0]?.id || '', title: '', type: 'reel', date: '', status: 'scheduled' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  const handleSave = async () => {
    if (!form.client_id || !form.title || !form.date) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      logger.formSubmit('CalendarView', isEdit ? 'update_event' : 'create_event', {
        title: form.title,
        type: form.type,
        date: form.date,
      });
      if (isEdit) {
        await apiClient.put(`/calendar/${form.id}`, form);
        toast.success('Event updated successfully');
        logger.success('Event updated', { eventId: form.id });
      } else {
        await apiClient.post('/calendar', form);
        toast.success('Post added to calendar');
        logger.success('Event created', { title: form.title, date: form.date });
      }
      onSave();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to save event';
      toast.error(errorMsg);
      logger.error('Failed to save event', { isEdit, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D0E1A] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">{isEdit ? '✏️ Edit Post' : '📅 Add Post'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Reveal Reel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
                {Object.entries(TYPE_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Date</label>
              <input className={inputCls} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-2.5 rounded-xl hover:bg-white/[0.1] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold py-2.5 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] disabled:opacity-60 transition-all">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, clients, onClose, onEdit, onDelete }) {
  const clientName = clients.find(c => c.id === event.client_id)?.name || event.client_id;
  const ts = TYPE_STYLE[event.type] || TYPE_STYLE.post;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      logger.userAction('CalendarView', 'delete_event', { eventId: event.id, title: event.title });
      await apiClient.delete(`/calendar/${event.id}`);
      toast.success('Event deleted successfully');
      logger.success('Event deleted', { eventId: event.id });
      onDelete();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete event';
      toast.error(errorMsg);
      logger.error('Failed to delete event', { eventId: event.id, error: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D0E1A] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold px-2.5 py-1 rounded-full w-fit text-[10px]" style={{ background: ts.bg, color: ts.color }}>
              {ts.label.toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl">✕</button>
        </div>

        <h2 className="text-white font-bold text-lg mb-3">{event.title}</h2>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Client</span>
            <span className="text-white">{clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Date</span>
            <span className="text-white">{new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Status</span>
            <span className="text-white capitalize">{event.status}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-2.5 rounded-xl hover:bg-white/[0.1] transition-colors">Close</button>
          <button onClick={onEdit} className="flex-1 bg-blue-600/50 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Edit</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600/50 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [prefillDate, setPrefillDate] = useState('');

  const today = new Date();
  const [viewDate, setViewDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const isStaff = user?.role !== 'client';

  const load = () => {
    apiClient.get('/calendar', { params: { month: viewDate.month, year: viewDate.year } }).then((r) => {
      setEvents(r.data || []);
      logger.info('Calendar events loaded', { count: r.data?.length || 0, month: viewDate.month });
    }).catch((e) => logger.error('Failed to load calendar', { error: e.message }));
    if (isStaff) {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch((e) => logger.error('Failed to load clients', { error: e.message }));
    }
  };

  useEffect(() => { load(); }, [viewDate]);

  const daysInMonth = new Date(viewDate.year, viewDate.month, 0).getDate();
  const firstDay = new Date(viewDate.year, viewDate.month - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const eventsForDay = (day) => {
    const dateStr = `${viewDate.year}-${String(viewDate.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const monthName = new Date(viewDate.year, viewDate.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => setViewDate((v) => {
    const m = v.month === 1 ? 12 : v.month - 1;
    const y = v.month === 1 ? v.year - 1 : v.year;
    return { month: m, year: y };
  });

  const nextMonth = () => setViewDate((v) => {
    const m = v.month === 12 ? 1 : v.month + 1;
    const y = v.month === 12 ? v.year + 1 : v.year;
    return { month: m, year: y };
  });

  const isToday = (day) => {
    const d = new Date();
    return d.getDate() === day && d.getMonth() + 1 === viewDate.month && d.getFullYear() === viewDate.year;
  };

  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || '';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white font-extrabold text-2xl">Content Calendar</h1>
          <p className="text-white/40 text-sm mt-1">{monthName} · Plan and track all content</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl transition-colors">← Prev</button>
          <button onClick={nextMonth} className="bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white text-sm px-3 py-2 rounded-xl transition-colors">Next →</button>
          {isStaff && (
            <button onClick={() => { setPrefillDate(''); setModal({ create: true }); }}
              className="bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold px-4 py-2 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] hover:-translate-y-0.5 transition-all">
              + Add Post
            </button>
          )}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="text-center text-white/20 text-[10px] uppercase tracking-widest py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = eventsForDay(day);
            const today_ = isToday(day);
            const dateStr = `${viewDate.year}-${String(viewDate.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            return (
              <div
                key={day}
                onClick={() => { if (isStaff) { setPrefillDate(dateStr); setModal({ create: true }); } }}
                className={`min-h-[70px] sm:min-h-[80px] rounded-xl p-1.5 border transition-all ${isStaff ? 'cursor-pointer' : ''} ${
                  today_
                    ? 'border-[#E8734A]/40 bg-[#E8734A]/[0.06]'
                    : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${today_ ? 'text-[#E8734A]' : 'text-white/30'}`}>{day}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev) => {
                    const ts = TYPE_STYLE[ev.type] || TYPE_STYLE.post;
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setDetailModal(ev); }}
                        className="text-[9px] px-1 py-0.5 rounded truncate leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: ts.bg, color: ts.color }}
                        title={`${ev.title} — ${clientName(ev.client_id)}`}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-white/30 px-1">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {Object.entries(TYPE_STYLE).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-white/40">
            <span className="w-2 h-2 rounded-sm" style={{ background: v.color }} />
            {v.label}
          </div>
        ))}
      </div>

      {modal && isStaff && (
        <EventModal
          event={modal.create ? { client_id: clients[0]?.id || '', title: '', type: 'reel', date: prefillDate, status: 'scheduled' } : modal}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={load}
          isEdit={!modal.create}
        />
      )}

      {detailModal && (
        <EventDetailModal
          event={detailModal}
          clients={clients}
          onClose={() => setDetailModal(null)}
          onEdit={() => { setDetailModal(null); setModal(detailModal); }}
          onDelete={load}
        />
      )}
    </div>
  );
}
