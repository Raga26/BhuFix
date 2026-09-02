import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { CloseButton } from '../CloseButton';
import { href } from '../../../lib/href';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

const STAGES = [
  ['requirement', 'Requirement'],
  ['sitemap', 'Sitemap'],
  ['wireframe', 'Wireframe'],
  ['ui', 'UI'],
  ['dev', 'Dev'],
  ['staging', 'Staging'],
  ['qa', 'QA'],
  ['client_review', 'Client review'],
  ['deployed', 'Deployed'],
  ['maintenance', 'Maintenance'],
];
const BUG_STATUSES = [['open', 'Open'], ['in_progress', 'In progress'], ['fixed', 'Fixed'], ['verified', 'Verified']];

const stageLabel = (s) => (STAGES.find(([k]) => k === s)?.[1] || s);

export default function WebView() {
  const { user } = useAuth();
  const canWrite = can(user, 'web.write');
  const clientUser = user?.role === 'client';
  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [modal, setModal] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [form, setForm] = useState({ client_id: '', name: '', production_url: '', staging_url: '', stage: 'requirement' });

  const load = useCallback(() => {
    apiClient.get('/web/sites').then((r) => setSites(r.data || [])).catch(() => toast.error('Could not load sites'));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!clientUser) {
      apiClient.get('/clients').then((r) => {
        const list = r.data || [];
        setClients(list);
        setForm((f) => ({ ...f, client_id: f.client_id || list[0]?.id || '' }));
      }).catch(() => {});
    }
  }, [clientUser]);

  useEffect(() => {
    if (!open || clientUser) { setBugs([]); return; }
    apiClient.get('/web/bugs', { params: { site_id: open.id } }).then((r) => setBugs(r.data || [])).catch(() => setBugs([]));
  }, [open, clientUser]);

  const saveSite = async () => {
    if (!form.client_id || !form.name) { toast.error('Client and name are required'); return; }
    try {
      await apiClient.post('/web/sites', form);
      toast.success('Site added');
      setModal(false);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not save'));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">{clientUser ? 'Your site' : 'Web'}</h1>
          <p className="dash-sub">{clientUser ? 'Where your site is in the build, and when it is live.' : 'Requirement → deploy. Bugs stay internal. Client review is a real yes/no from the client.'}</p>
        </div>
        {canWrite && (
          <button type="button" className="dash-btn dash-btn-primary self-start min-h-[44px]" onClick={() => {
            if (!clients.length) { toast.error('No clients assigned to you yet'); return; }
            setOpen(null);
            setModal(true);
          }}>
            <Plus size={14} /> Add site
          </button>
        )}
      </div>

      <div className="dash-card divide-y divide-white/[0.04]">
        {sites.length === 0 ? (
          <p className="text-white/35 text-sm p-5">No sites yet.</p>
        ) : sites.map((s) => (
          <button key={s.id} type="button" className="w-full text-left px-4 py-3.5 min-h-[52px]" onClick={() => setOpen(s)}>
            <div className="text-white text-sm">{s.name}</div>
            <div className="text-white/40 text-xs mt-0.5">{stageLabel(s.stage)}{s.production_url ? ` · ${s.production_url}` : ''}</div>
          </button>
        ))}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.name}</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            {open.production_url && <a className="text-[#E8734A] text-xs break-all" href={href(open.production_url)} target="_blank" rel="noreferrer">{open.production_url}</a>}
            {open.staging_url && <p className="text-white/35 text-xs mt-1 break-all">Staging: {open.staging_url}</p>}
            <p className="text-white/50 text-sm mt-3">{stageLabel(open.stage)}</p>
            {open.client_decision === 'approved' && (
              <p className="text-[#34D399] text-xs mt-2">Client approved — staff deploys when it is live.</p>
            )}
            {open.client_decision === 'changes' && (
              <p className="text-[#FB923C] text-xs mt-2">Client asked for changes. Back in QA.</p>
            )}

            {clientUser && open.stage === 'client_review' && open.client_decision !== 'approved' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button type="button" className="dash-btn dash-btn-ghost flex-1 min-h-[44px]" onClick={async () => {
                  try {
                    const r = await apiClient.post(`/web/sites/${open.id}/client-decide`, { action: 'changes' });
                    toast.success('Sent back to QA');
                    setOpen(r.data);
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not send')); }
                }}>Changes</button>
                <button type="button" className="dash-btn dash-btn-primary flex-[2] min-h-[44px]" onClick={async () => {
                  try {
                    const r = await apiClient.post(`/web/sites/${open.id}/client-decide`, { action: 'approve' });
                    toast.success('Approved — ready for the studio to deploy');
                    setOpen(r.data);
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not approve')); }
                }}>Approve this version</button>
              </div>
            )}

            {canWrite && (
              <div className="mt-4 space-y-3">
                <select className={inputCls} value={open.stage} onChange={async (e) => {
                  try {
                    const r = await apiClient.patch(`/web/sites/${open.id}`, { stage: e.target.value });
                    setOpen(r.data);
                    load();
                  } catch (err) { toast.error(apiError(err, 'Could not move stage')); }
                }}>
                  {STAGES.map(([v, l]) => <option key={v} value={v} style={optStyle}>{l}</option>)}
                </select>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className={inputCls} placeholder="New bug" value={bugTitle} onChange={(e) => setBugTitle(e.target.value)} />
                  <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={async () => {
                    if (!bugTitle.trim()) return;
                    try {
                      await apiClient.post('/web/bugs', { site_id: open.id, title: bugTitle, environment: open.stage === 'deployed' ? 'production' : 'staging' });
                      setBugTitle('');
                      const r = await apiClient.get('/web/bugs', { params: { site_id: open.id } });
                      setBugs(r.data || []);
                    } catch (err) { toast.error(apiError(err, 'Could not add bug')); }
                  }}>Add</button>
                </div>
                {bugs.map((b) => (
                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-white/[0.04]">
                    <div className="flex-1 min-w-0 text-white text-sm">{b.title} · {b.environment}</div>
                    <select className={inputCls + ' w-full sm:max-w-xs'} value={b.status} onChange={async (e) => {
                      try {
                        await apiClient.patch(`/web/bugs/${b.id}`, { status: e.target.value });
                        setBugs((list) => list.map((x) => (x.id === b.id ? { ...x, status: e.target.value } : x)));
                      } catch (err) { toast.error(apiError(err, 'Could not update')); }
                    }}>
                      {BUG_STATUSES.map(([v, l]) => <option key={v} value={v} style={optStyle}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <button type="button" className="dash-btn dash-btn-danger min-h-[44px]" onClick={async () => {
                  try {
                    await apiClient.delete(`/web/sites/${open.id}`);
                    setOpen(null);
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not delete')); }
                }}>Delete site</button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">Add site</h2>
              <CloseButton onClick={() => setModal(false)} />
            </div>
            <div className="space-y-3">
              <select className={inputCls} value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                {!clients.length && <option value="" style={optStyle}>No clients assigned</option>}
                {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
              </select>
              <input className={inputCls} placeholder="Site name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <input className={inputCls} placeholder="Production URL" value={form.production_url} onChange={(e) => setForm((f) => ({ ...f, production_url: e.target.value }))} />
              <input className={inputCls} placeholder="Staging URL" value={form.staging_url} onChange={(e) => setForm((f) => ({ ...f, staging_url: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" className="dash-btn dash-btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
              <button type="button" className="dash-btn dash-btn-primary flex-[2]" onClick={saveSite}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
