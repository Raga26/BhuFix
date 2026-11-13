import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Copy, Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, TASK_STATUSES } from '../../../lib/access';
import { ClientMark } from '../ClientMark';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';

const inputCls = 'w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50';
const optStyle = { background: '#0D0E1A', color: '#fff' };

const BOARD = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'in_review', label: 'In review' },
  { value: 'done', label: 'Done' },
];

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function lastDayOfMonth(year, month) {
  const day = new Date(year, month, 0).getDate();
  return `${monthKey(year, month)}-${String(day).padStart(2, '0')}`;
}

function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function columnFor(status) {
  if (status === 'changes_requested') return 'in_review';
  if (status === 'cancelled') return null;
  return status;
}

function isOverdue(task) {
  if (!task.deadline || task.status === 'done' || task.status === 'cancelled') return false;
  return task.deadline < todayStr();
}

function dayLabel(value) {
  if (!value) return '';
  const raw = String(value);
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TaskModal({ task, clients, staff, defaultStatus, defaultDeadline, canDelete, onClose, onSave, onDelete }) {
  const isEdit = !!task?.id;
  const [form, setForm] = useState(task?.id ? task : {
    client_id: clients[0]?.id || '',
    owner_id: staff[0]?.id || '',
    title: '',
    brief: '',
    deadline: defaultDeadline || '',
    status: defaultStatus || 'todo',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client_id || !form.owner_id || !form.title?.trim()) {
      toast.error('Client, owner and title are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        owner_id: form.owner_id,
        title: form.title,
        brief: form.brief || '',
        deadline: form.deadline || null,
        status: form.status || 'todo',
      };
      if (isEdit) await apiClient.put(`/tasks/${form.id}`, payload);
      else await apiClient.post('/tasks', payload);
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit task' : 'New task'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Assign to</label>
            <select className={inputCls} value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
              {staff.map((s) => <option key={s.id} value={s.id} style={optStyle}>{s.name} · {s.job_label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to be done" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Brief</label>
            <textarea className={inputCls + ' min-h-[90px]'} value={form.brief} onChange={(e) => set('brief', e.target.value)} placeholder="Context, references, definition of done" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Deadline</label>
              <input className={inputCls} type="date" value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {TASK_STATUSES.filter((s) => s.value !== 'cancelled').map((s) => (
                  <option key={s.value} value={s.value} style={optStyle}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          {isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] pt-1">
              <div>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Created</div>
                <div className="text-white/80">{dayLabel(task.created_at) || '—'}</div>
              </div>
              <div>
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Closed</div>
                <div className="text-white/80">{dayLabel(task.closed_at) || (task.status === 'done' ? dayLabel(task.updated_at) : '—') || '—'}</div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          {isEdit && canDelete && (
            <button type="button" onClick={() => onDelete(task)} className="dash-btn dash-btn-danger">Delete</button>
          )}
          <button type="button" onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

function resultLabel(task) {
  if (task.outcome === 'on_time') return 'Done';
  if (task.outcome === 'late') return 'Late';
  if (task.outcome === 'overdue') return 'Overdue';
  if (task.outcome === 'not_due') return 'Later';
  return { todo: 'To do', in_progress: 'In progress', in_review: 'In review', changes_requested: 'Changes' }[task.status] || 'Open';
}

function resultClass(label) {
  if (label === 'Done') return 'text-[#34D399]';
  if (label === 'Late' || label === 'Overdue') return 'text-[#E8734A]';
  return 'text-white/75';
}

function countTable(headers, rows) {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => String(row[index]).length)));
  const paint = (cells, headerRow) => cells.map((cell, index) => {
    const text = String(cell);
    return index === 0 || headerRow ? text.padEnd(widths[index], ' ') : text.padStart(widths[index], ' ');
  }).join('  ').trimEnd();
  return ['```', paint(headers, true), widths.map((width) => '-'.repeat(width)).join('  '), ...rows.map((row) => paint(row, false)), '```'].join('\n');
}

function titleList(tasks, limit = 4) {
  const titles = tasks.map((task) => task.title).filter(Boolean);
  const shown = titles.slice(0, limit);
  const extra = titles.length - shown.length;
  return shown.join(', ') + (extra > 0 ? ` +${extra}` : '');
}

function dayDigest(score) {
  const totals = score?.today?.totals || {};
  const people = score?.today?.people || [];
  const earlier = people
    .map((person) => ({ name: person.name, count: (person.tasks || []).filter((task) => task.earlier).length }))
    .filter((person) => person.count > 0);
  const older = earlier.reduce((sum, person) => sum + person.count, 0);
  const lines = [
    `*BhuFix · ${score?.today?.label || score?.date || ''}*`,
    `On time ${totals.on_time || 0} · Open ${totals.open || 0} · Older ${older}`,
    '',
    countTable(
      ['Person', 'Done', 'Open'],
      people.map((person) => [person.name, `${person.on_time || 0}/${person.due || 0}`, String(person.open || 0)]),
    ),
  ];
  people.forEach((person) => {
    const tasks = (person.tasks || []).filter((task) => !task.earlier);
    const done = tasks.filter((task) => task.outcome === 'on_time' || task.outcome === 'late');
    const open = tasks.filter((task) => task.outcome === 'open');
    if (!done.length && !open.length) return;
    lines.push('', `*${person.name}*`);
    if (done.length) lines.push(`Done: ${titleList(done)}`);
    if (open.length) lines.push(`Open: ${titleList(open)}`);
  });
  if (earlier.length) {
    lines.push('', `Older still open: ${earlier.map((person) => `${person.name} ${person.count}`).join(' · ')}`);
  }
  return lines.join('\n').trim();
}

function monthDigest(score, monthLabel) {
  const totals = score?.month?.totals || {};
  const people = [...(score?.month?.people || [])];
  const stillOpen = (totals.open || 0) + (totals.overdue || 0);
  const lines = [
    `*BhuFix · ${monthLabel}*`,
    `On time ${totals.on_time || 0} · Late ${totals.late || 0} · Open ${stillOpen} · Later ${totals.not_due || 0}`,
  ];
  if (!people.length) {
    lines.push('', 'No tasks with a deadline this month.');
    return lines.join('\n');
  }
  lines.push('', countTable(
    ['Person', 'Done', 'Late', 'Open', 'Later'],
    people.map((person) => [
      person.name,
      String(person.on_time || 0),
      String(person.late || 0),
      String((person.open || 0) + (person.overdue || 0)),
      String(person.not_due || 0),
    ]),
  ));
  people.forEach((person) => {
    const done = (person.tasks || []).filter((task) => task.outcome === 'on_time');
    const pending = (person.tasks || []).filter((task) => task.outcome === 'open' || task.outcome === 'overdue' || task.outcome === 'late');
    if (!done.length && !pending.length) return;
    lines.push('', `*${person.name}*`);
    if (done.length) lines.push(`Done: ${titleList(done)}`);
    if (pending.length) lines.push(`Open: ${titleList(pending)}`);
  });
  return lines.join('\n').trim();
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to the selection copy */
    }
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  el.remove();
  if (!ok) throw new Error('copy failed');
}

function PersonBoard({ rows, columns, openId, onToggle }) {
  const template = `minmax(0,1fr) ${columns.map(() => '3.4rem').join(' ')}`;
  return (
    <div className="mt-3">
      <div className="grid items-center gap-x-3 text-[11px] text-white/35 pb-1 border-b border-white/10" style={{ gridTemplateColumns: template }}>
        <span>Person</span>
        {columns.map((col) => <span key={col.key} className="text-right">{col.label}</span>)}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => onToggle(row.id)}
            className="w-full grid items-center gap-x-3 py-2 text-left"
            style={{ gridTemplateColumns: template }}
          >
            <span className="text-white text-sm truncate">{row.name}</span>
            {columns.map((col) => (
              <span key={col.key} className={`text-xs text-right ${col.warn && Number(row[col.key]) > 0 ? 'text-[#E8734A]' : 'text-white/70'}`}>
                {row[col.key]}
              </span>
            ))}
          </button>
          {openId === row.id && (
            <div className="pb-2 space-y-0.5">
              {(row.detail || []).length === 0 ? (
                <p className="text-white/35 text-xs">No tasks</p>
              ) : row.detail.map((task) => (
                <p key={task.id} className="text-xs truncate">
                  <span className={resultClass(task.label)}>{task.label}</span>
                  <span className="text-white/55"> · {task.title}</span>
                  {task.extra ? <span className="text-white/30"> · {task.extra}</span> : null}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CountStrip({ items }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1.5">
      {items.map(([value, label]) => (
        <span key={label}><span className="text-white/80">{value}</span> <span className="text-white/35">{label}</span></span>
      ))}
    </div>
  );
}

function taskDetail(task, extra) {
  return { id: task.id, title: task.title, label: resultLabel(task), extra };
}

function TaskScoreboard({ score, monthLabel, monthKey, reportDate, onDateChange }) {
  const [mode, setMode] = useState('day');
  const [openId, setOpenId] = useState(null);
  const dayReady = score?.date === reportDate;
  const monthReady = score?.month?.key === monthKey;
  const totals = dayReady ? (score.today?.totals || {}) : {};
  const monthTotals = monthReady ? (score.month?.totals || {}) : null;
  const stillOpen = monthTotals ? (monthTotals.open || 0) + (monthTotals.overdue || 0) : 0;
  const isToday = reportDate === todayStr();
  const dayPeople = (dayReady ? score.today?.people || [] : [])
    .map((person) => ({
      id: person.owner_id || person.name,
      name: person.name,
      done: `${person.on_time || 0}/${person.due || 0}`,
      late: person.late || 0,
      open: person.open || 0,
      detail: (person.tasks || [])
        .filter((task) => !task.earlier && (task.outcome === 'open' || task.outcome === 'late' || task.outcome === 'on_time'))
        .map((task) => taskDetail(task, task.client_name)),
    }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  const earlierGroups = (dayReady ? score.today?.people || [] : [])
    .map((person) => ({
      id: person.owner_id || person.name,
      name: person.name,
      tasks: (person.tasks || []).filter((task) => task.earlier),
    }))
    .filter((person) => person.tasks.length > 0);
  const earlierTotal = earlierGroups.reduce((sum, person) => sum + person.tasks.length, 0);
  const monthRows = (monthReady ? score.month?.people || [] : [])
    .map((person) => ({
      id: person.owner_id || person.name,
      name: person.name,
      onTime: person.on_time || 0,
      late: person.late || 0,
      open: (person.open || 0) + (person.overdue || 0),
      later: person.not_due || 0,
      detail: (person.tasks || [])
        .filter((task) => task.outcome === 'open' || task.outcome === 'overdue' || task.outcome === 'late' || task.outcome === 'on_time')
        .map((task) => taskDetail(task, `${dayLabel(task.deadline)} · ${task.client_name || ''}`)),
    }))
    .sort((a, b) => (b.open + b.late) - (a.open + a.late) || a.name.localeCompare(b.name));
  useEffect(() => { setOpenId(null); }, [mode, reportDate, monthKey]);

  const copy = async () => {
    const ready = mode === 'month' ? monthReady : dayReady;
    if (!ready) {
      toast.error('Report is still loading');
      return;
    }
    const text = mode === 'month' ? monthDigest(score, monthLabel) : dayDigest(score);
    try {
      await writeClipboard(text);
      toast.success('Copied. Paste it into the WhatsApp group.');
    } catch {
      toast.error('Could not copy the summary');
    }
  };
  const copyReady = mode === 'month' ? monthReady : dayReady;
  const tabCls = (active) => `px-3 py-1.5 ${active ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'}`;

  return (
    <div className="dash-card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex rounded-xl border border-white/10 overflow-hidden text-xs shrink-0">
            <button type="button" className={tabCls(mode === 'day')} onClick={() => setMode('day')}>Day</button>
            <button type="button" className={tabCls(mode === 'month')} onClick={() => setMode('month')}>Month</button>
          </div>
          {mode === 'day' ? (
            <input
              type="date"
              aria-label="Report date"
              value={reportDate}
              onChange={(e) => { if (e.target.value) onDateChange(e.target.value); }}
              className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm outline-none focus:border-[#E8734A]/50 [color-scheme:dark]"
            />
          ) : (
            <span className="text-white/45 text-xs">Uses {monthLabel} from the arrows above</span>
          )}
        </div>
        <button type="button" onClick={copy} disabled={!copyReady} className="dash-btn dash-btn-ghost shrink-0 disabled:opacity-40">
          <Copy size={14} strokeWidth={1.75} />
          {mode === 'month' ? 'Copy month' : 'Copy day'}
        </button>
      </div>

      {mode === 'day' && dayReady && (
        <div className="mt-3">
          <div className="text-white text-sm font-medium">{isToday ? 'Today' : 'Day'} · {score.today.label}</div>
          <CountStrip items={[[totals.due || 0, 'due'], [totals.on_time || 0, 'on time'], [totals.late || 0, 'late'], [totals.open || 0, 'still open']]} />
          {dayPeople.length === 0 ? (
            <p className="text-white/35 text-xs mt-3">No tasks due this day.</p>
          ) : (
            <PersonBoard
              rows={dayPeople}
              columns={[{ key: 'done', label: 'Done' }, { key: 'late', label: 'Late', warn: true }, { key: 'open', label: 'Open', warn: true }]}
              openId={openId}
              onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
            />
          )}
          {earlierTotal > 0 && (
            <div className="mt-3">
              <button type="button" className="text-white/55 text-xs hover:text-white" onClick={() => setOpenId((current) => (current === 'earlier' ? null : 'earlier'))}>
                Older still open · {earlierTotal}
              </button>
              {openId === 'earlier' && (
                <div className="mt-2 max-h-36 overflow-y-auto space-y-2">
                  {earlierGroups.map((person) => (
                    <div key={person.id}>
                      <div className="text-white/80 text-xs">{person.name} · {person.tasks.length}</div>
                      {person.tasks.map((task) => (
                        <p key={task.id} className="text-white/40 text-xs truncate">{task.title} · due {dayLabel(task.deadline)}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'month' && monthReady && (
        <div className="mt-3">
          <div className="text-white text-sm font-medium">{monthLabel}</div>
          <CountStrip items={[[monthTotals.on_time || 0, 'on time'], [monthTotals.late || 0, 'late'], [stillOpen, 'still open'], [monthTotals.not_due || 0, 'not due yet']]} />
          {monthRows.length === 0 ? (
            <p className="text-white/35 text-xs mt-3">No tasks with a deadline this month.</p>
          ) : (
            <PersonBoard
              rows={monthRows}
              columns={[
                { key: 'onTime', label: 'Done' },
                { key: 'late', label: 'Late', warn: true },
                { key: 'open', label: 'Open', warn: true },
                { key: 'later', label: 'Later' },
              ]}
              openId={openId}
              onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
            />
          )}
        </div>
      )}

      {((mode === 'day' && !dayReady) || (mode === 'month' && !monthReady)) && (
        <p className="text-white/35 text-xs mt-3">Updating report…</p>
      )}
    </div>
  );
}

function TaskCard({ task, client, owner, canWrite, onOpen, onDragStart, onDragEnd }) {
  const overdue = isOverdue(task);
  return (
    <article
      draggable={canWrite}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
      className={`dash-card p-3 cursor-pointer hover:border-white/20 transition-colors ${canWrite ? 'active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <ClientMark client={client || { name: '?' }} size={28} />
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium leading-snug break-words">{task.title}</div>
          <div className="text-white/40 text-xs mt-1 truncate">{client?.name || 'Client'}</div>
          {task.deadline && (
            <div className={`text-[11px] mt-1.5 ${overdue ? 'text-[#E8734A]' : 'text-white/35'}`}>
              {overdue ? 'Overdue · ' : 'Due '}{dayLabel(task.deadline)}
            </div>
          )}
          <div className="text-white/35 text-[11px] mt-1">Created {dayLabel(task.created_at) || '—'}</div>
          <div className="text-white text-[12px] mt-2 truncate">
            {owner?.name || 'Unassigned'}
          </div>
          {task.status === 'changes_requested' && (
            <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wider text-[#FBBF24]/90 border border-[#FBBF24]/25 rounded-full px-2 py-0.5">Changes</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function TasksView() {
  const { user } = useAuth();
  const canWrite = can(user, 'tasks.write');
  const now = new Date();
  const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [score, setScore] = useState(null);
  const [reportDate, setReportDate] = useState(todayStr);

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);
  const month = monthKey(viewDate.year, viewDate.month);
  const monthLabel = new Date(viewDate.year, viewDate.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const defaultDeadline = lastDayOfMonth(viewDate.year, viewDate.month);

  const loadScore = useCallback(() => {
    if (user?.role === 'client') {
      setScore(null);
      return;
    }
    apiClient.get('/tasks/productivity', { params: { month, date: reportDate } })
      .then((r) => setScore(r.data))
      .catch(() => {});
  }, [month, reportDate, user?.role]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/tasks', { params: { month } }),
      apiClient.get('/clients/directory').catch(() => apiClient.get('/clients')),
      apiClient.get('/users/directory').catch(() => ({ data: [] })),
    ]).then(([t, c, s]) => {
      setTasks(t.data || []);
      setClients(c.data || []);
      setStaff(s.data || []);
    }).catch(() => toast.error('Failed to load tasks')).finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadScore(); }, [loadScore]);

  const visible = tasks.filter((t) => {
    if (t.status === 'cancelled') return false;
    if (ownerFilter && t.owner_id !== ownerFilter) return false;
    return true;
  });

  const byColumn = Object.fromEntries(BOARD.map((col) => [col.value, []]));
  visible.forEach((t) => {
    const col = columnFor(t.status);
    if (col && byColumn[col]) byColumn[col].push(t);
  });

  const moveTask = async (task, status) => {
    if (!canWrite || task.status === status) return;
    const prev = task.status;
    setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await apiClient.put(`/tasks/${task.id}`, { status });
      loadScore();
    } catch (e) {
      setTasks((list) => list.map((t) => (t.id === task.id ? { ...t, status: prev } : t)));
      toast.error(e.response?.data?.detail || 'Could not move task');
    }
  };

  const openNew = (status = 'todo') => {
    if (!clients.length) {
      toast.error('No clients yet — add a client first');
      return;
    }
    setModal({ status, deadline: defaultDeadline });
  };

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex flex-col gap-4 mb-6 min-w-0">
        <div>
          <h1 className="dash-title">Tasks</h1>
          <p className="dash-sub">Monthly board — create, assign, and drag to track.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setViewDate((v) => shiftMonth(v.year, v.month, -1))} className="dash-btn dash-btn-ghost w-11 md:w-9 px-0" aria-label="Previous month">
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <div className="w-[9.5rem] text-center text-white text-sm font-medium shrink-0">{monthLabel}</div>
          <button type="button" onClick={() => setViewDate((v) => shiftMonth(v.year, v.month, 1))} className="dash-btn dash-btn-ghost w-11 md:w-9 px-0" aria-label="Next month">
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
          <select className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#E8734A]/50 w-[11rem] max-w-full shrink-0" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="" style={optStyle}>Everyone</option>
            {staff.map((s) => <option key={s.id} value={s.id} style={optStyle}>{s.name}</option>)}
          </select>
          {canWrite && (
            <button type="button" onClick={() => openNew('todo')} className="dash-btn dash-btn-primary" disabled={!clients.length}>
              <Plus size={14} strokeWidth={2} />
              New task
            </button>
          )}
        </div>
      </div>

      {user?.role !== 'client' && score?.today && (
        <TaskScoreboard
          score={score}
          monthLabel={monthLabel}
          monthKey={month}
          reportDate={reportDate}
          onDateChange={setReportDate}
        />
      )}

      {!clients.length && user?.role !== 'client' && (
        <div className="dash-card p-5 mb-6 text-sm text-white/50">
          No clients yet. Ask an admin to add a client before tasks can appear here.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
          {BOARD.map((col) => (
            <section
              key={col.value}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging) moveTask(dragging, col.value);
                setDragging(null);
              }}
              className="min-w-0 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col min-h-[16rem] max-h-[min(70dvh,36rem)]"
            >
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="text-white/70 text-xs uppercase tracking-wider font-medium">
                  {col.label}
                  <span className="text-white/30 ml-2">{byColumn[col.value].length}</span>
                </div>
                {canWrite && (
                  <button type="button" className="text-white/35 hover:text-white p-1" aria-label={`Add to ${col.label}`} onClick={() => openNew(col.value)}>
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {byColumn[col.value].length === 0 ? (
                  <p className="text-white/25 text-xs px-1 py-6 text-center">Drop tasks here</p>
                ) : byColumn[col.value].map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    client={clientMap[t.client_id]}
                    owner={staffMap[t.owner_id]}
                    canWrite={canWrite}
                    onOpen={(task) => setModal(task)}
                    onDragStart={(e, task) => {
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDragging(task);
                    }}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal !== null && (
        <TaskModal
          task={modal?.id ? modal : null}
          clients={clients}
          staff={staff}
          defaultStatus={modal?.status || 'todo'}
          defaultDeadline={modal?.deadline || defaultDeadline}
          canDelete={canWrite}
          onClose={() => setModal(null)}
          onSave={() => { load(); loadScore(); }}
          onDelete={(task) => { setModal(null); setDeleteConfirm(task); }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete task"
          message={`Delete "${deleteConfirm.title}"?`}
          onConfirm={async () => {
            try {
              await apiClient.delete(`/tasks/${deleteConfirm.id}`);
              toast.success('Task deleted');
              setDeleteConfirm(null);
              load();
              loadScore();
            } catch (e) {
              toast.error(e.response?.data?.detail || 'Could not delete');
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
