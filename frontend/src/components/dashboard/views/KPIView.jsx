import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus } from 'lucide-react';

const PLATFORMS = [
  { key: 'Instagram' },
  { key: 'TikTok' },
  { key: 'LinkedIn' },
  { key: 'YouTube Shorts' },
];

function AddKPIModal({ clients, onClose, onSave, kpi, isEdit }) {
  const now = new Date();
  const [form, setForm] = useState(kpi || { client_id: clients[0]?.id || '', platform: 'Instagram', reach: '', engagement_rate: '', followers_gained: '', dm_inquiries: '', bookings: '', month: now.getMonth() + 1, year: now.getFullYear() });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  const handleSave = async () => {
    if (!form.client_id) {
      toast.error('Please select a client');
      return;
    }
    setSaving(true);
    try {
      logger.formSubmit('KPIView', isEdit ? 'update_kpi' : 'create_kpi', {
        client_id: form.client_id,
        platform: form.platform,
      });
      if (isEdit) {
        await apiClient.put(`/kpis/${form.id}`, form);
        toast.success('KPI updated successfully');
        logger.success('KPI updated', { kpiId: form.id });
      } else {
        await apiClient.post('/kpis', form);
        toast.success('KPI entry added successfully');
        logger.success('New KPI created', { platform: form.platform });
      }
      onSave();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to save KPI';
      toast.error(errorMsg);
      logger.error('Failed to save KPI', { isEdit, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit KPI' : 'Add KPI'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
              <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Platform</label>
              <select className={inputCls} value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.key}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Reach</label>
              <input className={inputCls} type="number" value={form.reach} onChange={(e) => set('reach', e.target.value ? +e.target.value : '')} placeholder="0" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Engagement %</label>
              <input className={inputCls} type="number" step="0.1" value={form.engagement_rate} onChange={(e) => set('engagement_rate', e.target.value ? +e.target.value : '')} placeholder="0.0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">New Followers</label>
              <input className={inputCls} type="number" value={form.followers_gained} onChange={(e) => set('followers_gained', e.target.value ? +e.target.value : '')} placeholder="0" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">DM Inquiries</label>
              <input className={inputCls} type="number" value={form.dm_inquiries} onChange={(e) => set('dm_inquiries', e.target.value ? +e.target.value : '')} placeholder="0" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Bookings</label>
              <input className={inputCls} type="number" value={form.bookings} onChange={(e) => set('bookings', e.target.value ? +e.target.value : '')} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Month</label>
              <input className={inputCls} type="number" min="1" max="12" value={form.month} onChange={(e) => set('month', +e.target.value)} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Year</label>
              <input className={inputCls} type="number" value={form.year} onChange={(e) => set('year', +e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add KPI'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function KPIView() {
  const { user } = useAuth();
  const isOwner = can(user, 'kpis.write');
  const [kpis, setKpis] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    apiClient.get('/kpis').then((r) => {
      setKpis(r.data || []);
      logger.info('KPIs loaded', { count: r.data?.length || 0 });
    }).catch((e) => logger.error('Failed to load KPIs', { error: e.message }));
    if (isOwner) {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch((e) => logger.error('Failed to load clients', { error: e.message }));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalReach = kpis.reduce((s, k) => s + (k.reach || 0), 0);
  const avgEngagement = kpis.length ? (kpis.reduce((s, k) => s + (k.engagement_rate || 0), 0) / kpis.length).toFixed(1) : 0;
  const totalDM = kpis.reduce((s, k) => s + (k.dm_inquiries || 0), 0);
  const totalBookings = kpis.reduce((s, k) => s + (k.bookings || 0), 0);

  const byPlatform = PLATFORMS.map((p) => {
    const rows = kpis.filter((k) => k.platform === p.key);
    return {
      ...p,
      reach: rows.reduce((s, k) => s + (k.reach || 0), 0),
      engagement: rows.length ? (rows.reduce((s, k) => s + (k.engagement_rate || 0), 0) / rows.length).toFixed(1) : 0,
      followers: rows.reduce((s, k) => s + (k.followers_gained || 0), 0),
    };
  }).filter((p) => p.reach > 0);

  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || cid;

  const handleDeleteKPI = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      logger.userAction('KPIView', 'delete_kpi', { kpiId: deleteConfirm.id });
      await apiClient.delete(`/kpis/${deleteConfirm.id}`);
      setKpis(kpis.filter(k => k.id !== deleteConfirm.id));
      toast.success('KPI entry deleted successfully');
      logger.success('KPI deleted', { kpiId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete KPI';
      toast.error(errorMsg);
      logger.error('Failed to delete KPI', { kpiId: deleteConfirm.id, error: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">KPI tracker</h1>
          <p className="dash-sub">Reach, engagement, and what came of it.</p>
        </div>
        {isOwner && (
          <button onClick={() => setModal({})} className="dash-btn dash-btn-primary self-start">
            <Plus size={14} strokeWidth={2} />
            Add KPI
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { val: fmtNum(totalReach), label: 'Total reach' },
          { val: `${avgEngagement}%`, label: 'Avg engagement' },
          { val: totalDM, label: 'DM inquiries' },
          { val: totalBookings, label: 'New bookings' },
        ].map((s) => (
          <div key={s.label} className="dash-card p-5">
            <div className="font-anchor italic text-[1.55rem] text-white mb-1">{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dash-card p-5 mb-6">
        <div className="text-white font-medium text-sm mb-4">Platforms</div>
        {byPlatform.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No KPI data yet. Add entries to see performance.</div>
        ) : (
          byPlatform.map((p) => (
            <div key={p.key} className="flex flex-wrap items-center justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
              <div className="flex items-center gap-3 min-w-[160px]">
                <div>
                  <div className="text-white text-sm font-medium">{p.key}</div>
                  <div className="text-white/30 text-xs">All clients</div>
                </div>
              </div>
              <div className="flex gap-6 flex-wrap">
                {[
                  { val: fmtNum(p.reach), label: 'Reach' },
                  { val: `${p.engagement}%`, label: 'Engagement' },
                  { val: `+${fmtNum(p.followers)}`, label: 'Followers' },
                ].map((m) => (
                  <div key={m.label} className="text-right">
                    <div className="text-base font-medium text-white">{m.val}</div>
                    <div className="text-white/30 text-[10px]">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="dash-card p-5">
        <div className="text-white font-medium text-sm mb-4">Entries</div>
        {kpis.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No KPI entries yet.</div>
        ) : (
          <div className="space-y-2">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="flex items-center gap-3 py-3 px-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-all">
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{clientName(kpi.client_id)}</div>
                  <div className="text-white/30 text-xs">{kpi.platform} · {kpi.month}/{kpi.year} · Reach: {fmtNum(kpi.reach)}, Engagement: {kpi.engagement_rate}%, DMs: {kpi.dm_inquiries}, Bookings: {kpi.bookings}</div>
                </div>
                {isOwner && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setModal(kpi)}
                      className="dash-btn dash-btn-ghost dash-btn-sm"
                      title="Edit KPI">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(kpi)}
                      className="dash-btn dash-btn-danger dash-btn-sm"
                      title="Delete KPI">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && isOwner && clients.length > 0 && (
        <AddKPIModal
          clients={clients}
          onClose={() => setModal(null)}
          onSave={load}
          kpi={modal.id ? modal : undefined}
          isEdit={!!modal.id}
        />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete KPI Entry"
          message={`Are you sure you want to delete the KPI entry for ${clientName(deleteConfirm.client_id)} (${deleteConfirm.platform}, ${deleteConfirm.month}/${deleteConfirm.year})? This action cannot be undone.`}
          onConfirm={handleDeleteKPI}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
