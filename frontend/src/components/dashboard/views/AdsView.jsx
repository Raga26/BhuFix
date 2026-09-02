import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus } from 'lucide-react';
import { apiError } from '../../../utils/apiError';

const COLORS = ['#E8734A', '#4DD9FF', '#A78BFA', '#34D399', '#F472B6', '#F59E0B'];
const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

function emptyForm(clients) {
  const now = new Date();
  return {
    client_id: clients[0]?.id || '',
    platform: 'Meta',
    name: '',
    budget: '',
    spent: '',
    impressions: '',
    clicks: '',
    leads: '',
    conversions: '',
    landing: '',
    whatsapp: '',
    qualified: '',
    appointments: '',
    customers: '',
    revenue: '',
    objective: 'leads',
    notes: '',
    variants: [],
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function n(v) {
  return Number(v || 0);
}

function ctr(impr, clicks) {
  return impr ? `${((clicks / impr) * 100).toFixed(1)}%` : '—';
}

function AddCampaignModal({ clients, onClose, onSave, campaign, isEdit }) {
  const [form, setForm] = useState(() => {
    if (campaign?.id || isEdit) {
      return { ...emptyForm(clients), ...campaign, variants: campaign.variants || [] };
    }
    return emptyForm(clients);
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client_id) {
      toast.error('Please select a client');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: n(form.budget),
        spent: n(form.spent),
        impressions: n(form.impressions),
        clicks: n(form.clicks),
        leads: n(form.leads),
        conversions: n(form.conversions),
        landing: n(form.landing),
        whatsapp: n(form.whatsapp),
        qualified: n(form.qualified),
        appointments: n(form.appointments),
        customers: n(form.customers),
        revenue: n(form.revenue),
        variants: (form.variants || []).map((v) => ({
          ...v,
          impressions: n(v.impressions),
          clicks: n(v.clicks),
          spent: n(v.spent),
        })),
      };
      if (isEdit) {
        await apiClient.put(`/ads/${form.id}`, payload);
        toast.success('Campaign updated');
      } else {
        await apiClient.post('/ads', payload);
        toast.success('Campaign added');
      }
      onSave();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Failed to save campaign'));
      logger.error('Failed to save event', { isEdit, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addVariant = () => {
    setForm((f) => ({
      ...f,
      variants: [...(f.variants || []), { id: crypto.randomUUID?.() || String(Date.now()), name: '', status: 'running', impressions: '', clicks: '', spent: '', notes: '' }],
    }));
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit campaign' : 'Add campaign'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="dash-label">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="dash-label">Platform</label>
              <input className={inputCls} value={form.platform} onChange={(e) => set('platform', e.target.value)} placeholder="Meta, Google" />
            </div>
            <div>
              <label className="dash-label">Name</label>
              <input className={inputCls} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Lead gen · Sep" />
            </div>
          </div>
          <div>
            <label className="dash-label">Objective</label>
            <select className={inputCls} value={form.objective || ''} onChange={(e) => set('objective', e.target.value)}>
              {['awareness', 'traffic', 'leads', 'sales'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dash-label">Budget (₹)</label>
              <input className={inputCls} type="number" inputMode="decimal" value={form.budget} onChange={(e) => set('budget', e.target.value)} />
            </div>
            <div>
              <label className="dash-label">Spent (₹)</label>
              <input className={inputCls} type="number" inputMode="decimal" value={form.spent} onChange={(e) => set('spent', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['impressions', 'Impressions'],
              ['clicks', 'Clicks'],
              ['landing', 'Landing'],
              ['whatsapp', 'WhatsApp'],
              ['leads', 'Leads'],
              ['qualified', 'Qualified'],
              ['appointments', 'Appts'],
              ['conversions', 'Sales'],
              ['customers', 'Customers'],
              ['revenue', 'Revenue ₹'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="dash-label">{label}</label>
                <input className={inputCls} type="number" inputMode="decimal" value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="dash-label">Month</label>
              <input className={inputCls} type="number" min="1" max="12" value={form.month} onChange={(e) => set('month', +e.target.value)} />
            </div>
            <div>
              <label className="dash-label">Year</label>
              <input className={inputCls} type="number" value={form.year} onChange={(e) => set('year', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="dash-label">Internal notes</label>
            <textarea className={inputCls + ' min-h-[64px]'} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Not shown to the client" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="dash-label mb-0">A/B variants</label>
              <button type="button" className="text-[#E8734A] text-xs" onClick={addVariant}>Add variant</button>
            </div>
            {(form.variants || []).map((v, i) => (
              <div key={v.id || i} className="mb-2 p-3 rounded-lg border border-white/[0.06] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Variant name" value={v.name} onChange={(e) => {
                    const next = [...form.variants];
                    next[i] = { ...next[i], name: e.target.value };
                    set('variants', next);
                  }} />
                  <select className={inputCls} value={v.status || 'running'} onChange={(e) => {
                    const next = [...form.variants];
                    next[i] = { ...next[i], status: e.target.value };
                    set('variants', next);
                  }}>
                    <option value="running">Running</option>
                    <option value="winner">Winner</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['impressions', 'clicks', 'spent'].map((k) => (
                    <input key={k} className={inputCls} type="number" placeholder={k} value={v[k]} onChange={(e) => {
                      const next = [...form.variants];
                      next[i] = { ...next[i], [k]: e.target.value };
                      set('variants', next);
                    }} />
                  ))}
                </div>
                <button
                  type="button"
                  className="text-white/40 text-xs hover:text-red-400"
                  onClick={() => setForm((f) => ({ ...f, variants: (f.variants || []).filter((_, idx) => idx !== i) }))}
                >
                  Remove variant
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdsView() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    apiClient.get('/ads').then((r) => {
      setAds(r.data || []);
      logger.info('Ads campaigns loaded', { count: r.data?.length || 0 });
    }).catch((e) => logger.error('Failed to load ads', { error: e.message }));
    if (user?.role !== 'client') {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch(() => {});
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalBudget = ads.reduce((s, a) => s + n(a.budget), 0);
  const totalSpent = ads.reduce((s, a) => s + n(a.spent), 0);
  const totalLeads = ads.reduce((s, a) => s + n(a.leads), 0);
  const totalClicks = ads.reduce((s, a) => s + n(a.clicks), 0);
  const totalImpr = ads.reduce((s, a) => s + n(a.impressions), 0);
  const overallPct = totalBudget ? Math.round(totalSpent / totalBudget * 100) : 0;
  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || cid;
  const fmt = (v) => `₹${n(v).toLocaleString('en-IN')}`;

  const handleDeleteCampaign = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/ads/${deleteConfirm.id}`);
      setAds(ads.filter((a) => a.id !== deleteConfirm.id));
      toast.success('Campaign deleted');
      setDeleteConfirm(null);
      setOpen(null);
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete campaign'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">{user?.role === 'client' ? 'Campaigns' : 'Ads'}</h1>
          <p className="dash-sub">Spend, funnel, and A/B variants — numbers are entered here, not pulled from Meta. Full CTR / CPC / ROAS live under Performance.</p>
        </div>
        {can(user, 'ads.write') && (
          <button type="button" onClick={() => {
            if (!clients.length) { toast.error('No clients assigned to you yet'); return; }
            setModal({});
          }} className="dash-btn dash-btn-primary self-start min-h-[44px]">
            <Plus size={14} strokeWidth={2} />
            Add campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="dash-card p-4">
          <div className="font-anchor italic text-[1.35rem] text-white mb-1">{fmt(totalBudget)}</div>
          <div className="text-white/40 text-xs">Budget</div>
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-[1.35rem] text-white mb-1">{fmt(totalSpent)}</div>
          <div className="text-white/40 text-xs">Spent · {overallPct}%</div>
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-[1.35rem] text-white mb-1">{totalClicks.toLocaleString('en-IN')}</div>
          <div className="text-white/40 text-xs">Clicks · CTR {ctr(totalImpr, totalClicks)}</div>
        </div>
        <div className="dash-card p-4">
          <div className="font-anchor italic text-[1.35rem] text-white mb-1">{totalLeads.toLocaleString('en-IN')}</div>
          <div className="text-white/40 text-xs">Leads</div>
        </div>
      </div>

      <div className="dash-card p-4 sm:p-5">
        <div className="text-white font-medium text-sm mb-4">Campaigns</div>
        {ads.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No campaigns yet.</div>
        ) : (
          <div className="space-y-2">
            {ads.map((ad, i) => {
              const pct = ad.budget ? Math.round(n(ad.spent) / n(ad.budget) * 100) : 0;
              const color = COLORS[i % COLORS.length];
              return (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => setOpen(ad)}
                  className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 py-3.5 px-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all min-h-[52px]"
                >
                  <div className="flex items-center gap-3 min-w-0 sm:min-w-[140px]">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{ad.name || (user?.role === 'client' ? ad.platform : clientName(ad.client_id))}</div>
                      <div className="text-white/30 text-xs">{ad.platform} · {ad.month}/{ad.year}{ad.objective ? ` · ${ad.objective}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>{fmt(ad.spent)} · {n(ad.leads)} leads · CTR {ctr(n(ad.impressions), n(ad.clicks))}</span>
                      <span>{fmt(ad.budget)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.name || open.platform}</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            <p className="text-white/45 text-sm mb-3">{user?.role === 'client' ? '' : `${clientName(open.client_id)} · `}{open.platform} · {open.month}/{open.year}</p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="dash-card p-3"><div className="text-white">{n(open.impressions).toLocaleString('en-IN')}</div><div className="text-white/35 text-xs">Impressions</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.clicks).toLocaleString('en-IN')}</div><div className="text-white/35 text-xs">Clicks · {ctr(n(open.impressions), n(open.clicks))}</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.landing)}</div><div className="text-white/35 text-xs">Landing</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.whatsapp)}</div><div className="text-white/35 text-xs">WhatsApp</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.leads)}</div><div className="text-white/35 text-xs">Leads</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.qualified)}</div><div className="text-white/35 text-xs">Qualified</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.appointments)}</div><div className="text-white/35 text-xs">Appointments</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.customers) || n(open.conversions)}</div><div className="text-white/35 text-xs">Customers</div></div>
              <div className="dash-card p-3"><div className="text-white">{fmt(open.revenue)}</div><div className="text-white/35 text-xs">Revenue</div></div>
              <div className="dash-card p-3"><div className="text-white">{n(open.conversions)}</div><div className="text-white/35 text-xs">Sales (entered)</div></div>
            </div>
            {(open.variants || []).length > 0 && (
              <div className="mb-4">
                <div className="text-white/40 text-xs mb-2">Variants</div>
                {(open.variants || []).map((v) => (
                  <div key={v.id} className="text-sm text-white py-2 border-b border-white/[0.04] last:border-0">
                    {v.name || 'Untitled'} · {v.status} · CTR {ctr(n(v.impressions), n(v.clicks))}
                  </div>
                ))}
              </div>
            )}
            {can(user, 'ads.write') && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => { setModal(open); setOpen(null); }}>Edit</button>
                <button type="button" className="dash-btn dash-btn-danger min-h-[44px]" onClick={() => setDeleteConfirm(open)}>Delete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (clients.length > 0 || user?.role === 'client') && user?.role !== 'client' && (
        <AddCampaignModal
          clients={clients}
          onClose={() => setModal(null)}
          onSave={load}
          campaign={modal.id ? modal : undefined}
          isEdit={!!modal.id}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete Campaign"
          message={`Delete this ad campaign for ${clientName(deleteConfirm.client_id)} (${deleteConfirm.platform})? This cannot be undone.`}
          onConfirm={handleDeleteCampaign}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
