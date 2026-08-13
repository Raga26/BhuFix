import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const emptyMonth = (month, year) => ({
  client_id: '',
  month,
  year,
  target_videos: 0,
  target_posters: 0,
  target_youtube: 0,
  posted_videos: 0,
  posted_posters: 0,
  posted_youtube: 0,
  video_dates: [],
  poster_dates: [],
  youtube_dates: [],
  completed: false,
  notes: '',
});

function ProgressPill({ posted, target }) {
  const t = Number(target) || 0;
  const p = Number(posted) || 0;
  const done = t > 0 && p >= t;
  const pct = t > 0 ? Math.min(100, Math.round((p / t) * 100)) : (p > 0 ? 100 : 0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: done ? '#34D399' : '#E8734A' }}
        />
      </div>
      <span className={`text-[11px] font-semibold tabular-nums ${done ? 'text-emerald-400' : 'text-white/50'}`}>
        {p}/{t || '—'}
      </span>
    </div>
  );
}

function formatDisplayDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PostItemList({ items, onChange, canEdit, singular, target }) {
  const [draft, setDraft] = useState('');
  const posted = items.length;
  const goal = Number(target) || 0;
  const done = goal > 0 && posted >= goal;

  const addItem = () => {
    if (!draft) return;
    onChange([...items, draft].sort());
    setDraft('');
  };

  const updateItem = (index, value) => {
    if (!value) return;
    const next = items.map((item, i) => (i === index ? value : item));
    onChange(next.sort());
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-white/70 text-sm font-semibold">{singular}s</div>
          <div className="text-white/30 text-[11px] mt-0.5">
            Each {singular.toLowerCase()} is logged as its own entry with a post date
          </div>
        </div>
        <span className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-lg ${
          done
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
            : 'bg-white/[0.05] text-white/50 border border-white/[0.08]'
        }`}>
          {posted}/{goal || '—'}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-3 py-4 text-center text-white/25 text-xs">
            No {singular.toLowerCase()}s added yet
          </div>
        ) : (
          items.map((date, index) => (
            <div
              key={`${date}-${index}`}
              className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E8734A]/15 text-[#E8734A] text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">
                  {singular} {index + 1}
                </div>
                {canEdit ? (
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => updateItem(index, e.target.value)}
                    className="w-full bg-transparent text-white text-sm outline-none"
                  />
                ) : (
                  <div className="text-white text-sm">{formatDisplayDate(date)}</div>
                )}
              </div>
              {!canEdit && (
                <div className="text-white/40 text-xs hidden sm:block">{date}</div>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="h-8 px-2.5 rounded-lg text-[11px] text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title={`Remove ${singular.toLowerCase()} ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#E8734A]/50 transition-colors"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft}
            className="h-9 px-3 rounded-xl bg-[#E8734A]/15 border border-[#E8734A]/30 text-xs text-[#E8734A] font-semibold hover:bg-[#E8734A]/25 disabled:opacity-40 transition-all whitespace-nowrap"
          >
            + Add {singular.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}

function MonthCard({ report, canEdit, onSave, onDelete, defaultOpen = false }) {
  const [form, setForm] = useState(report);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v) || 0);

  useEffect(() => { setForm(report); }, [report]);

  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  const videoDates = form.video_dates || [];
  const posterDates = form.poster_dates || [];
  const youtubeDates = form.youtube_dates || [];
  const postedVideos = videoDates.length;
  const postedPosters = posterDates.length;
  const postedYoutube = youtubeDates.length;

  const hasTargets = (Number(form.target_videos) + Number(form.target_posters) + Number(form.target_youtube)) > 0;
  const allDone = form.completed || (hasTargets &&
    postedVideos >= (Number(form.target_videos) || 0) &&
    postedPosters >= (Number(form.target_posters) || 0) &&
    postedYoutube >= (Number(form.target_youtube) || 0));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_videos: toNum(form.target_videos),
        target_posters: toNum(form.target_posters),
        target_youtube: toNum(form.target_youtube),
        posted_videos: videoDates.length,
        posted_posters: posterDates.length,
        posted_youtube: youtubeDates.length,
        video_dates: videoDates,
        poster_dates: posterDates,
        youtube_dates: youtubeDates,
      };
      await onSave(payload);
      toast.success(`${MONTHS[form.month - 1]} ${form.year} saved`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save month');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-bold text-sm">{MONTHS[form.month - 1]} {form.year}</span>
            {form.id ? (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                allDone
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-[#E8734A]/15 text-[#E8734A] border border-[#E8734A]/25'
              }`}>
                {allDone ? 'Completed' : 'In progress'}
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.08]">
                Not started
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-white/30 text-[10px] mb-1">Videos</div>
              <ProgressPill posted={postedVideos} target={form.target_videos} />
            </div>
            <div>
              <div className="text-white/30 text-[10px] mb-1">Posters</div>
              <ProgressPill posted={postedPosters} target={form.target_posters} />
            </div>
            <div>
              <div className="text-white/30 text-[10px] mb-1">YouTube</div>
              <ProgressPill posted={postedYoutube} target={form.target_youtube} />
            </div>
          </div>
        </div>
        <span className={`text-white/30 text-lg transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-5 py-5 space-y-6">
          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Monthly targets</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'target_videos', label: 'Videos' },
                { key: 'target_posters', label: 'Posters' },
                { key: 'target_youtube', label: 'YouTube' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">{f.label}</label>
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    disabled={!canEdit}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value === '' ? '' : +e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Delivered / posted</div>
            <div className="space-y-3">
              <PostItemList
                singular="Video"
                items={videoDates}
                target={form.target_videos}
                canEdit={canEdit}
                onChange={(dates) => set('video_dates', dates)}
              />
              <PostItemList
                singular="Poster"
                items={posterDates}
                target={form.target_posters}
                canEdit={canEdit}
                onChange={(dates) => set('poster_dates', dates)}
              />
              <PostItemList
                singular="YouTube"
                items={youtubeDates}
                target={form.target_youtube}
                canEdit={canEdit}
                onChange={(dates) => set('youtube_dates', dates)}
              />
            </div>
          </div>

          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Notes</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              disabled={!canEdit}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Anything to note for this month…"
            />
          </div>

          {canEdit && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.completed}
                  onChange={(e) => set('completed', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#E8734A]"
                />
                <span className="text-sm text-white/70">Mark month as completed</span>
              </label>
              <div className="flex gap-2">
                {form.id && (
                  <button
                    type="button"
                    onClick={() => onDelete(form)}
                    className="h-9 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/40 hover:bg-red-600/15 hover:border-red-600/30 hover:text-red-400 transition-all"
                  >
                    Clear month
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="dash-btn dash-btn-primary dash-btn-sm"
                >
                  {saving ? 'Saving…' : 'Save month'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MonthGroup({ title, subtitle, open, onToggle, children, count }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div>
          <div className="text-white/70 text-sm font-semibold">{title}</div>
          <div className="text-white/30 text-xs mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/40 border border-white/[0.08]">
            {count} · {open ? 'Hide' : 'Show'}
          </span>
          <span className={`text-white/30 text-lg transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-white/[0.06] p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PostReportView() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'employee';

  const [client, setClient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  const now = useMemo(() => {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/clients'),
      apiClient.get('/post-reports', { params: { client_id: clientId } }),
    ]).then(([clientsRes, reportsRes]) => {
      const found = (clientsRes.data || []).find((c) => c.id === clientId) || null;
      setClient(found);
      setReports(reportsRes.data || []);
      logger.info('Post reports loaded', { clientId, count: reportsRes.data?.length || 0 });
    }).catch((e) => {
      logger.error('Failed to load post reports', { error: e.message });
      toast.error('Failed to load post report');
    }).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const existing = reports.find((r) => r.month === month && r.year === year);
      return existing
        ? { ...existing }
        : { ...emptyMonth(month, year), client_id: clientId };
    });
  }, [reports, year, clientId]);

  const { archivedMonths, currentMonth, upcomingMonths } = useMemo(() => {
    const archived = [];
    const upcoming = [];
    let current = null;
    months.forEach((m) => {
      if (m.year === now.year && m.month === now.month) {
        current = m;
      } else if (m.year < now.year || (m.year === now.year && m.month < now.month)) {
        archived.push(m);
      } else {
        upcoming.push(m);
      }
    });
    return { archivedMonths: archived, currentMonth: current, upcomingMonths: upcoming };
  }, [months, now]);

  useEffect(() => {
    // Auto-open the only available group when browsing other years
    setArchiveOpen(year < now.year);
    setUpcomingOpen(year > now.year);
  }, [year, now.year]);

  const handleSave = async (payload) => {
    const saved = await apiClient.put('/post-reports', { ...payload, client_id: clientId });
    logger.success('Post report saved', { clientId, month: payload.month, year: payload.year });
    setReports((prev) => {
      const others = prev.filter((r) => !(r.month === payload.month && r.year === payload.year));
      return [...others, saved.data];
    });
  };

  const handleDelete = async (report) => {
    if (!report.id) return;
    try {
      await apiClient.delete(`/post-reports/${report.id}`);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success(`${MONTHS[report.month - 1]} cleared`);
      logger.success('Post report cleared', { reportId: report.id });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to clear month');
    }
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set(reports.map((r) => r.year));
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [reports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 mb-4">Client not found.</p>
        <button
          onClick={() => navigate('/dashboard/clients')}
          className="text-[#E8734A] text-sm hover:underline"
        >
          ← Back to clients
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
        <div>
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="text-white/40 text-xs hover:text-[#E8734A] transition-colors mb-3 inline-flex items-center gap-1"
          >
            ← Clients
          </button>
          <h1 className="dash-title">Post report</h1>
          <p className="dash-sub">
            Monthly delivery for <span className="text-white/70">{client.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-white/40 text-xs uppercase tracking-widest">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#E8734A]/40 transition-colors"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} style={{ background: '#0D0E1A' }}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {archivedMonths.length > 0 && (
          <MonthGroup
            title="Archived months"
            subtitle={`${archivedMonths.length} past month${archivedMonths.length === 1 ? '' : 's'}`}
            count={archivedMonths.length}
            open={archiveOpen}
            onToggle={() => setArchiveOpen((o) => !o)}
          >
            {archivedMonths.map((m) => (
              <MonthCard
                key={`${m.year}-${m.month}`}
                report={m}
                canEdit={canEdit}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </MonthGroup>
        )}

        {currentMonth && (
          <MonthCard
            key={`${currentMonth.year}-${currentMonth.month}`}
            report={currentMonth}
            canEdit={canEdit}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}

        {upcomingMonths.length > 0 && (
          <MonthGroup
            title="Upcoming months"
            subtitle={`${upcomingMonths.length} month${upcomingMonths.length === 1 ? '' : 's'} ahead`}
            count={upcomingMonths.length}
            open={upcomingOpen}
            onToggle={() => setUpcomingOpen((o) => !o)}
          >
            {upcomingMonths.map((m) => (
              <MonthCard
                key={`${m.year}-${m.month}`}
                report={m}
                canEdit={canEdit}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </MonthGroup>
        )}
      </div>
    </div>
  );
}
