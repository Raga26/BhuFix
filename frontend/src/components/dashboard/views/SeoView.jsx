import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
const KINDS = [['keyword', 'Keyword'], ['page', 'Page'], ['audit', 'Audit']];
const STATUSES = [['research', 'Research'], ['tracking', 'Tracking'], ['improving', 'Improving'], ['done', 'Done']];

export default function SeoView() {
  const { user } = useAuth();
  const canWrite = can(user, 'seo.write');
  const clientUser = user?.role === 'client';
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [open, setOpen] = useState(null);
  const [modal, setModal] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [rank, setRank] = useState({ current: '', target: '', current_state: '', target_state: '' });
  const [form, setForm] = useState({ kind: 'keyword', url: '', keyword: '', current_rank: '', target_rank: '', current_state: '', target_state: '', status: 'research' });

  const load = useCallback(() => {
    const params = {};
    if (!clientUser && clientId) params.client_id = clientId;
    apiClient.get('/seo', { params }).then((r) => setRows(r.data || [])).catch(() => toast.error('Could not load SEO'));
  }, [clientId, clientUser]);

  useEffect(() => {
    if (!clientUser) {
      apiClient.get('/clients').then((r) => {
        const list = r.data || [];
        setClients(list);
        setClientId((id) => id || list[0]?.id || '');
      }).catch(() => {});
    }
  }, [clientUser]);
  useEffect(() => { if (clientUser || clientId) load(); }, [load, clientUser, clientId]);

  const save = async () => {
    if (!clientId && !clientUser) { toast.error('Pick a client'); return; }
    try {
      await apiClient.post('/seo', {
        ...form,
        client_id: clientId,
        current_rank: form.current_rank === '' ? null : Number(form.current_rank),
        target_rank: form.target_rank === '' ? null : Number(form.target_rank),
      });
      toast.success('SEO item added');
      setModal(false);
      setForm({ kind: 'keyword', url: '', keyword: '', current_rank: '', target_rank: '', current_state: '', target_state: '', status: 'research' });
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not save'));
    }
  };

  const patch = async (id, body, okMsg) => {
    try {
      const r = await apiClient.patch(`/seo/${id}`, body);
      setOpen(r.data);
      load();
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      toast.error(apiError(e, 'Could not update'));
    }
  };

  const openItem = (r) => {
    setOpen(r);
    setRank({
      current: r.current_rank ?? '',
      target: r.target_rank ?? '',
      current_state: r.current_state || '',
      target_state: r.target_state || '',
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">{clientUser ? 'Your SEO' : 'SEO'}</h1>
          <p className="dash-sub">{clientUser ? 'Keywords and pages we are tracking for you.' : 'Keyword, page, or audit — each row has URL, rank, owner, and evidence. Ranks are entered here, not pulled from Search Console.'}</p>
        </div>
        {canWrite && (
          <button type="button" className="dash-btn dash-btn-primary self-start min-h-[44px]" onClick={() => {
            if (!clientId) { toast.error('No clients assigned to you yet'); return; }
            setOpen(null);
            setModal(true);
          }}>
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {!clientUser && clients.length > 1 && (
        <select className={inputCls + ' w-full sm:max-w-xs mb-4'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
        </select>
      )}

      <div className="dash-card divide-y divide-white/[0.04]">
        {rows.length === 0 ? (
          <p className="text-white/35 text-sm p-5">Nothing tracked yet.</p>
        ) : rows.map((r) => (
          <button key={r.id} type="button" className="w-full text-left px-4 py-3.5 min-h-[52px]" onClick={() => openItem(r)}>
            <div className="text-white text-sm truncate">{r.keyword || r.url || r.kind}</div>
            <div className="text-white/40 text-xs mt-0.5">
              {r.kind} · {r.status}{r.current_rank != null ? ` · now #${r.current_rank}` : ''}{r.target_rank != null ? ` → #${r.target_rank}` : ''}
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.keyword || open.url || 'SEO item'}</h2>
              <CloseButton onClick={() => { setOpen(null); setEvidence(''); }} />
            </div>
            {open.url && <a href={href(open.url)} target="_blank" rel="noreferrer" className="text-[#E8734A] text-xs break-all">{open.url}</a>}
            <p className="text-white/50 text-sm mt-2 whitespace-pre-wrap">{open.current_state}</p>
            {open.target_state && <p className="text-white/40 text-sm mt-1">Target: {open.target_state}</p>}
            <p className="text-white/35 text-xs mt-2">Rank {open.current_rank ?? '—'} → {open.target_rank ?? '—'}</p>
            {(open.evidence || []).map((e) => (
              <p key={e.id} className="text-xs text-white/45 mt-2">{e.text}</p>
            ))}
            {canWrite && (
              <div className="space-y-3 mt-4">
                <select className={inputCls} value={open.status} onChange={(e) => patch(open.id, { status: e.target.value })}>
                  {STATUSES.map(([v, l]) => <option key={v} value={v} style={optStyle}>{l}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} type="number" placeholder="Rank now" value={rank.current} onChange={(e) => setRank((r) => ({ ...r, current: e.target.value }))} />
                  <input className={inputCls} type="number" placeholder="Target rank" value={rank.target} onChange={(e) => setRank((r) => ({ ...r, target: e.target.value }))} />
                </div>
                <textarea className={inputCls + ' min-h-[56px]'} placeholder="Current state" value={rank.current_state} onChange={(e) => setRank((r) => ({ ...r, current_state: e.target.value }))} />
                <textarea className={inputCls + ' min-h-[56px]'} placeholder="Target state" value={rank.target_state} onChange={(e) => setRank((r) => ({ ...r, target_state: e.target.value }))} />
                <button type="button" className="dash-btn dash-btn-ghost w-full min-h-[44px]" onClick={() => patch(open.id, {
                  current_rank: rank.current === '' ? null : Number(rank.current),
                  target_rank: rank.target === '' ? null : Number(rank.target),
                  current_state: rank.current_state,
                  target_state: rank.target_state,
                }, 'Saved')}>Save rank & state</button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input className={inputCls} placeholder="Evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                  <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={async () => {
                    if (!evidence.trim()) return;
                    try {
                      const r = await apiClient.post(`/seo/${open.id}/evidence`, { text: evidence });
                      setOpen(r.data);
                      setEvidence('');
                      load();
                    } catch (err) { toast.error(apiError(err, 'Could not add')); }
                  }}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="dash-btn dash-btn-primary min-h-[44px]" onClick={async () => {
                    try {
                      const r = await apiClient.post(`/seo/${open.id}/task`);
                      toast.success(r.data?.already ? 'Task already exists' : 'Task created');
                      if (r.data?.id) setOpen((o) => ({ ...o, task_id: r.data.id }));
                    } catch (err) { toast.error(apiError(err, 'Could not create task')); }
                  }}>Create task</button>
                  <Link to="/dashboard/tasks" className="dash-btn dash-btn-ghost min-h-[44px]">Open tasks</Link>
                  <button type="button" className="dash-btn dash-btn-danger min-h-[44px]" onClick={async () => {
                    try {
                      await apiClient.delete(`/seo/${open.id}`);
                      setOpen(null);
                      load();
                    } catch (err) { toast.error(apiError(err, 'Could not delete')); }
                  }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">Add SEO item</h2>
              <CloseButton onClick={() => setModal(false)} />
            </div>
            <div className="space-y-3">
              <select className={inputCls} value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
                {KINDS.map(([v, l]) => <option key={v} value={v} style={optStyle}>{l}</option>)}
              </select>
              <input className={inputCls} placeholder="Keyword" value={form.keyword} onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))} />
              <input className={inputCls} placeholder="Page URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} type="number" placeholder="Rank now" value={form.current_rank} onChange={(e) => setForm((f) => ({ ...f, current_rank: e.target.value }))} />
                <input className={inputCls} type="number" placeholder="Target rank" value={form.target_rank} onChange={(e) => setForm((f) => ({ ...f, target_rank: e.target.value }))} />
              </div>
              <textarea className={inputCls + ' min-h-[64px]'} placeholder="Current state" value={form.current_state} onChange={(e) => setForm((f) => ({ ...f, current_state: e.target.value }))} />
              <textarea className={inputCls + ' min-h-[64px]'} placeholder="Target state" value={form.target_state} onChange={(e) => setForm((f) => ({ ...f, target_state: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" className="dash-btn dash-btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
              <button type="button" className="dash-btn dash-btn-primary flex-[2]" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
