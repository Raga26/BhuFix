import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, isLeadership } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

const SECTIONS = [
  ['business_analysis', 'Business analysis'],
  ['audience', 'Audience'],
  ['competitors', 'Competitors'],
  ['positioning', 'Positioning'],
  ['offer', 'Offer'],
  ['content_pillars', 'Content pillars'],
  ['paid_plan', 'Paid plan'],
  ['seo_plan', 'SEO plan'],
  ['web_plan', 'Web plan'],
  ['kpis', 'KPIs'],
  ['budget', 'Budget'],
  ['roadmap_30', '30-day roadmap'],
  ['roadmap_60', '60-day roadmap'],
  ['roadmap_90', '90-day roadmap'],
];

const STATUS_TONE = {
  draft: 'text-white/50',
  in_review: 'text-[#FBBF24]',
  changes_requested: 'text-[#FB923C]',
  approved: 'text-[#34D399]',
  implemented: 'text-[#4DD9FF]',
};

function emptySections() {
  return Object.fromEntries(SECTIONS.map(([k]) => [k, '']));
}

function statusLabel(s) {
  return String(s || '').replace(/_/g, ' ');
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadPlan(plan, clientName, rivals = []) {
  const body = SECTIONS
    .filter(([k]) => String(plan.sections?.[k] || '').trim())
    .map(([k, label]) => `<h2>${escapeHtml(label)}</h2><p>${escapeHtml(plan.sections[k]).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const rivalHtml = (rivals || []).length
    ? `<h2>Tracked competitors</h2>${rivals.map((r) => `<p><b>${escapeHtml(r.name)}</b>${r.url ? ` — ${escapeHtml(r.url)}` : ''}${r.instagram ? `<br>${escapeHtml(r.instagram)}` : ''}${r.strengths ? `<br>${escapeHtml(r.strengths)}` : ''}${r.weaknesses ? `<br>Watch: ${escapeHtml(r.weaknesses)}` : ''}</p>`).join('')}`
    : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(plan.title)}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#111;line-height:1.55}h1{font-size:26px;margin:0 0 8px}.meta{color:#555;font-size:14px;margin-bottom:28px}h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#555;margin:28px 0 8px}p{white-space:pre-wrap;margin:0 0 12px}</style></head>
<body><h1>${escapeHtml(plan.title)}</h1><p class="meta">${escapeHtml(clientName)} · ${escapeHtml(statusLabel(plan.status))}</p>${body || '<p>No sections written yet.</p>'}${rivalHtml}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${String(plan.title || 'strategy').replace(/[^\w\s-]+/g, '').trim() || 'strategy'}.html`;
  a.click();
  URL.revokeObjectURL(url);
  apiClient.post('/audit/export', { resource: 'strategy', resource_id: plan.id || '', detail: plan.title || '' }).catch(() => {});
}

export default function StrategyView() {
  const { user } = useAuth();
  const canWrite = can(user, 'strategy.write');
  const lead = isLeadership(user);
  const clientUser = user?.role === 'client';
  const [tab, setTab] = useState('plans');
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  const [openSection, setOpenSection] = useState('business_analysis');
  const [rivals, setRivals] = useState([]);
  const skipSave = useRef(true);

  const loadClients = useCallback(() => {
    apiClient.get('/clients').then((r) => {
      const rows = r.data || [];
      setClients(rows);
      setClientId((id) => id || rows[0]?.id || '');
    }).catch(() => {});
  }, []);

  const loadPlans = useCallback(() => {
    const params = clientId ? { client_id: clientId } : {};
    apiClient.get('/strategies', { params }).then((r) => setPlans(r.data || [])).catch(() => toast.error('Could not load strategies'));
  }, [clientId]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => {
    const cid = active?.client_id || clientId;
    if (!cid || clientUser) { setRivals([]); return; }
    apiClient.get('/competitors', { params: { client_id: cid } }).then((r) => setRivals(r.data || [])).catch(() => setRivals([]));
  }, [active?.client_id, clientId, clientUser]);

  const open = async (id) => {
    try {
      const r = await apiClient.get(`/strategies/${id}`);
      skipSave.current = true;
      setActive({ ...r.data, sections: { ...emptySections(), ...(r.data.sections || {}) } });
    } catch (e) {
      toast.error(apiError(e, 'Could not open'));
    }
  };

  const create = async () => {
    if (!clientId) { toast.error('Pick a client'); return; }
    const cl = clients.find((c) => c.id === clientId);
    try {
      const r = await apiClient.post('/strategies', { client_id: clientId, title: `${cl?.name || 'Client'} strategy` });
      skipSave.current = true;
      loadPlans();
      setActive({ ...r.data, sections: emptySections() });
    } catch (e) {
      toast.error(apiError(e, 'Could not create'));
    }
  };

  const locked = ['in_review', 'approved', 'implemented'].includes(active?.status);

  const patchSection = (key, value) => setActive((d) => ({ ...d, sections: { ...d.sections, [key]: value } }));

  useEffect(() => {
    if (!active?.id || locked || !canWrite) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await apiClient.patch(`/strategies/${active.id}`, { title: active.title, sections: active.sections });
      } catch (_) { /* autosave */ }
      setSaving(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [active?.title, active?.sections, active?.id, locked, canWrite]);

  const act = async (path, ok) => {
    try {
      const r = await apiClient.post(`/strategies/${active.id}/${path}`);
      skipSave.current = true;
      setActive({ ...r.data, sections: { ...emptySections(), ...(r.data.sections || {}) } });
      loadPlans();
      const made = r.data.created_tasks || [];
      if (made.length) {
        const unmatched = made.filter((t) => t.unmatched_role).length;
        toast.success(unmatched
          ? `${made.length} tasks created. ${unmatched} assigned to you — no matching role on this client.`
          : `${made.length} tasks created`);
      } else {
        toast.success(ok);
      }
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
    }
  };

  const decide = async (action, notes = '') => {
    try {
      const r = await apiClient.post(`/strategies/${active.id}/decide`, { action, notes });
      skipSave.current = true;
      setActive({ ...r.data, sections: { ...emptySections(), ...(r.data.sections || {}) } });
      loadPlans();
      toast.success(action === 'approve' ? 'Strategy approved' : 'Changes requested');
    } catch (e) {
      toast.error(apiError(e, 'Could not decide'));
    }
  };

  const clientName = (id) => clients.find((c) => c.id === id)?.name || id;

  return (
    <div>
      <div className={`${active ? 'hidden md:block' : ''} mb-6`}>
        <h1 className="dash-title">{clientUser ? 'Your plan' : 'Strategy Hub'}</h1>
        <p className="dash-sub">{clientUser ? 'The approved plan for your brand.' : 'Write the plan. Leadership approves. Implement creates tasks only for filled sections.'}</p>
      </div>

      {!clientUser && (
      <div className={`${active ? 'hidden md:flex' : 'flex'} flex-wrap gap-2 mb-5`}>
        {[['plans', 'Plans'], ['library', 'Library']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setActive(null); }}
            className={`px-3 py-2 rounded-md text-sm ${tab === id ? 'bg-white/[0.08] text-white' : 'text-white/40'}`}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {tab === 'library' && !clientUser && <Library />}

      {tab === 'plans' && (
        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <div className={`${active ? 'hidden md:block' : ''} space-y-3`}>
            {!clientUser && clients.length > 1 && (
              <select className={inputCls} value={clientId} onChange={(e) => { setClientId(e.target.value); setActive(null); }}>
                {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
              </select>
            )}
            {canWrite && (
              <button className="dash-btn dash-btn-primary w-full min-h-[44px]" onClick={create}>New plan</button>
            )}
            <div className="dash-card overflow-hidden max-h-[50vh] md:max-h-[65vh] overflow-y-auto">
              {plans.length === 0 ? (
                <p className="text-white/35 text-sm p-4">{clientUser ? 'No approved plan yet. BhuFix will share it here.' : 'No plans yet.'}</p>
              ) : plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => open(p.id)}
                  className={`w-full text-left px-4 py-3.5 min-h-[52px] border-b border-white/[0.05] ${active?.id === p.id ? 'bg-white/[0.06]' : ''}`}
                >
                  <div className="text-white text-sm truncate">{p.title}</div>
                  <div className={`text-[11px] ${STATUS_TONE[p.status] || 'text-white/35'}`}>{statusLabel(p.status)}</div>
                </button>
              ))}
            </div>
          </div>

          {active ? (
            <div className="dash-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <button type="button" className="md:hidden dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setActive(null)}>Back</button>
                <div className="text-white/40 text-xs flex-1">{saving ? 'Saving…' : locked ? 'Locked' : clientName(active.client_id)}</div>
                <button type="button" className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setPrintOpen(true)}>PDF</button>
                <CloseButton onClick={() => setActive(null)} className="hidden md:inline-flex" />
              </div>
              <input className={inputCls} disabled={locked || !canWrite} value={active.title || ''} onChange={(e) => setActive((d) => ({ ...d, title: e.target.value }))} />
              <div className={`text-xs ${STATUS_TONE[active.status] || 'text-white/35'}`}>{statusLabel(active.status)}{active.status === 'in_review' ? ' · withdraw to edit' : ''}</div>
              {(active.notes || []).length > 0 && (
                <div className="text-xs text-white/45 bg-white/[0.04] rounded-lg px-3 py-2 space-y-1">
                  {(active.notes || []).slice(-3).map((n, i) => (
                    <div key={i}>{n.text}</div>
                  ))}
                </div>
              )}

              <select
                className={inputCls + ' md:hidden'}
                value={openSection}
                onChange={(e) => setOpenSection(e.target.value)}
              >
                {SECTIONS.map(([key, label]) => (
                  <option key={key} value={key} style={optStyle}>{label}{String(active.sections?.[key] || '').trim() ? '' : ' · empty'}</option>
                ))}
              </select>
              <div className="hidden md:flex flex-wrap gap-1.5">
                {SECTIONS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOpenSection(key)}
                    className={`text-[11px] px-2.5 py-2 min-h-[36px] rounded-md ${openSection === key ? 'bg-white/[0.1] text-white' : 'text-white/40'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                className={inputCls + ' min-h-[180px] md:min-h-[140px]'}
                disabled={locked || !canWrite}
                value={active.sections?.[openSection] || ''}
                onChange={(e) => patchSection(openSection, e.target.value)}
                placeholder={clientUser ? '' : 'Write this section…'}
              />

              <div className="flex flex-wrap gap-2 pt-2">
                {canWrite && ['draft', 'changes_requested'].includes(active.status) && (
                  <button className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => act('submit', 'Sent for approval')}>Submit</button>
                )}
                {canWrite && active.status === 'in_review' && (
                  <button className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => act('withdraw', 'Back to draft — you can edit again')}>Withdraw</button>
                )}
                {lead && active.status === 'in_review' && (
                  <>
                    <button className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => decide('approve')}>Approve</button>
                    <button className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => setChangeOpen(true)}>Changes</button>
                  </>
                )}
                {lead && active.status === 'approved' && (
                  <button className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => act('implement', 'Tasks created from filled sections')}>Implement strategy</button>
                )}
                {canWrite && ['approved', 'implemented'].includes(active.status) && (
                  <button className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => act('duplicate', 'New draft from this plan')}>New version</button>
                )}
                {active.status === 'implemented' && !clientUser && (
                  <Link to="/dashboard/tasks" className="dash-btn dash-btn-ghost min-h-[44px]">Open tasks</Link>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:flex dash-card p-8 text-white/30 text-sm items-center">Pick or start a plan.</div>
          )}
        </div>
      )}

      {changeOpen && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Request changes</h2>
              <CloseButton onClick={() => setChangeOpen(false)} />
            </div>
            <textarea className={inputCls + ' min-h-[96px]'} value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} placeholder="What should change?" />
            <div className="flex gap-2 mt-4">
              <button type="button" className="dash-btn dash-btn-ghost flex-1" onClick={() => setChangeOpen(false)}>Cancel</button>
              <button type="button" className="dash-btn dash-btn-primary flex-[2]" onClick={() => { setChangeOpen(false); decide('changes_requested', changeNotes); setChangeNotes(''); }}>Send</button>
            </div>
          </div>
        </div>
      )}
      {printOpen && active && (
        <PrintSheet plan={active} clientName={clientName(active.client_id)} rivals={rivals} onClose={() => setPrintOpen(false)} />
      )}
    </div>
  );
}

function PrintSheet({ plan, clientName, rivals = [], onClose }) {
  return (
    <div className="dash-overlay">
      <div className="dash-modal strategy-print p-5 sm:p-8 w-full max-w-2xl">
        <div className="flex flex-wrap justify-between gap-2 mb-4 print-hide">
          <div className="text-white font-medium">Save plan</div>
          <div className="flex flex-wrap gap-2">
            <button className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => downloadPlan(plan, clientName, rivals)}>Download</button>
            <button className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => {
              apiClient.post('/audit/export', { resource: 'strategy', resource_id: plan.id || '', detail: 'print' }).catch(() => {});
              window.print();
            }}>Print / PDF</button>
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <div className="space-y-4 text-white strategy-print-body">
          <h1 className="text-xl font-semibold">{plan.title}</h1>
          <p className="text-sm text-white/50">{clientName} · {statusLabel(plan.status)}</p>
          {SECTIONS.map(([key, label]) => (
            plan.sections?.[key] ? (
              <div key={key}>
                <h2 className="font-medium text-xs uppercase tracking-wide text-white/40 mt-3">{label}</h2>
                <p className="whitespace-pre-wrap text-sm mt-1 text-white/80">{plan.sections[key]}</p>
              </div>
            ) : null
          ))}
          {rivals.length > 0 && (
            <div>
              <h2 className="font-medium text-xs uppercase tracking-wide text-white/40 mt-3">Tracked competitors</h2>
              {rivals.map((r) => (
                <p key={r.id} className="text-sm mt-2 text-white/80">
                  <span className="font-medium">{r.name}</span>
                  {r.url ? ` — ${r.url}` : ''}
                  {r.strengths ? `\n${r.strengths}` : ''}
                  {r.weaknesses ? `\nWatch: ${r.weaknesses}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Library() {
  return (
    <div className="dash-card p-5 text-white/60 text-sm space-y-3">
      <p>Pillars and hooks now live inside each client plan. Use Clip for actual scripts.</p>
      <Link to="/dashboard/clip" className="dash-btn dash-btn-ghost inline-flex">Open Clip</Link>
    </div>
  );
}
