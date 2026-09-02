import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, isCreative, canReview } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import EditorHomeView from './EditorHomeView';
import ClientHomeView from './ClientHomeView';
import { ClientMark } from '../ClientMark';
import { NotesDialog } from '../NotesDialog';

function StatCard({ value, label }) {
  return (
    <div className="dash-card p-5">
      <div className="font-anchor italic text-[1.65rem] text-white leading-none mb-2">{value}</div>
      <div className="text-white/40 text-[12px]">{label}</div>
    </div>
  );
}

function RecentClientRow({ client }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
        <ClientMark client={client} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{client.name}</div>
        <div className="text-white/40 text-xs">{client.industry}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-white">{client.followers}</div>
        <div className="text-white/30 text-[10px]">followers</div>
      </div>
    </div>
  );
}

export default function OverviewView() {
  const { user } = useAuth();
  if (user?.role === 'client') {
    return <ClientHomeView />;
  }
  if (isCreative(user)) {
    return <EditorHomeView />;
  }
  return <AgencyOverviewView user={user} />;
}

function AgencyOverviewView({ user }) {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [tracker, setTracker] = useState(null);
  const [changeId, setChangeId] = useState(null);
  const reviewer = canReview(user);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    apiClient.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    if (user?.role !== 'client') {
      apiClient.get('/clients').then((r) => setClients(r.data?.slice(0, 4) || [])).catch(() => {});
      apiClient.get('/tracker/month').then((r) => setTracker(r.data)).catch(() => {});
    }
    if (canReview(user)) {
      apiClient.get('/approvals', { params: { status: 'pending' } }).then((r) => setQueue(r.data || [])).catch(() => {});
    }
  }, [user]);

  const decide = async (id, action, notes = '') => {
    try {
      await apiClient.post(`/approvals/${id}/decide`, { action, notes: notes || '' });
      toast.success(action === 'approve' ? 'Locked this version' : 'Changes requested');
      apiClient.get('/approvals', { params: { status: 'pending' } }).then((r) => setQueue(r.data || [])).catch(() => {});
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  const fmt = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="dash-sub">Here’s what’s moving today.</p>
        </div>
        {can(user, 'clients.write') && (
          <Link to="/dashboard/clients" className="dash-btn dash-btn-primary self-start">
            <Plus size={14} strokeWidth={2} />
            Add client
          </Link>
        )}
      </div>

      {user?.role !== 'client' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard value={stats.total_clients} label="Active clients" />
          <StatCard value={stats.total_reels} label="Reels delivered" />
          <StatCard value={fmt(stats.total_ad_spent)} label="Ad spend" />
          <StatCard value={stats.open_tasks ?? 0} label="Open tasks" />
        </div>
      )}

      {tracker && user?.role !== 'client' && (
        <div className="dash-card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium text-sm">This month</div>
            <Link to="/dashboard/calendar" className="text-[#E8734A] text-xs">Calendar</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-white text-lg">{tracker.calendar?.planned ?? 0}</div><div className="text-white/35 text-xs">Planned</div></div>
            <div><div className="text-white text-lg">{tracker.calendar?.in_production ?? 0}</div><div className="text-white/35 text-xs">In production</div></div>
            <div><div className="text-white text-lg">{tracker.calendar?.published ?? 0}</div><div className="text-white/35 text-xs">Published</div></div>
            <div><div className="text-white text-lg">{tracker.calendar?.on_time_pct != null ? `${tracker.calendar.on_time_pct}%` : '—'}</div><div className="text-white/35 text-xs">On-time of published{tracker.calendar?.late ? ` · ${tracker.calendar.late} late` : ''}</div></div>
          </div>
          <div className="text-white/35 text-xs mt-3">Approvals {tracker.approvals?.pending ?? 0} pending · {tracker.approvals?.approved ?? 0} locked</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-white/40">
            {['idea', 'writing', 'editing', 'review', 'approved', 'scheduled', 'published', 'postponed'].map((k) => (
              <span key={k} className="capitalize">{k.replace('_', ' ')} {tracker.calendar?.[k] ?? 0}</span>
            ))}
          </div>
        </div>
      )}

      {reviewer && (
        <div className="dash-card p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium text-sm">Review queue</div>
            <Link to="/dashboard/clip" className="text-[#E8734A] text-xs">Clip</Link>
          </div>
          {queue.length === 0 ? (
            <p className="text-white/35 text-sm">Nothing waiting.</p>
          ) : queue.slice(0, 8).map((a) => (
            <div key={a.id} className="py-2 border-b border-white/[0.04] last:border-0">
              <div className="text-white text-sm">{a.type} {a.version_label} · pending</div>
              <div className="flex gap-1.5 mt-1.5">
                <button className="dash-btn dash-btn-primary dash-btn-sm" onClick={() => decide(a.id, 'approve')}>Approve</button>
                <button className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setChangeId(a.id)}>Changes</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role !== 'client' && clients.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="dash-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-medium text-sm">Recent clients</div>
              <Link to="/dashboard/clients" className="text-[#E8734A] text-xs hover:text-[#F08A66]">View all</Link>
            </div>
            {clients.map((c) => <RecentClientRow key={c.id} client={c} />)}
          </div>

          <div className="dash-card p-5">
            <div className="text-white font-medium text-sm mb-4">Best posting times (IST)</div>
            {[
              { time: '7:00 AM', label: 'Morning peak', score: 5, best: true },
              { time: '12:30 PM', label: 'Lunch break', score: 4 },
              { time: '7:30 PM', label: 'Evening scroll', score: 5, best: true },
              { time: '10:00 PM', label: 'Late night — niche', score: 2 },
            ].map((slot) => (
              <div key={slot.time} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="font-medium text-sm min-w-[70px] text-white">{slot.time}</div>
                <div className="flex-1 text-white/40 text-xs">{slot.label}</div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < slot.score ? '#E8734A' : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                {slot.best && <span className="text-[10px] text-coral font-medium">Best</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'client' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="dash-card p-6">
            <div className="text-white font-medium mb-2">Your content calendar</div>
            <div className="text-white/40 text-sm mb-5">Scheduled posts and what’s coming next.</div>
            <Link to="/dashboard/calendar" className="dash-btn dash-btn-ghost">
              Open calendar
            </Link>
          </div>
          <div className="dash-card p-6">
            <div className="text-white font-medium mb-2">Chat</div>
            <div className="text-white/40 text-sm mb-5">Message the BhuFix team or anyone else.</div>
            <Link to="/dashboard/chat" className="dash-btn dash-btn-ghost">
              Open chat
            </Link>
          </div>
        </div>
      )}
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
