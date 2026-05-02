import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

const ROLE_COLOR = {
  owner: '#E8734A',
  employee: '#A78BFA',
  client: '#4DD9FF',
};

function CreateUserModal({ clients, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', client_id: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.role === 'client' && !form.client_id) {
      toast.error('Please select a client profile for this user');
      logger.warn('UsersView: Attempted to create client user without profile selection');
      return;
    }
    setSaving(true);
    try {
      logger.formSubmit('UsersView', 'create_user', {
        name: form.name,
        email: form.email,
        role: form.role,
      });
      await apiClient.post('/users', form.role === 'client' ? form : { ...form, client_id: null });
      toast.success(`User "${form.name}" created successfully`);
      logger.success('New user created', { email: form.email, role: form.role });
      onSave();
      onClose();
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to create user';
      toast.error(errorMsg);
      logger.error('Failed to create user', { email: form.email, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0D0E1A] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold">🔐 Create User</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Full Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Email</label>
            <input className={inputCls} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Password</label>
            <input className={inputCls} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Role</label>
            <select className={inputCls} value={form.role} onChange={(e) => set('role', e.target.value)}>
              <option value="employee">Employee</option>
              <option value="client">Client</option>
            </select>
          </div>
          {form.role === 'client' && (
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Link to Client Profile</label>
              <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
                <option value="">— Select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-2.5 rounded-xl hover:bg-white/[0.1] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-[2] bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold py-2.5 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] disabled:opacity-60 transition-all">
            {saving ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersView() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/users'),
      apiClient.get('/clients'),
    ]).then(([ur, cr]) => {
      setUsers(ur.data || []);
      setClients(cr.data || []);
      setLoading(false);
      logger.info('Users list loaded', { count: ur.data?.length || 0 });
    }).catch((e) => {
      logger.error('Failed to load users', { error: e.message });
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return;
    setDeactivating(true);
    try {
      logger.userAction('UsersView', 'deactivate_user', { userId: deactivateConfirm.id, email: deactivateConfirm.email });
      await apiClient.delete(`/users/${deactivateConfirm.id}`);
      setUsers((u) => u.map((x) => x.id === deactivateConfirm.id ? { ...x, is_active: false } : x));
      toast.success(`User "${deactivateConfirm.name}" has been deactivated`);
      logger.success('User deactivated', { userId: deactivateConfirm.id });
      setDeactivateConfirm(null);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to deactivate user';
      toast.error(errorMsg);
      logger.error('Failed to deactivate user', { userId: deactivateConfirm.id, error: e.message });
    } finally {
      setDeactivating(false);
    }
  };

  const clientName = (cid) => cid ? clients.find((c) => c.id === cid)?.name || cid : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white font-extrabold text-2xl">User Management</h1>
          <p className="text-white/40 text-sm mt-1">Control who has access and what they can see</p>
        </div>
        <button onClick={() => setModal(true)}
          className="bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(232,115,74,0.35)] hover:-translate-y-0.5 transition-all">
          + Create User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_180px_120px_100px_80px] gap-4 px-5 py-3 border-b border-white/[0.06]">
            {['Name / Email', 'Linked Client', 'Role', 'Status', ''].map((h) => (
              <div key={h} className="text-white/30 text-[10px] uppercase tracking-widest">{h}</div>
            ))}
          </div>
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap md:grid md:grid-cols-[1fr_180px_120px_100px_80px] gap-4 items-center px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ROLE_COLOR[u.role]}, ${ROLE_COLOR[u.role]}99)` }}>
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{u.name}</div>
                  <div className="text-white/30 text-xs truncate">{u.email}</div>
                </div>
              </div>
              <div className="text-white/50 text-sm truncate">{clientName(u.client_id)}</div>
              <div>
                <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full capitalize"
                  style={{ background: `${ROLE_COLOR[u.role]}15`, color: ROLE_COLOR[u.role], border: `1px solid ${ROLE_COLOR[u.role]}40` }}>
                  {u.role}
                </span>
              </div>
              <div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${u.is_active ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.06] text-white/30'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-1 justify-end">
                {u.id !== user?.id && u.is_active && (
                  <button onClick={() => setDeactivateConfirm(u)}
                    className="text-[10px] text-white/20 hover:text-red-400 border border-white/[0.06] hover:border-red-400/30 px-2 py-1 rounded-lg transition-colors">
                    Disable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CreateUserModal clients={clients} onClose={() => setModal(false)} onSave={load} />
      )}

      {deactivateConfirm && (
        <DeleteConfirmDialog
          title="Deactivate User"
          message={`Are you sure you want to deactivate "${deactivateConfirm.name}" (${deactivateConfirm.email})? They will no longer be able to access the dashboard.`}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateConfirm(null)}
          isLoading={deactivating}
        />
      )}
    </div>
  );
}
