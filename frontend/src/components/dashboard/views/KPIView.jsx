import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

const PLATFORMS = [
  { key: 'Instagram', icon: '📸' },
  { key: 'TikTok', icon: '🎵' },
  { key: 'LinkedIn', icon: '💼' },
  { key: 'YouTube Shorts', icon: '▶️' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D0E1A] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">{isEdit ? 'Edit KPI Entry' : 'Add KPI Entry'}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <button onClick={onClose} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-2.5 rounded-xl hover:bg-white/[0.1] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold py-2.5 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] disabled:opacity-60 transition-all">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add KPI'}
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
  const isOwner = user?.role === 'owner';
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
    if (user?.role === 'owner') {
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
          <h1 className="text-white font-extrabold text-2xl">KPI Tracker</h1>
          <p className="text-white/40 text-sm mt-1">Performance metrics across all clients and platforms</p>
        </div>
        {isOwner && (
          <button onClick={() => setModal({})}
            className="bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] hover:-translate-y-0.5 transition-all self-start">
            + Add KPI
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '👁️', val: fmtNum(totalReach), label: 'Total Reach', color: '#4DD9FF' },
          { icon: '❤️', val: `${avgEngagement}%`, label: 'Avg Engagement', color: '#F472B6' },
          { icon: '💬', val: totalDM, label: 'DM Inquiries', color: '#A78BFA' },
          { icon: '🤝', val: totalBookings, label: 'New Bookings', color: '#34D399' },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-[-10px] right-[-10px] w-16 h-16 rounded-full blur-2xl opacity-20" style={{ background: s.color }} />
            <div className="text-xl mb-2">{s.icon}</div>
            <div className="text-2xl font-extrabold mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-white/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-6">
        <div className="text-white font-bold text-sm mb-4">Platform KPIs — All-time</div>
        {byPlatform.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No KPI data yet. Add entries to see performance.</div>
        ) : (
          byPlatform.map((p) => (
            <div key={p.key} className="flex flex-wrap items-center justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
              <div className="flex items-center gap-3 min-w-[160px]">
                <div className="text-xl w-8">{p.icon}</div>
                <div>
                  <div className="text-white text-sm font-semibold">{p.key}</div>
                  <div className="text-white/30 text-xs">All clients</div>
                </div>
              </div>
              <div className="flex gap-6 flex-wrap">
                {[
                  { val: fmtNum(p.reach), label: 'Reach', color: '#F472B6' },
                  { val: `${p.engagement}%`, label: 'Engagement', color: '#E8734A' },
                  { val: `+${fmtNum(p.followers)}`, label: 'Followers', color: '#34D399' },
                ].map((m) => (
                  <div key={m.label} className="text-right">
                    <div className="text-base font-bold" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-white/30 text-[10px]">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4">All KPI Entries</div>
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
                      className="h-6 px-2 rounded-md bg-blue-600/20 hover:bg-blue-600/40 text-[10px] text-blue-300 transition-colors"
                      title="Edit KPI">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(kpi)}
                      className="h-6 px-2 rounded-md bg-red-600/20 hover:bg-red-600/40 text-[10px] text-red-300 transition-colors"
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
