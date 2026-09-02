import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { CloseButton } from '../CloseButton';
import { NotesDialog } from '../NotesDialog';

export default function ApprovalsView() {
  const { user } = useAuth();
  const clientUser = user?.role === 'client';
  const canPresent = can(user, 'approvals.write');
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState(clientUser ? 'waiting' : 'mine');
  const [open, setOpen] = useState(null);
  const [changeId, setChangeId] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    const params = {};
    if (clientUser) {
      /* client payload is already audience=client */
    } else if (tab === 'client') {
      params.audience = 'client';
    } else if (tab === 'ready') {
      params.status = 'approved';
    } else {
      params.status = 'pending';
    }
    apiClient.get('/approvals', { params }).then((r) => setRows(r.data || [])).catch(() => toast.error('Could not load approvals'));
  }, [clientUser, tab]);

  useEffect(() => { load(); }, [load]);

  const visible = clientUser
    ? rows.filter((a) => (tab === 'waiting' ? a.status === 'pending' : a.status !== 'pending'))
    : rows;

  const decideClient = async (id, action, notes = '') => {
    try {
      await apiClient.post(`/approvals/${id}/client-decide`, { action, notes });
      toast.success(action === 'approve' ? 'Version approved' : 'Changes sent');
      setOpen(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  const sendToClient = async (row) => {
    setSending(true);
    try {
      await apiClient.post('/approvals/present', { type: row.type, resource_id: row.resource_id });
      toast.success('Sent to the client');
      setOpen(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not send'));
    } finally {
      setSending(false);
    }
  };

  const staffTabs = [['mine', 'Internal'], ['ready', 'Ready to send'], ['client', 'With client']];
  const clientTabs = [['waiting', 'Waiting'], ['done', 'Decided']];

  return (
    <div>
      <div className="mb-6">
        <h1 className="dash-title">Approvals</h1>
        <p className="dash-sub">{clientUser ? 'Approve the exact version we sent you.' : 'Internal review, then send the locked version to the client.'}</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {(clientUser ? clientTabs : staffTabs).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 rounded-md text-sm whitespace-nowrap min-h-[40px] ${tab === id ? 'bg-white/[0.08] text-white' : 'text-white/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dash-card divide-y divide-white/[0.04]">
        {visible.length === 0 ? (
          <p className="text-white/35 text-sm p-5">Nothing here.</p>
        ) : visible.map((a) => (
          <button key={a.id} type="button" className="w-full text-left px-4 py-3.5 min-h-[52px]" onClick={() => setOpen(a)}>
            <div className="text-white text-sm">{a.type} · {a.version_label} · {String(a.status || '').replace(/_/g, ' ')}</div>
            <div className="text-white/40 text-xs mt-0.5 truncate">{(a.snapshot && (a.snapshot.title || a.snapshot.filename)) || 'Open to view this version'}</div>
          </button>
        ))}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">This version</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            <div className="text-white/50 text-xs mb-3">{open.type} · {open.version_label} · {String(open.status || '').replace(/_/g, ' ')}</div>
            {open.snapshot?.filename && (
              <div className="mb-3">
                <div className="text-white text-sm break-all">{open.snapshot.filename}</div>
                <Link to="/dashboard/drive" className="text-[#E8734A] text-xs mt-1 inline-block">Open in Files</Link>
              </div>
            )}
            {open.snapshot?.title && <div className="text-white font-medium mb-2">{open.snapshot.title}</div>}
            {open.snapshot?.hook && <p className="text-white/70 text-sm whitespace-pre-wrap mb-2">{open.snapshot.hook}</p>}
            {open.snapshot?.body && <p className="text-white/80 text-sm whitespace-pre-wrap mb-2">{open.snapshot.body}</p>}
            {open.snapshot?.cta && <p className="text-white/50 text-sm">CTA: {open.snapshot.cta}</p>}
            {(open.client_notes || []).map((n, i) => (
              <p key={i} className="text-xs text-white/45 mt-2 whitespace-pre-wrap">{n.text}</p>
            ))}
            {clientUser && open.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button type="button" className="dash-btn dash-btn-ghost flex-1 min-h-[44px]" onClick={() => setChangeId(open.id)}>Changes</button>
                <button type="button" className="dash-btn dash-btn-primary flex-[2] min-h-[44px]" onClick={() => decideClient(open.id, 'approve')}>Approve this version</button>
              </div>
            )}
            {!clientUser && canPresent && (open.audience || 'internal') !== 'client' && open.status === 'approved' && (
              <button
                type="button"
                disabled={sending}
                className="dash-btn dash-btn-primary w-full min-h-[44px] mt-4"
                onClick={() => sendToClient(open)}
              >Send to client</button>
            )}
          </div>
        </div>
      )}

      {changeId && (
        <NotesDialog
          title="Request changes"
          label="What should change on this version?"
          confirmLabel="Send"
          onClose={() => setChangeId(null)}
          onConfirm={(notes) => { const id = changeId; setChangeId(null); decideClient(id, 'changes_requested', notes); }}
        />
      )}
    </div>
  );
}
