import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { can } from '../../../lib/access';
import { useAuth } from '../../../context/AuthContext';
import { apiError } from '../../../utils/apiError';

export default function PublishQueueView() {
  const { user } = useAuth();
  const canWrite = can(user, 'calendar.write');
  const isClient = user?.role === 'client';
  const [rows, setRows] = useState([]);

  const load = useCallback(() => {
    if (isClient) return;
    apiClient.get('/publish-queue').then((r) => setRows(r.data || [])).catch(() => toast.error('Could not load queue'));
  }, [isClient]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    try {
      await apiClient.post(`/publish-queue/${id}`, { action });
      toast.success(action === 'publish' ? 'Marked published' : action === 'schedule' ? 'Scheduled' : 'Postponed');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not update'));
    }
  };

  if (isClient) {
    return <p className="text-white/40 text-sm">The publish queue is for the studio.</p>;
  }

  const overdue = rows.filter((e) => e.overdue);
  const rest = rows.filter((e) => !e.overdue);

  const Row = ({ ev }) => (
    <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm truncate">{ev.title}</div>
        <div className="text-white/40 text-xs">{ev.date}{ev.time ? ` · ${ev.time}` : ''} · {ev.client_name} · {ev.status}{ev.overdue ? ' · overdue' : ''}</div>
      </div>
      {canWrite && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-1.5 w-full sm:w-auto">
          {ev.status === 'approved' && (
            <button type="button" className="dash-btn dash-btn-ghost min-h-[44px] w-full sm:w-auto" onClick={() => act(ev.id, 'schedule')}>Schedule</button>
          )}
          <button type="button" className="dash-btn dash-btn-primary min-h-[44px] w-full sm:w-auto" onClick={() => act(ev.id, 'publish')}>Published</button>
          <button type="button" className="dash-btn dash-btn-ghost min-h-[44px] w-full sm:w-auto" onClick={() => {
            if (window.confirm('Postpone this post? You can pick a new date on the calendar.')) act(ev.id, 'postpone');
          }}>Postpone</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="dash-title">Publish queue</h1>
        <p className="dash-sub">Approved calendar posts waiting to go live. Mark published after you actually post.</p>
      </div>
      {rows.length === 0 ? (
        <div className="dash-card">
          <p className="text-white/35 text-sm p-5">Nothing approved to publish.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-[#FB923C] mb-2 px-1">Overdue</div>
              <div className="dash-card divide-y divide-white/[0.04]">
                {overdue.map((ev) => <Row key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div className="dash-card divide-y divide-white/[0.04]">
              {rest.map((ev) => <Row key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
