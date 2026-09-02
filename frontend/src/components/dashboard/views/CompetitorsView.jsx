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

const blank = { name: '', url: '', instagram: '', strengths: '', weaknesses: '', notes: '' };

export default function CompetitorsView() {
  const { user } = useAuth();
  const canWrite = can(user, 'competitors.write');
  const clientUser = user?.role === 'client';
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(blank);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);

  const load = useCallback(() => {
    if (clientUser || !clientId) return;
    apiClient.get('/competitors', { params: { client_id: clientId } }).then((r) => setRows(r.data || [])).catch(() => toast.error('Could not load competitors'));
  }, [clientId, clientUser]);

  useEffect(() => {
    if (clientUser) return;
    apiClient.get('/clients').then((r) => {
      const list = r.data || [];
      setClients(list);
      setClientId((id) => id || list[0]?.id || '');
    }).catch(() => {});
  }, [clientUser]);
  useEffect(() => { load(); }, [load]);

  if (clientUser) {
    return <p className="text-white/40 text-sm">Competitor research stays with the studio.</p>;
  }

  const save = async () => {
    if (!clientId) { toast.error('No clients assigned to you yet'); return; }
    if (!form.name) { toast.error('Name is required'); return; }
    try {
      await apiClient.post('/competitors', { ...form, client_id: clientId });
      toast.success('Competitor added — it will show on the strategy PDF');
      setModal(false);
      setForm(blank);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not save'));
    }
  };

  const saveDraft = async () => {
    if (!open) return;
    try {
      const r = await apiClient.patch(`/competitors/${open.id}`, draft);
      setOpen(r.data);
      toast.success('Saved');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not save'));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">Competitors</h1>
          <p className="dash-sub">Research for this client. Saving a plan from Strategy Hub includes this list.</p>
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

      {clients.length > 0 && (
        <select className={inputCls + ' w-full sm:max-w-xs mb-4'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
        </select>
      )}

      <div className="dash-card divide-y divide-white/[0.04]">
        {rows.length === 0 ? (
          <p className="text-white/35 text-sm p-5">No competitors stored for this client.</p>
        ) : rows.map((r) => (
          <button key={r.id} type="button" className="w-full text-left px-4 py-3.5 min-h-[52px]" onClick={() => {
            setOpen(r);
            setDraft({
              name: r.name || '',
              url: r.url || '',
              instagram: r.instagram || '',
              strengths: r.strengths || '',
              weaknesses: r.weaknesses || '',
              notes: r.notes || '',
            });
          }}>
            <div className="text-white text-sm">{r.name}</div>
            <div className="text-white/40 text-xs mt-0.5 truncate">{r.url || r.instagram || 'Tap to edit'}</div>
          </button>
        ))}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.name}</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            {open.url && <a className="text-[#E8734A] text-xs break-all" href={href(open.url)} target="_blank" rel="noreferrer">{open.url}</a>}
            {canWrite ? (
              <div className="space-y-3 mt-3">
                <input className={inputCls} placeholder="Name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                <input className={inputCls} placeholder="Website" value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} />
                <input className={inputCls} placeholder="Instagram" value={draft.instagram} onChange={(e) => setDraft((d) => ({ ...d, instagram: e.target.value }))} />
                <textarea className={inputCls + ' min-h-[64px]'} placeholder="Strengths" value={draft.strengths} onChange={(e) => setDraft((d) => ({ ...d, strengths: e.target.value }))} />
                <textarea className={inputCls + ' min-h-[64px]'} placeholder="Weaknesses" value={draft.weaknesses} onChange={(e) => setDraft((d) => ({ ...d, weaknesses: e.target.value }))} />
                <button type="button" className="dash-btn dash-btn-primary w-full min-h-[44px]" onClick={saveDraft}>Save</button>
                <button type="button" className="dash-btn dash-btn-danger w-full min-h-[44px]" onClick={async () => {
                  try {
                    await apiClient.delete(`/competitors/${open.id}`);
                    setOpen(null);
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not delete')); }
                }}>Delete</button>
              </div>
            ) : (
              <>
                {open.instagram && <p className="text-white/40 text-xs mt-1">{open.instagram}</p>}
                {open.strengths && <p className="text-white/70 text-sm mt-3 whitespace-pre-wrap">{open.strengths}</p>}
                {open.weaknesses && <p className="text-white/50 text-sm mt-2 whitespace-pre-wrap">{open.weaknesses}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">Add competitor</h2>
              <CloseButton onClick={() => setModal(false)} />
            </div>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <input className={inputCls} placeholder="Website" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
              <input className={inputCls} placeholder="Instagram" value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} />
              <textarea className={inputCls + ' min-h-[64px]'} placeholder="Strengths" value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} />
              <textarea className={inputCls + ' min-h-[64px]'} placeholder="Weaknesses" value={form.weaknesses} onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))} />
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
