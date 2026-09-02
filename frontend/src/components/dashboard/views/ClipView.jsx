import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, CLIP_CATEGORIES, canReview } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { CloseButton } from '../CloseButton';
import { NotesDialog } from '../NotesDialog';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

export default function ClipView() {
  const { user } = useAuth();
  const canWrite = can(user, 'clips.write');
  const reviewer = canReview(user);
  const [clips, setClips] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientIdForNew, setClientIdForNew] = useState('');
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const skipSave = useRef(true);

  const load = useCallback(() => {
    apiClient.get('/clips').then((r) => setClips(r.data || [])).catch(() => toast.error('Failed to load clips'));
    apiClient.get('/clients').then((r) => {
      const rows = r.data || [];
      setClients(rows);
      setClientIdForNew((id) => id || rows[0]?.id || '');
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = async (id) => {
    try {
      const r = await apiClient.get(`/clips/${id}`);
      setActive(r.data);
    } catch (e) {
      toast.error(apiError(e, 'Could not open clip'));
    }
  };

  const create = async () => {
    const cid = clientIdForNew || clients[0]?.id;
    if (!cid) { toast.error('Add a client first'); return; }
    try {
      const r = await apiClient.post('/clips', { client_id: cid, title: 'Untitled clip', category: 'educational' });
      load();
      open(r.data.id);
    } catch (e) {
      toast.error(apiError(e, 'Could not create'));
    }
  };

  const patch = (k, v) => setActive((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    skipSave.current = true;
  }, [active?.id]);

  useEffect(() => {
    if (!active?.id || active.locked || !canWrite) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await apiClient.patch(`/clips/${active.id}`, {
          title: active.title,
          hook: active.hook,
          body: active.body,
          cta: active.cta,
          seo_keywords: active.seo_keywords,
          category: active.category,
        });
      } catch (_) { /* autosave */ }
      setSaving(false);
    }, 900);
    return () => clearTimeout(t);
  }, [active?.title, active?.hook, active?.body, active?.cta, active?.seo_keywords, active?.category, active?.id, active?.locked, canWrite]);

  const submit = async () => {
    try {
      if (active.status !== 'in_review') {
        await apiClient.post(`/clips/${active.id}/snapshot`);
      }
      await apiClient.post('/approvals', { type: 'clip', resource_id: active.id });
      toast.success('Sent for review');
      open(active.id);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not submit'));
    }
  };

  const revise = async () => {
    try {
      const r = await apiClient.post(`/clips/${active.id}/revise`);
      setActive(r.data);
      load();
      toast.success('Unlocked as the next version');
    } catch (e) {
      toast.error(apiError(e, 'Could not start a new version'));
    }
  };

  const handoff = async (who) => {
    try {
      await apiClient.patch(`/clips/${active.id}`, { handed_to: who });
      toast.success(`Handed to ${who}`);
      open(active.id);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Handoff failed'));
    }
  };

  const decide = async (action, notes = '') => {
    try {
      const pending = (await apiClient.get('/approvals', { params: { status: 'pending' } })).data || [];
      const row = pending.find((a) => a.resource_id === active.id);
      if (!row) { toast.error('No pending review'); return; }
      await apiClient.post(`/approvals/${row.id}/decide`, { action, notes: notes || '' });
      toast.success(action === 'approve' ? 'Clip locked' : 'Changes requested');
      open(active.id);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  const clientName = (id) => clients.find((c) => c.id === id)?.name || id;

  return (
    <div>
      <div className={`${active ? 'hidden lg:flex' : 'flex'} flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6`}>
        <div>
          <h1 className="dash-title">BhuFix Clip</h1>
          <p className="dash-sub">Hook, body, CTA. Autosaves. Submit for internal review.</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 self-start">
            <select className={inputCls + ' w-full sm:w-48'} value={clientIdForNew} onChange={(e) => setClientIdForNew(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
            </select>
            <button className="dash-btn dash-btn-primary" onClick={create}>New clip</button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className={`${active ? 'hidden lg:block' : ''} dash-card overflow-hidden max-h-[50vh] lg:max-h-[70vh] overflow-y-auto`}>
          {clips.length === 0 ? (
            <p className="text-white/35 text-sm p-5">No scripts yet.</p>
          ) : clips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => open(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.05] ${active?.id === c.id ? 'bg-white/[0.06]' : ''}`}
            >
              <div className="text-white text-sm truncate">{c.title}</div>
              <div className="text-white/35 text-xs">{clientName(c.client_id)} · {c.status} · v{c.version}</div>
            </button>
          ))}
        </div>

        {active ? (
          <div className="dash-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="lg:hidden p-1.5 -ml-1 text-white/50" onClick={() => setActive(null)} aria-label="Back to clips">
                <ArrowLeft size={18} />
              </button>
              <div className="text-white/40 text-xs flex-1">{saving ? 'Saving…' : active.locked ? 'Locked' : `v${active.version}`}</div>
              <CloseButton onClick={() => setActive(null)} />
            </div>
            <div className="text-white/50 text-xs">{clientName(active.client_id)}</div>
            <input className={inputCls} disabled={active.locked} value={active.title || ''} onChange={(e) => patch('title', e.target.value)} placeholder="Title" />
            <select className={inputCls} disabled={active.locked} value={active.category} onChange={(e) => patch('category', e.target.value)}>
              {CLIP_CATEGORIES.map((c) => <option key={c.value} value={c.value} style={optStyle}>{c.label}</option>)}
            </select>
            <textarea className={inputCls + ' min-h-[72px]'} disabled={active.locked} value={active.hook || ''} onChange={(e) => patch('hook', e.target.value)} placeholder="Hook" />
            <textarea className={inputCls + ' min-h-[140px]'} disabled={active.locked} value={active.body || ''} onChange={(e) => patch('body', e.target.value)} placeholder="Body" />
            <textarea className={inputCls + ' min-h-[64px]'} disabled={active.locked} value={active.cta || ''} onChange={(e) => patch('cta', e.target.value)} placeholder="CTA" />
            <input className={inputCls} disabled={active.locked} value={active.seo_keywords || ''} onChange={(e) => patch('seo_keywords', e.target.value)} placeholder="SEO keywords" />

            <div className="flex flex-wrap gap-2 pt-2">
              {canWrite && !active.locked && (
                <button className="dash-btn dash-btn-primary" onClick={submit}>Submit for review</button>
              )}
              {reviewer && active.status === 'in_review' && (
                <>
                  <button className="dash-btn dash-btn-primary" onClick={() => decide('approve')}>Approve</button>
                  <button className="dash-btn dash-btn-ghost" onClick={() => setPendingAction('changes_requested')}>Request changes</button>
                </>
              )}
              {active.locked && canWrite && (
                <>
                  <button className="dash-btn dash-btn-primary" onClick={revise}>New version</button>
                  <button className="dash-btn dash-btn-ghost" onClick={() => handoff('editor')}>Hand to editor</button>
                  <button className="dash-btn dash-btn-ghost" onClick={() => handoff('smm')}>Hand to SMM</button>
                  {active.client_approved ? (
                    <span className="text-[#34D399] text-xs self-center">Client approved this version</span>
                  ) : active.client_status === 'changes_requested' ? (
                    <span className="text-[#FB923C] text-xs self-center">Client asked for changes — send a new version</span>
                  ) : (
                    <button className="dash-btn dash-btn-ghost" onClick={async () => {
                      try {
                        await apiClient.post('/approvals/present', { type: 'clip', resource_id: active.id });
                        toast.success('Sent this version to the client');
                      } catch (e) {
                        toast.error(apiError(e, 'Could not send'));
                      }
                    }}>Send to client</button>
                  )}
                </>
              )}
            </div>
            {(active.versions || []).length > 1 && (
              <div className="text-white/35 text-xs pt-2">History: {(active.versions || []).map((v) => `v${v.version}`).join(' · ')}</div>
            )}
          </div>
        ) : (
          <div className="dash-card p-8 text-white/30 text-sm">Pick a clip or start a new one.</div>
        )}
      </div>
      {pendingAction && (
        <NotesDialog
          title="Request changes"
          label="What should change?"
          confirmLabel="Send"
          onClose={() => setPendingAction(null)}
          onConfirm={(notes) => { setPendingAction(null); decide(pendingAction, notes); }}
        />
      )}
    </div>
  );
}
