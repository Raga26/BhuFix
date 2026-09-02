import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus } from 'lucide-react';

const COLORS = ['#E8734A', '#4DD9FF', '#A78BFA', '#34D399', '#F472B6', '#F59E0B'];

function AddCampaignModal({ clients, onClose, onSave, campaign, isEdit }) {
  const now = new Date();
  const [form, setForm] = useState(campaign || { client_id: clients[0]?.id || '', platform: 'Meta', budget: '', spent: '', month: now.getMonth() + 1, year: now.getFullYear() });
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
      logger.formSubmit('AdsView', isEdit ? 'update_campaign' : 'create_campaign', {
        client_id: form.client_id,
        platform: form.platform,
      });
      if (isEdit) {
        await apiClient.put(`/ads/${form.id}`, form);
        toast.success('Campaign updated successfully');
        logger.success('Campaign updated', { campaignId: form.id });
      } else {
        await apiClient.post('/ads', form);
        toast.success('Campaign added successfully');
        logger.success('New campaign created', { platform: form.platform });
      }
      onSave();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to save campaign';
      toast.error(errorMsg);
      logger.error('Failed to save campaign', { isEdit, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit campaign' : 'Add campaign'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Platform</label>
            <input className={inputCls} value={form.platform} onChange={(e) => set('platform', e.target.value)} placeholder="Meta, Google, etc." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Budget (₹)</label>
              <input className={inputCls} type="number" value={form.budget} onChange={(e) => set('budget', e.target.value ? +e.target.value : '')} placeholder="Enter budget" />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Spent (₹)</label>
              <input className={inputCls} type="number" value={form.spent} onChange={(e) => set('spent', e.target.value ? +e.target.value : '')} placeholder="Enter amount" />
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
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    apiClient.get('/ads').then((r) => {
      setAds(r.data || []);
      logger.info('Ads campaigns loaded', { count: r.data?.length || 0 });
    }).catch((e) => logger.error('Failed to load ads', { error: e.message }));
    if (user?.role !== 'client') {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch((e) => logger.error('Failed to load clients', { error: e.message }));
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalBudget = ads.reduce((s, a) => s + (a.budget || 0), 0);
  const totalSpent = ads.reduce((s, a) => s + (a.spent || 0), 0);
  const overallPct = totalBudget ? Math.round(totalSpent / totalBudget * 100) : 0;

  const clientName = (cid) => clients.find((c) => c.id === cid)?.name || cid;

  const handleDeleteCampaign = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      logger.userAction('AdsView', 'delete_campaign', { campaignId: deleteConfirm.id });
      await apiClient.delete(`/ads/${deleteConfirm.id}`);
      setAds(ads.filter(a => a.id !== deleteConfirm.id));
      toast.success('Campaign deleted successfully');
      logger.success('Campaign deleted', { campaignId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete campaign';
      toast.error(errorMsg);
      logger.error('Failed to delete campaign', { campaignId: deleteConfirm.id, error: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">Ads</h1>
          <p className="dash-sub">Monthly spend against the brief.</p>
        </div>
        {can(user, 'ads.write') && (
          <button onClick={() => setModal({})} className="dash-btn dash-btn-primary self-start">
            <Plus size={14} strokeWidth={2} />
            Add campaign
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="dash-card p-5">
          <div className="font-anchor italic text-[1.55rem] text-white mb-1">{fmt(totalBudget)}</div>
          <div className="text-white/40 text-xs">Monthly budget</div>
        </div>
        <div className="dash-card p-5">
          <div className="font-anchor italic text-[1.55rem] text-white mb-1">{fmt(totalSpent)}</div>
          <div className="text-white/40 text-xs">Spent · {overallPct}% of budget</div>
        </div>
      </div>

      <div className="dash-card p-5">
        <div className="text-white font-medium text-sm mb-4">Campaigns</div>
        {ads.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No campaigns yet.</div>
        ) : (
          <div className="space-y-2">
            {ads.map((ad, i) => {
              const pct = ad.budget ? Math.round(ad.spent / ad.budget * 100) : 0;
              const color = COLORS[i % COLORS.length];
              return (
                <div key={ad.id} className="flex items-center gap-4 py-3.5 px-3 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="min-w-[140px]">
                    <div className="text-white text-sm font-medium">{clientName(ad.client_id)}</div>
                    <div className="text-white/30 text-xs">{ad.platform} · {ad.month}/{ad.year}</div>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-white/30">
                      <span>{fmt(ad.spent)} spent</span>
                      <span>{fmt(ad.budget)} budget</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold min-w-[40px] text-right" style={{ color }}>{pct}%</div>
                  {can(user, 'ads.write') && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setModal(ad)}
                        className="dash-btn dash-btn-ghost dash-btn-sm"
                        title="Edit campaign">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ad)}
                        className="dash-btn dash-btn-danger dash-btn-sm"
                        title="Delete campaign">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && clients.length > 0 && (
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
          message={`Are you sure you want to delete this ad campaign for ${clientName(deleteConfirm.client_id)} (${deleteConfirm.platform})? This action cannot be undone.`}
          onConfirm={handleDeleteCampaign}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
