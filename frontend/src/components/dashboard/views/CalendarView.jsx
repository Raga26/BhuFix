import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_STYLE = {
  reel:    { bg: 'rgba(244,114,182,0.2)',  color: '#F472B6', label: 'Reel' },
  post:    { bg: 'rgba(77,217,255,0.15)',  color: '#4DD9FF', label: 'Post' },
  ad:      { bg: 'rgba(167,139,250,0.2)',  color: '#A78BFA', label: 'Ad' },
  content: { bg: 'rgba(52,211,153,0.18)', color: '#34D399', label: 'Content' },
  shoot:   { bg: 'rgba(251,191,36,0.18)', color: '#FBBF24', label: 'Shoot' },
};

const STATUS_STYLE = {
  idea:       { label: 'Idea', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  writing:    { label: 'Writing', color: '#4DD9FF', bg: 'rgba(77,217,255,0.15)' },
  editing:    { label: 'Editing', color: '#A78BFA', bg: 'rgba(167,139,250,0.18)' },
  review:     { label: 'Review', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
  approved:   { label: 'Approved', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  scheduled:  { label: 'Scheduled', color: '#E8734A', bg: 'rgba(232,115,74,0.15)' },
  published:  { label: 'Published', color: '#34D399', bg: 'rgba(52,211,153,0.2)' },
  postponed:  { label: 'Postponed', color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
};

function normStatus(s) {
  return ({ not_started: 'idea', in_progress: 'writing', completed: 'published', postpone: 'postponed' }[s] || s || 'idea');
}

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m || '00'} ${ampm}`;
}

function EventModal({ event, clients, onClose, onSave, isEdit }) {
  const [form, setForm] = useState(() => {
    if (event?.id || (event && isEdit)) {
      return { ...event, status: normStatus(event.status) };
    }
    return { client_id: clients[0]?.id || '', title: '', time: '', type: 'reel', date: event?.date || '', status: 'idea', owner_id: '' };
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  const handleSave = async () => {
    if (!form.client_id || !form.title || !form.date) {
      toast.error(!clients.length ? 'No clients assigned to you yet' : 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, time: form.time || null };
      logger.formSubmit('CalendarView', isEdit ? 'update_event' : 'create_event', {
        title: form.title,
        type: form.type,
        date: form.date,
        time: form.time,
      });
      if (isEdit) {
        await apiClient.put(`/calendar/${form.id}`, payload);
        toast.success('Event updated successfully');
        logger.success('Event updated', { eventId: form.id });
      } else {
        await apiClient.post('/calendar', payload);
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
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit post' : 'Add post'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {!clients.length && <option value="">No clients assigned</option>}
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Title</label>
              <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Reveal Reel" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Time</label>
              <input
                className={`${inputCls} sm:w-[7.5rem] cursor-pointer`}
                type="time"
                value={form.time || ''}
                onChange={(e) => set('time', e.target.value)}
                title="Set time"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(STATUS_STYLE).map(([k, s]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('status', k)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[44px]"
                  style={{
                    background: form.status === k ? s.bg : 'rgba(255,255,255,0.04)',
                    color: form.status === k ? s.color : 'rgba(255,255,255,0.35)',
                    borderColor: form.status === k ? s.color + '60' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span style={k === 'published' ? { textDecoration: 'line-through' } : {}}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2]">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DayEventsModal({ date, dayEvents, clients, canMutate, onClose, onAddPost, onEditEvent, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null);

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = async (ev) => {
    setDeletingId(ev.id);
    try {
      logger.userAction('CalendarView', 'delete_event', { eventId: ev.id, title: ev.title });
      await apiClient.delete(`/calendar/${ev.id}`);
      toast.success('Event deleted successfully');
      logger.success('Event deleted', { eventId: ev.id });
      onRefresh();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete event';
      toast.error(errorMsg);
      logger.error('Failed to delete event', { eventId: ev.id, error: e.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal w-full max-w-md flex flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h2 className="text-white font-medium text-base">{displayDate}</h2>
            <p className="text-white/40 text-xs mt-0.5">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {canMutate && (
              <button
                type="button"
                onClick={onAddPost}
                className="dash-btn dash-btn-primary min-h-[44px]"
              >
                <Plus size={12} strokeWidth={2} />
                Add
              </button>
            )}
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No events for this day</div>
          ) : (
            dayEvents.map((ev) => {
              const ts = TYPE_STYLE[ev.type] || TYPE_STYLE.post;
              const ss = STATUS_STYLE[normStatus(ev.status)] || STATUS_STYLE.idea;
              const clientLabel = clients.find((c) => c.id === ev.client_id)?.name;
              const isCompleted = normStatus(ev.status) === 'published';
              return (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] transition-all"
                >
                  <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[2.5rem] hidden sm:block" style={{ background: ts.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                      <span className="text-[10px] flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ss.color }} />
                        {ss.label}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold text-white truncate ${isCompleted ? 'line-through opacity-50' : ''}`}>
                      {ev.time ? <span className="text-white/50 font-medium mr-1.5">{formatTime(ev.time)}</span> : null}
                      {ev.title}
                    </p>
                    {clientLabel ? <p className="text-xs text-white/40 truncate">{clientLabel}</p> : null}
                  </div>
                  {canMutate && (
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditEvent(ev)}
                        className="dash-btn dash-btn-ghost flex-1 sm:flex-none min-h-[44px]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ev)}
                        disabled={deletingId === ev.id}
                        className="dash-btn dash-btn-danger flex-1 sm:flex-none min-h-[44px] disabled:opacity-40"
                      >
                        {deletingId === ev.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetailModal({ event, clients, onClose, onEdit, onDelete, canMutate }) {
  const clientName = clients.find(c => c.id === event.client_id)?.name;
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
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold px-2.5 py-1 rounded-full w-fit text-[10px]" style={{ background: ts.bg, color: ts.color }}>
              {ts.label.toUpperCase()}
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <h2 className="text-white font-bold text-lg mb-3">{event.title}</h2>

        <div className="space-y-2 mb-6">
          {clientName && (
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Client</span>
            <span className="text-white">{clientName}</span>
          </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Date</span>
            <span className="text-white">{new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          {event.time && (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Time</span>
              <span className="text-white">{formatTime(event.time)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-white/40">Status</span>
            {(() => {
              const ss = STATUS_STYLE[normStatus(event.status)] || STATUS_STYLE.idea;
              return (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: ss.bg, color: ss.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: ss.color }} />
                  <span style={normStatus(event.status) === 'published' ? { textDecoration: 'line-through' } : {}}>{ss.label}</span>
                </span>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Close</button>
          {canMutate && (
            <>
              <button type="button" onClick={onEdit} className="dash-btn dash-btn-primary flex-1">Edit</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="dash-btn dash-btn-danger flex-1">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Calendar events are date-only values. Avoid toISOString() here because it
// converts a local midnight into UTC, which can move the date in positive UTC
// offsets such as India Standard Time.
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function WeekView({ weekDays, events, clients, onDayClick }) {
  const todayStr = formatLocalDate(new Date());

  const eventsForDate = (dateStr) => events.filter((e) => e.date === dateStr);
  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || '';

  return (
    <div className="dash-card overflow-hidden">
      <div className="grid grid-cols-7 min-w-[560px]">
        {weekDays.map((day) => {
          const dateStr = formatLocalDate(day);
          const isToday = dateStr === todayStr;
          const dayName = day.toLocaleDateString('en-IN', { weekday: 'short' });
          const dayNum = day.getDate();
          const dayEvents = eventsForDate(dateStr);

          return (
            <div key={dateStr} className="border-r border-white/[0.04] last:border-r-0 flex flex-col">
              <div
                className={`p-2 sm:p-3 text-center border-b border-white/[0.04] flex-shrink-0 ${isToday ? 'bg-[#E8734A]/[0.08]' : ''}`}
              >
                <div className="text-white/40 text-[10px] uppercase tracking-widest">{dayName}</div>
                <div
                  className={`text-lg sm:text-2xl font-extrabold mt-0.5 leading-none ${isToday ? 'text-[#E8734A]' : 'text-white/80'}`}
                >
                  {dayNum}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-1 flex justify-center">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/40">
                      {dayEvents.length}
                    </span>
                  </div>
                )}
              </div>

              <div
                onClick={() => onDayClick(dateStr)}
                className="flex-1 p-1.5 sm:p-2 min-h-[140px] cursor-pointer hover:bg-white/[0.02] transition-colors space-y-1.5"
              >
                {dayEvents.map((ev) => {
                  const ts = TYPE_STYLE[ev.type] || TYPE_STYLE.post;
                  const ss = STATUS_STYLE[normStatus(ev.status)] || STATUS_STYLE.idea;
                  const isCompleted = normStatus(ev.status) === 'published';
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onDayClick(dateStr); }}
                      className="rounded-lg p-1.5 sm:p-2 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ background: ts.bg, borderLeft: `3px solid ${ts.color}` }}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ss.color }} />
                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: ts.color }}>{ts.label}</span>
                      </div>
                      <p
                        className="text-xs font-semibold text-white leading-tight line-clamp-2"
                        style={isCompleted ? { textDecoration: 'line-through', opacity: 0.5 } : {}}
                      >
                        {ev.time ? <span className="opacity-70 font-medium">{formatTime(ev.time)} · </span> : null}
                        {ev.title}
                      </p>
                      {clientName(ev.client_id) ? <p className="text-[10px] text-white/40 mt-0.5 truncate">{clientName(ev.client_id)}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
  const [dayModal, setDayModal] = useState(null);
  const [prefillDate, setPrefillDate] = useState('');
  const [calView, setCalView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'month'));
  const [tracker, setTracker] = useState(null);

  const today = new Date();
  const [viewDate, setViewDate] = useState({ month: today.getMonth() + 1, year: today.getFullYear() });
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));

  const isStaff = user?.role !== 'client';
  const canMutate = can(user, 'calendar.write');

  const load = useCallback(() => {
    const fetchMonth = (m, y) =>
      apiClient.get('/calendar', { params: { month: m, year: y } }).then((r) => r.data || []);

    if (calView === 'week') {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const sm = weekStart.getMonth() + 1;
      const sy = weekStart.getFullYear();
      const em = weekEnd.getMonth() + 1;
      const ey = weekEnd.getFullYear();

      const fetches = (sm === em && sy === ey)
        ? [fetchMonth(sm, sy)]
        : [fetchMonth(sm, sy), fetchMonth(em, ey)];

      Promise.all(fetches)
        .then((results) => {
          const merged = results.flat();
          setEvents(merged);
          logger.info('Week events loaded', { count: merged.length });
        })
        .catch((e) => logger.error('Failed to load week events', { error: e.message }));
    } else {
      fetchMonth(viewDate.month, viewDate.year)
        .then((data) => {
          setEvents(data);
          logger.info('Calendar events loaded', { count: data.length, month: viewDate.month });
        })
        .catch((e) => logger.error('Failed to load calendar', { error: e.message }));
    }

    if (isStaff) {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch((e) => logger.error('Failed to load clients', { error: e.message }));
    }
  }, [calView, viewDate, weekStart, isStaff]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const m = calView === 'week' ? weekStart.getMonth() + 1 : viewDate.month;
    const y = calView === 'week' ? weekStart.getFullYear() : viewDate.year;
    apiClient.get('/tracker/month', { params: { month: m, year: y } }).then((r) => setTracker(r.data)).catch(() => {});
  }, [calView, viewDate, weekStart]);

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

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = weekDays[6];
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const isToday = (day) => {
    const d = new Date();
    return d.getDate() === day && d.getMonth() + 1 === viewDate.month && d.getFullYear() === viewDate.year;
  };

  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || '';

  const periodLabel = calView === 'week' ? weekLabel : monthName;
  const onPrev = calView === 'week' ? prevWeek : prevMonth;
  const onNext = calView === 'week' ? nextWeek : nextMonth;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="dash-title">{user?.role === 'client' ? 'Content' : 'Calendar'}</h1>
          <p className="dash-sub">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-white/[0.1] rounded-md p-0.5">
            {['month', 'week', 'list'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setCalView(v)}
                className={`text-xs font-medium px-3 min-h-[44px] md:min-h-0 md:py-1.5 rounded capitalize transition-colors ${calView === v ? 'bg-white/[0.1] text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                {v}
              </button>
            ))}
          </div>

          <button type="button" onClick={onPrev} className="dash-btn dash-btn-ghost w-11 md:w-9 px-0" aria-label="Previous">
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button type="button" onClick={onNext} className="dash-btn dash-btn-ghost w-11 md:w-9 px-0" aria-label="Next">
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>

          {canMutate && (
            <button
              type="button"
              onClick={() => {
                if (!clients.length) {
                  toast.error('No clients assigned to you yet');
                  return;
                }
                setPrefillDate('');
                setModal({ create: true });
              }}
              className="dash-btn dash-btn-primary"
            >
              <Plus size={14} strokeWidth={2} />
              Add post
            </button>
          )}
        </div>
      </div>

      {tracker?.calendar && (
        <div className="dash-card p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-white text-lg">{tracker.calendar.planned ?? 0}</div><div className="text-white/35 text-xs">Planned</div></div>
            {user?.role !== 'client' && (
              <div><div className="text-white text-lg">{tracker.calendar.in_production ?? 0}</div><div className="text-white/35 text-xs">In production</div></div>
            )}
            <div><div className="text-white text-lg">{tracker.calendar.published ?? 0}</div><div className="text-white/35 text-xs">Published</div></div>
            <div><div className="text-white text-lg">{tracker.calendar.on_time_pct != null ? `${tracker.calendar.on_time_pct}%` : '—'}</div><div className="text-white/35 text-xs">On-time of published{tracker.calendar.late ? ` · ${tracker.calendar.late} late` : ''}</div></div>
          </div>
          {user?.role !== 'client' && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-white/40">
            {['idea', 'writing', 'editing', 'review', 'approved', 'scheduled', 'published', 'postponed'].map((k) => (
              <span key={k}>{STATUS_STYLE[k].label} {tracker.calendar[k] ?? 0}</span>
            ))}
          </div>
          )}
        </div>
      )}

      {calView === 'list' ? (
        <div className="dash-card divide-y divide-white/[0.04]">
          {events.length === 0 ? (
            <p className="text-white/35 text-sm p-5">Nothing this month.</p>
          ) : [...events].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).map((ev) => {
            const st = STATUS_STYLE[normStatus(ev.status)] || STATUS_STYLE.idea;
            const ts = TYPE_STYLE[ev.type] || TYPE_STYLE.post;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setDayModal({ date: ev.date })}
                className="w-full text-left px-4 py-3.5 min-h-[52px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm truncate">{ev.title}</span>
                  <span className="text-[10px] uppercase" style={{ color: st.color }}>{st.label}</span>
                </div>
                <div className="text-white/40 text-xs mt-0.5">{ev.date}{ev.time ? ` · ${formatTime(ev.time)}` : ''}{user?.role === 'client' ? '' : ` · ${clientName(ev.client_id)}`} · {ts.label}</div>
              </button>
            );
          })}
        </div>
      ) : calView === 'week' ? (
        <div className="overflow-x-auto">
          <WeekView
            weekDays={weekDays}
            events={events}
            clients={clients}
            onDayClick={(dateStr) => setDayModal({ date: dateStr })}
          />
        </div>
      ) : (
        <div className="dash-card p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 mb-1 min-w-[420px]">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="text-center text-white/30 text-xs font-semibold uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 min-w-[420px]">
            {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = eventsForDay(day);
              const today_ = isToday(day);
              const dateStr = `${viewDate.year}-${String(viewDate.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const openDay = () => setDayModal({ date: dateStr });
              return (
                <div
                  key={day}
                  onClick={openDay}
                  className={`min-h-[80px] sm:min-h-[100px] rounded-xl p-2 border transition-all cursor-pointer ${
                    today_
                      ? 'border-[#E8734A]/40 bg-[#E8734A]/[0.06]'
                      : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`text-sm font-bold mb-1.5 ${today_ ? 'text-[#E8734A]' : 'text-white/50'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const ts = TYPE_STYLE[ev.type] || TYPE_STYLE.post;
                      const ss = STATUS_STYLE[normStatus(ev.status)] || STATUS_STYLE.idea;
                      const isCompleted = normStatus(ev.status) === 'published';
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openDay(); }}
                          className="text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                          style={{ background: ts.bg, color: isCompleted ? 'rgba(156,163,175,0.6)' : ts.color }}
                          title={`${ev.time ? formatTime(ev.time) + ' · ' : ''}${ev.title} — ${clientName(ev.client_id)} · ${ss.label}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ss.color }} />
                          <span style={isCompleted ? { textDecoration: 'line-through' } : {}} className="truncate">
                            {ev.time ? `${formatTime(ev.time)} ` : ''}{ev.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openDay(); }}
                        className="text-[10px] text-white/50 hover:text-white/80 px-1.5 py-0.5 rounded hover:bg-white/[0.08] transition-all w-full text-left font-medium"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-4">
        <div className="flex flex-wrap gap-3">
          {Object.entries(TYPE_STYLE).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2 h-2 rounded-sm" style={{ background: v.color }} />
              {v.label}
            </div>
          ))}
        </div>
        <div className="w-px bg-white/10 hidden sm:block" />
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_STYLE).filter(([k]) => user?.role !== 'client' || ['approved', 'scheduled', 'published', 'postponed'].includes(k)).map(([k, s]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span style={k === 'published' ? { textDecoration: 'line-through' } : {}}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {dayModal && (
        <DayEventsModal
          date={dayModal.date}
          dayEvents={events.filter((e) => e.date === dayModal.date)}
          clients={clients}
          canMutate={canMutate}
          onClose={() => setDayModal(null)}
          onAddPost={() => {
            if (!clients.length) {
              toast.error('No clients assigned to you yet');
              return;
            }
            setPrefillDate(dayModal.date);
            setDayModal(null);
            setModal({ create: true });
          }}
          onEditEvent={(ev) => {
            setDayModal(null);
            setModal(ev);
          }}
          onRefresh={load}
        />
      )}

      {modal && canMutate && (
        <EventModal
          event={modal.create ? { client_id: clients[0]?.id || '', title: '', time: '', type: 'reel', date: prefillDate, status: 'idea' } : { ...modal, time: modal.time || '' }}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={() => { load(); setModal(null); }}
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
          canMutate={canMutate}
        />
      )}
    </div>
  );
}
