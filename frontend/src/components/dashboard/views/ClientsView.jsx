import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus } from 'lucide-react';

function parseIgHandle(raw) {
  if (!raw) return null;
  // Strip full URL patterns
  let handle = raw.trim();
  try {
    const url = new URL(handle.startsWith('http') ? handle : `https://${handle}`);
    if (url.hostname.includes('instagram.com')) {
      handle = url.pathname.replace(/\//g, '').split('?')[0];
    }
  } catch (_) {
    // not a URL, fall through
  }
  // Strip leading @
  handle = handle.replace(/^@/, '');
  return handle || null;
}

const InstagramIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
  </svg>
);

const LEVEL_STYLE = {
  Silver:     { bg: 'rgba(156,163,175,0.12)', color: '#9CA3AF', border: 'rgba(156,163,175,0.25)', gradient: 'linear-gradient(135deg,#9CA3AF,#D1D5DB)' },
  Gold:       { bg: 'rgba(232,115,74,0.12)',  color: '#E8734A', border: 'rgba(232,115,74,0.3)',   gradient: 'linear-gradient(135deg,#E8734A,#D4633D)' },
  Diamond:    { bg: 'rgba(77,217,255,0.1)',   color: '#4DD9FF', border: 'rgba(77,217,255,0.25)',  gradient: 'linear-gradient(135deg,#4DD9FF,#A78BFA)' },
  Customised: { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)', gradient: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
};

function ClientCard({ client, onEdit, onDelete, onPostReport, canMutate }) {
  const ls = LEVEL_STYLE[client.level] || LEVEL_STYLE.Silver;
  const pct = client.monthly_progress || 0;
  return (
    <div className="dash-card p-5 hover:border-white/[0.14] transition-colors relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white bg-navy border border-white/[0.08]">
          {client.name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{client.name}</div>
          <div className="text-white/40 text-xs flex items-center gap-1.5 flex-wrap">
            <span>{client.industry}</span>
            {parseIgHandle(client.ig_handle) && (
              <>
                <span>·</span>
                <a
                  href={`https://www.instagram.com/${parseIgHandle(client.ig_handle)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-white/40 hover:text-[#E1306C] transition-colors"
                  title={`@${parseIgHandle(client.ig_handle)} on Instagram`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <InstagramIcon />
                  <span className="truncate max-w-[100px]">@{parseIgHandle(client.ig_handle)}</span>
                </a>
              </>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: ls.bg, color: ls.color, border: `1px solid ${ls.border}` }}>
          {client.level}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { val: client.followers, label: 'Followers' },
          { val: client.reels_count, label: 'Reels' },
          { val: client.ad_budget ? `₹${(client.ad_budget/1000).toFixed(0)}K` : '—', label: 'Budget' },
        ].map((m) => (
          <div key={m.label} className="bg-white/[0.03] rounded-xl py-2 text-center">
            <div className="text-white font-bold text-sm">{m.val}</div>
            <div className="text-white/30 text-[10px]">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-white/30 mb-1">
        <span>Monthly Progress</span><span>{pct}%</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: ls.color }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-white/30 text-xs">{client.start_date || 'New'}</span>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <button onClick={() => onPostReport(client)}
            className="dash-btn dash-btn-ghost dash-btn-sm"
            title="Monthly post report">
            Report
          </button>
          {client.drive_link && (
            <a href={client.drive_link} target="_blank" rel="noreferrer"
              className="dash-btn dash-btn-ghost dash-btn-sm">
              Drive
            </a>
          )}
          {canMutate && (
            <>
              <button onClick={() => onEdit(client)}
                className="dash-btn dash-btn-ghost dash-btn-sm"
                title="Edit client">
                Edit
              </button>
              <button onClick={() => onDelete(client)}
                className="dash-btn dash-btn-danger dash-btn-sm"
                title="Delete client">
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientModal({ client, clients, onClose, onSave }) {
  const isEdit = !!client?.id;
  const [form, setForm] = useState(
    client || { name: '', industry: '', level: 'Silver', logo_emoji: '', ig_handle: '', followers: '', reels_count: '', ad_budget: '', drive_link: '', start_date: '', monthly_progress: '' }
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v) || 0);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Client name is required');
      logger.warn('ClientModal: Attempted save without client name');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      reels_count: toNum(form.reels_count),
      ad_budget: toNum(form.ad_budget),
      ad_spent: toNum(form.ad_spent),
      monthly_progress: toNum(form.monthly_progress),
    };
    try {
      logger.formSubmit('ClientsView', isEdit ? 'update_client' : 'create_client', {
        name: form.name,
        industry: form.industry,
        level: form.level,
      });
      if (isEdit) {
        await apiClient.put(`/clients/${form.id}`, payload);
        toast.success('Client updated successfully');
        logger.success('Client updated', { clientId: form.id });
      } else {
        await apiClient.post('/clients', payload);
        toast.success('Client added successfully');
        logger.success('New client created', { name: form.name });
      }
      onSave();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to save client';
      toast.error(errorMsg);
      logger.error('Failed to save client', { isEdit, error: e.message, detail: e.response?.data });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";
  const optStyle = { background: '#0D0E1A', color: '#fff' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="dash-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-medium text-lg">{isEdit ? 'Edit client' : 'New client'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Vaibha Wedding" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Industry</label>
            <input className={inputCls} value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Wedding & Events" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Level</label>
            <select className={inputCls} value={form.level} onChange={(e) => set('level', e.target.value)}>
              <option value="Silver" style={optStyle}>Silver</option>
              <option value="Gold" style={optStyle}>Gold</option>
              <option value="Diamond" style={optStyle}>Diamond</option>
              <option value="Customised" style={optStyle}>Customised</option>
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Start Date</label>
            <input className={inputCls} type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Instagram Handle</label>
            <input className={inputCls} value={form.ig_handle} onChange={(e) => set('ig_handle', e.target.value)} placeholder="@handle" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Initials</label>
            <input className={inputCls} value={form.logo_emoji} onChange={(e) => set('logo_emoji', e.target.value)} placeholder="e.g. VW" maxLength={3} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Ad Budget (₹)</label>
            <input className={inputCls} type="number" value={form.ad_budget} onChange={(e) => set('ad_budget', e.target.value ? +e.target.value : '')} placeholder="Enter budget" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Progress %</label>
            <input className={inputCls} type="number" min="0" max="100" value={form.monthly_progress} onChange={(e) => set('monthly_progress', e.target.value ? +e.target.value : '')} placeholder="0-100" />
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Google Drive Link</label>
          <input className={inputCls} value={form.drive_link} onChange={(e) => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === 'owner';
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    apiClient.get('/clients').then((r) => {
      setClients(r.data || []);
      setLoading(false);
      logger.info('Clients list loaded', { count: r.data?.length || 0 });
    }).catch((e) => {
      logger.error('Failed to load clients', { error: e.message });
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = clients.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClient = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      logger.userAction('ClientsView', 'delete_client', { clientId: deleteConfirm.id, name: deleteConfirm.name });
      await apiClient.delete(`/clients/${deleteConfirm.id}`);
      setClients(clients.filter(c => c.id !== deleteConfirm.id));
      toast.success(`Client "${deleteConfirm.name}" deleted successfully`);
      logger.success('Client deleted', { clientId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete client';
      toast.error(errorMsg);
      logger.error('Failed to delete client', { clientId: deleteConfirm.id, error: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">Clients</h1>
          <p className="dash-sub">Everyone on the floor.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="dash-input w-48"
          />
          {user?.role === 'owner' && (
            <button onClick={() => setModal({})} className="dash-btn dash-btn-primary whitespace-nowrap">
              <Plus size={14} strokeWidth={2} />
              Add client
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          {search ? 'No clients found for your search.' : 'No clients yet. Add your first client!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onEdit={(cl) => setModal(cl)}
              onDelete={(cl) => setDeleteConfirm(cl)}
              onPostReport={(cl) => navigate(`/dashboard/clients/${cl.id}/post-report`)}
              canMutate={isOwner}
            />
          ))}
        </div>
      )}

      {modal !== null && (
        <ClientModal client={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={load} />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete Client"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteClient}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
