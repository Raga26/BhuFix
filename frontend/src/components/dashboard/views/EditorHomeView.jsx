import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { canReview } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { ClientMark } from '../ClientMark';
import { NotesDialog } from '../NotesDialog';

function Panel({ title, to, children }) {
  return (
    <div className="dash-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-medium text-sm">{title}</div>
        {to && <Link to={to} className="text-[#E8734A] text-xs">Open</Link>}
      </div>
      {children}
    </div>
  );
}

export default function EditorHomeView() {
  const { user } = useAuth();
  const reviewer = canReview(user);
  const [data, setData] = useState(null);
  const [changeId, setChangeId] = useState(null);
  const [tracker, setTracker] = useState(null);

  const load = () => {
    apiClient.get('/studio/home').then((r) => setData(r.data)).catch((e) => toast.error(apiError(e, 'Could not load studio')));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    apiClient.get('/tracker/month').then((r) => setTracker(r.data)).catch(() => {});
  }, []);

  const decide = async (id, action, notes = '') => {
    try {
      await apiClient.post(`/approvals/${id}/decide`, { action, notes: notes || '' });
      toast.success(action === 'approve' ? 'Locked this version' : 'Changes requested');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hours = data.hours || {};
  const perf = data.performance || {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="dash-title">Studio</h1>
        <p className="dash-sub">Cuts, deadlines, and your assigned clients — not ads or SEO.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="dash-card p-4 col-span-2 md:col-span-1">
          <div className="font-anchor italic text-2xl text-white">{hours.worked_hours ?? 0}h</div>
          <div className="text-white/40 text-xs mt-1">ClockIN this month</div>
          {hours.linked ? (
            <div className="text-white/30 text-[10px] mt-1">{hours.employee_name}</div>
          ) : (
            <div className="mt-2">
              <div className="text-white/35 text-[10px] mb-1">{hours.hint || 'Pick your ClockIN name'}</div>
              {(hours.candidates || []).length > 0 && (
                <select
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2 py-2 text-white text-base md:text-sm"
                  defaultValue=""
                  onChange={async (e) => {
                    const id = e.target.value;
                    if (!id) return;
                    try {
                      await apiClient.post('/studio/clockin-link', { employee_id: id });
                      toast.success('ClockIN linked');
                      load();
                    } catch (err) {
                      toast.error(apiError(err, 'Could not link ClockIN'));
                    }
                  }}
                >
                  <option value="">Your name on ClockIN…</option>
                  {hours.candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.employee_code ? ` · ${c.employee_code}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-2xl text-white">{perf.completed_month ?? 0}</div>
          <div className="text-white/40 text-xs mt-1">Tasks done this month</div>
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-2xl text-white">{perf.on_time_pct != null ? `${perf.on_time_pct}%` : '—'}</div>
          <div className="text-white/40 text-xs mt-1">On-time</div>
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-2xl text-white">{perf.approved_versions ?? 0}</div>
          <div className="text-white/40 text-xs mt-1">Approved versions</div>
        </div>
      </div>

      {tracker?.calendar && (
        <div className="dash-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium text-sm">This month</div>
            <Link to="/dashboard/calendar" className="text-[#E8734A] text-xs">Calendar</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-white text-lg">{tracker.calendar.planned ?? 0}</div><div className="text-white/35 text-xs">Planned</div></div>
            <div><div className="text-white text-lg">{tracker.calendar.in_production ?? 0}</div><div className="text-white/35 text-xs">In production</div></div>
            <div><div className="text-white text-lg">{tracker.calendar.published ?? 0}</div><div className="text-white/35 text-xs">Published</div></div>
            <div><div className="text-white text-lg">{tracker.calendar.on_time_pct != null ? `${tracker.calendar.on_time_pct}%` : '—'}</div><div className="text-white/35 text-xs">On-time of published{tracker.calendar.late ? ` · ${tracker.calendar.late} late` : ''}</div></div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="My clients" to="/dashboard/clients">
          {(data.clients || []).length === 0 ? (
            <p className="text-white/35 text-sm">None assigned yet.</p>
          ) : (data.clients || []).slice(0, 6).map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b border-white/[0.04] last:border-0">
              <ClientMark client={c} size={28} />
              <span className="text-white text-sm truncate">{c.name}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Deadlines" to="/dashboard/tasks">
          {(data.deadlines || []).length === 0 ? (
            <p className="text-white/35 text-sm">No open work.</p>
          ) : data.deadlines.slice(0, 6).map((t) => (
            <div key={t.id} className="py-2 border-b border-white/[0.04] last:border-0">
              <div className="text-white text-sm truncate">{t.title}</div>
              <div className="text-white/35 text-xs">{t.deadline || 'No date'} · {t.status}</div>
            </div>
          ))}
        </Panel>

        <Panel title={reviewer ? 'Review queue' : 'My submissions'}>
          {(data.review_queue || []).length === 0 ? (
            <p className="text-white/35 text-sm">Nothing waiting.</p>
          ) : data.review_queue.slice(0, 8).map((a) => (
            <div key={a.id} className="py-2 border-b border-white/[0.04] last:border-0">
              <div className="text-white text-sm">{a.type} {a.version_label} · {a.status}</div>
              {reviewer && a.status === 'pending' && (
                <div className="flex gap-1.5 mt-1.5">
                  <button className="dash-btn dash-btn-primary dash-btn-sm" onClick={() => decide(a.id, 'approve')}>Approve</button>
                  <button className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setChangeId(a.id)}>Changes</button>
                </div>
              )}
            </div>
          ))}
        </Panel>

        <Panel title="This week" to="/dashboard/calendar">
          {(data.calendar || []).length === 0 ? (
            <p className="text-white/35 text-sm">No posts scheduled.</p>
          ) : data.calendar.slice(0, 6).map((e) => (
            <div key={e.id} className="py-2 border-b border-white/[0.04] last:border-0">
              <div className="text-white text-sm truncate">{e.title}</div>
              <div className="text-white/35 text-xs">{e.date} {e.time || ''}</div>
            </div>
          ))}
        </Panel>

        <Panel title="My videos" to="/dashboard/drive">
          {(data.videos || []).length === 0 ? (
            <p className="text-white/35 text-sm">Upload cuts under Assets. Same filename = v2, v3…</p>
          ) : data.videos.slice(0, 5).map((v) => (
            <div key={v.id} className="text-white/70 text-sm py-1.5 truncate">{v.filename} · {v.label}{v.locked ? ' · locked' : ''}</div>
          ))}
        </Panel>

        <Panel title="Team chat" to="/dashboard/chat">
          <p className="text-white/40 text-sm mb-3">Creative channel is automatic. Client DMs are open if you are on that client.</p>
          <Link to="/dashboard/clip" className="dash-btn dash-btn-primary">BhuFix Clip</Link>
        </Panel>
      </div>
      {changeId && (
        <NotesDialog
          title="Request changes"
          label="What should change?"
          confirmLabel="Send"
          onClose={() => setChangeId(null)}
          onConfirm={(notes) => { const id = changeId; setChangeId(null); decide(id, 'changes_requested', notes); }}
        />
      )}
    </div>
  );
}
