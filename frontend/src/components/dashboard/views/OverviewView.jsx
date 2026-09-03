import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, canReview, jobLabel, deskKind } from '../../../lib/access';
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

function greetingFor() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function money(n) {
  const v = Number(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export default function OverviewView() {
  const { user } = useAuth();
  const desk = deskKind(user);
  if (desk === 'client') return <ClientHomeView />;
  if (desk === 'creative') return <EditorHomeView />;
  if (desk === 'tech') return <TechDeskView user={user} />;
  if (desk === 'ads' || desk === 'smm' || desk === 'seo' || desk === 'analyst') {
    return <MarketingDeskView user={user} desk={desk} />;
  }
  if (desk === 'ops' || desk === 'staff') return <OpsDeskView user={user} />;
  return <AgencyOverviewView user={user} />;
}

function useDeskData(user, { tracker = false, queue = false } = {}) {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [month, setMonth] = useState(null);
  const [changeId, setChangeId] = useState(null);

  useEffect(() => {
    apiClient.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    apiClient.get('/clients').then((r) => setClients(r.data?.slice(0, 4) || [])).catch(() => {});
    if (tracker) {
      apiClient.get('/tracker/month').then((r) => setMonth(r.data)).catch(() => {});
    }
    if (queue && canReview(user)) {
      apiClient.get('/approvals', { params: { status: 'pending' } }).then((r) => setReviewQueue(r.data || [])).catch(() => {});
    }
  }, [user, tracker, queue]);

  const decide = async (id, action, notes = '') => {
    try {
      await apiClient.post(`/approvals/${id}/decide`, { action, notes: notes || '' });
      toast.success(action === 'approve' ? 'Locked this version' : 'Changes requested');
      apiClient.get('/approvals', { params: { status: 'pending' } }).then((r) => setReviewQueue(r.data || [])).catch(() => {});
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  return { stats, clients, reviewQueue, month, changeId, setChangeId, decide };
}

function Greeting({ user, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="dash-title">{greetingFor()}, {user?.name?.split(' ')[0]}</h1>
      <p className="dash-sub">{subtitle}</p>
    </div>
  );
}

function Shortcut({ to, title, body }) {
  return (
    <Link to={to} className="dash-card p-5 block hover:bg-white/[0.03] transition-colors">
      <div className="text-white font-medium text-sm mb-1">{title}</div>
      <div className="text-white/40 text-xs">{body}</div>
    </Link>
  );
}

function ClientsCard({ clients }) {
  if (!clients.length) return null;
  return (
    <div className="dash-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-medium text-sm">Your clients</div>
        <Link to="/dashboard/clients" className="text-[#E8734A] text-xs hover:text-[#F08A66]">View all</Link>
      </div>
      {clients.map((c) => <RecentClientRow key={c.id} client={c} />)}
    </div>
  );
}

function MonthCard({ tracker }) {
  if (!tracker) return null;
  return (
    <div className="dash-card p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-medium text-sm">This month</div>
        <Link to="/dashboard/calendar" className="text-[#E8734A] text-xs">Calendar</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><div className="text-white text-lg">{tracker.calendar?.planned ?? 0}</div><div className="text-white/35 text-xs">Planned</div></div>
        <div><div className="text-white text-lg">{tracker.calendar?.in_production ?? 0}</div><div className="text-white/35 text-xs">In production</div></div>
        <div><div className="text-white text-lg">{tracker.calendar?.published ?? 0}</div><div className="text-white/35 text-xs">Published</div></div>
        <div><div className="text-white text-lg">{tracker.calendar?.on_time_pct != null ? `${tracker.calendar.on_time_pct}%` : '—'}</div><div className="text-white/35 text-xs">On-time{tracker.calendar?.late ? ` · ${tracker.calendar.late} late` : ''}</div></div>
      </div>
    </div>
  );
}

function ReviewCard({ queue, setChangeId, decide }) {
  return (
    <div className="dash-card p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-medium text-sm">Review queue</div>
        <Link to="/dashboard/approvals" className="text-[#E8734A] text-xs">Approvals</Link>
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
  );
}

function ChangeNotes({ changeId, setChangeId, decide }) {
  if (!changeId) return null;
  return (
    <NotesDialog
      title="Request changes"
      label="What should change?"
      confirmLabel="Send"
      onClose={() => setChangeId(null)}
      onConfirm={(notes) => { const id = changeId; setChangeId(null); decide(id, 'changes_requested', notes); }}
    />
  );
}

function TechDeskView({ user }) {
  const { stats, clients } = useDeskData(user);
  return (
    <div>
      <Greeting user={user} subtitle={`${jobLabel(user)} desk — sites, tasks, and the clients you build for.`} />
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard value={stats.open_tasks ?? 0} label="Open tasks" />
          <StatCard value={stats.total_clients ?? clients.length} label="Assigned clients" />
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Shortcut to="/dashboard/web" title="Web" body="Pipeline, stages, and what to ship next." />
        {can(user, 'seo.read') && (
          <Shortcut to="/dashboard/seo" title="SEO" body="Rank work that needs a site change." />
        )}
        <Shortcut to="/dashboard/tasks" title="Tasks" body="Tickets assigned to you." />
        <Shortcut to="/dashboard/chat" title="Chat" body="Talk to the client or the team." />
      </div>
      <ClientsCard clients={clients} />
    </div>
  );
}

function MarketingDeskView({ user, desk }) {
  const showSpend = desk === 'ads' || desk === 'analyst';
  const showMonth = desk === 'smm' || desk === 'seo';
  const { stats, clients, month } = useDeskData(user, { tracker: showMonth });
  const copy = {
    ads: 'Campaigns, spend, and the clients you run ads for.',
    smm: 'Calendar, publishing, and what is due this month.',
    seo: 'Rankings, site work, and SEO tasks.',
    analyst: 'Performance, KPIs, and what the numbers are saying.',
  };
  return (
    <div>
      <Greeting user={user} subtitle={`${jobLabel(user)} desk — ${copy[desk] || 'Your work for today.'}`} />
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <StatCard value={stats.open_tasks ?? 0} label="Open tasks" />
          <StatCard value={stats.total_clients ?? clients.length} label="Clients" />
          {showSpend && <StatCard value={money(stats.total_ad_spent)} label="Ad spend" />}
          {desk === 'smm' && <StatCard value={stats.total_reels ?? 0} label="Reels delivered" />}
        </div>
      )}
      {showMonth && <MonthCard tracker={month} />}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {desk === 'ads' && (
          <>
            <Shortcut to="/dashboard/ads" title="Meta Ads" body="Campaigns, funnel, and A/B tests." />
            <Shortcut to="/dashboard/performance" title="Performance" body="What the spend is returning." />
          </>
        )}
        {desk === 'smm' && (
          <>
            <Shortcut to="/dashboard/calendar" title="Calendar" body="Ideas through to published." />
            <Shortcut to="/dashboard/strategy" title="Strategy Hub" body="What this client is meant to post." />
          </>
        )}
        {desk === 'seo' && (
          <>
            <Shortcut to="/dashboard/seo" title="SEO" body="Keywords, ranks, and gaps." />
            <Shortcut to="/dashboard/web" title="Web" body="Pages that need to ship for SEO." />
          </>
        )}
        {desk === 'analyst' && (
          <>
            <Shortcut to="/dashboard/insights" title="Insights" body="What needs a look today." />
            <Shortcut to="/dashboard/kpis" title="KPI Tracker" body="The numbers the team is held to." />
          </>
        )}
        <Shortcut to="/dashboard/tasks" title="Tasks" body="Work on your plate." />
        <Shortcut to="/dashboard/chat" title="Chat" body="Clients and the rest of the desk." />
      </div>
      <ClientsCard clients={clients} />
    </div>
  );
}

function OpsDeskView({ user }) {
  const { stats, clients, reviewQueue, month, changeId, setChangeId, decide } = useDeskData(user, { tracker: can(user, 'calendar.read'), queue: true });
  return (
    <div>
      <Greeting user={user} subtitle={`${jobLabel(user)} desk — clients, tasks, and keeping work moving.`} />
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard value={stats.open_tasks ?? 0} label="Open tasks" />
          <StatCard value={stats.total_clients ?? clients.length} label="Clients" />
        </div>
      )}
      <MonthCard tracker={month} />
      {canReview(user) && <ReviewCard queue={reviewQueue} setChangeId={setChangeId} decide={decide} />}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Shortcut to="/dashboard/tasks" title="Tasks" body="What is open across your clients." />
        <Shortcut to="/dashboard/clients" title="Clients" body="Who you are assigned to." />
      </div>
      <ClientsCard clients={clients} />
      <ChangeNotes changeId={changeId} setChangeId={setChangeId} decide={decide} />
    </div>
  );
}

function AgencyOverviewView({ user }) {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [tracker, setTracker] = useState(null);
  const [changeId, setChangeId] = useState(null);
  const reviewer = canReview(user);
  const greeting = greetingFor();

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="dash-sub">Agency snapshot — clients, spend, content, and open work.</p>
        </div>
        {can(user, 'clients.write') && (
          <Link to="/dashboard/clients" className="dash-btn dash-btn-primary self-start">
            <Plus size={14} strokeWidth={2} />
            Add client
          </Link>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard value={stats.total_clients} label="Active clients" />
          <StatCard value={stats.total_reels} label="Reels delivered" />
          <StatCard value={money(stats.total_ad_spent)} label="Ad spend" />
          <StatCard value={stats.open_tasks ?? 0} label="Open tasks" />
        </div>
      )}

      {tracker && (
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
        </div>
      )}

      {reviewer && <ReviewCard queue={queue} setChangeId={setChangeId} decide={decide} />}
      <ClientsCard clients={clients} />
      <ChangeNotes changeId={changeId} setChangeId={setChangeId} decide={decide} />
    </div>
  );
}
