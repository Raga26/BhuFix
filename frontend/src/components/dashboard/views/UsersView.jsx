import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { JOB_OPTIONS, jobLabel } from '../../../lib/access';
import { Plus } from 'lucide-react';

const ROLE_COLOR = {
  owner: '#E8734A',
  admin: '#F59E0B',
  operations_manager: '#60A5FA',
  employee: '#A78BFA',
  client: '#4DD9FF',
};

function getRoleDisplay(u) {
  if (u.role === 'owner') return { label: 'Owner', color: ROLE_COLOR.owner };
  if (u.role === 'admin') return { label: 'Admin', color: ROLE_COLOR.admin };
  if (u.role === 'operations_manager') return { label: 'Operations Manager', color: ROLE_COLOR.operations_manager };
  if (u.role === 'client') return { label: 'Client', color: ROLE_COLOR.client };
  return { label: jobLabel(u), color: ROLE_COLOR.employee };
}

function optionForUser(user) {
  if (user.role === 'client') return 'client';
  if (user.role === 'admin') return 'admin';
  if (user.role === 'operations_manager') return 'operations_manager';
  if (user.job_role && JOB_OPTIONS.find((o) => o.value === user.job_role)) return user.job_role;
  if (user.job_role === 'custom' || user.sub_role) return 'custom';
  return 'junior_editor';
}

function payloadFromOption(form, selected) {
  if (selected.role === 'client') {
    return { role: 'client', job_role: 'client', client_id: form.client_id || null, assigned_client_ids: [] };
  }
  if (selected.role === 'admin' || selected.role === 'operations_manager') {
    return { role: selected.role, job_role: selected.value, client_id: null, assigned_client_ids: form.assigned_client_ids || [] };
  }
  return {
    role: 'employee',
    job_role: form.roleOption === 'custom' ? 'custom' : selected.value,
    sub_role: form.roleOption === 'custom' ? form.customRole.trim() : selected.value,
    client_id: null,
    assigned_client_ids: form.assigned_client_ids || [],
  };
}

function ClientAssignCheckboxes({ clients, selectedIds, onChange }) {
  const selected = selectedIds || [];
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  if (!clients.length) {
    return <p className="text-white/40 text-xs">Add clients first, then assign them here.</p>;
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="text-white/40 text-[10px] uppercase tracking-widest">Assigned clients</label>
        <div className="flex gap-3 flex-shrink-0">
          <button type="button" className="text-[10px] text-[#E8734A] min-h-8 px-1" onClick={() => onChange(clients.map((c) => c.id))}>Select all</button>
          <button type="button" className="text-[10px] text-white/40 min-h-8 px-1" onClick={() => onChange([])}>Clear</button>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-1.5 space-y-0.5">
        {clients.map((c) => {
          const on = selected.includes(c.id);
          return (
            <label key={c.id} className="flex items-center gap-3 px-2 min-h-11 rounded-lg hover:bg-white/[0.04] cursor-pointer">
              <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="accent-[#E8734A] w-4 h-4 flex-shrink-0" />
              <span className="text-white text-sm truncate">{c.name}</span>
              {c.industry && <span className="text-white/30 text-xs truncate ml-auto">{c.industry}</span>}
            </label>
          );
        })}
      </div>
      <p className="text-white/30 text-[10px] mt-1.5">{selected.length} client{selected.length === 1 ? '' : 's'} selected. Staff see only these.</p>
    </div>
  );
}

function CreateUserModal({ clients, onClose, onSave, actor }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleOption: 'junior_editor', customRole: '', client_id: '', assigned_client_ids: [] });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0D0E1A_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]";

  const options = JOB_OPTIONS.filter((o) => {
    if (o.role === 'admin') return actor?.role === 'owner';
    if (o.role === 'operations_manager') return actor?.role === 'owner' || actor?.role === 'admin';
    return true;
  });
  const selectedOpt = options.find((o) => o.value === form.roleOption) || options[0];
  const optStyle = { background: '#0D0E1A', color: '#fff' };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.roleOption === 'custom' && !form.customRole.trim()) {
      toast.error('Please enter a custom role');
      return;
    }
    if (selectedOpt.role === 'client' && !form.client_id) {
      toast.error('Please select a client profile for this user');
      return;
    }
    setSaving(true);
    try {
      const rolePayload = payloadFromOption(form, selectedOpt);
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        ...rolePayload,
      };
      logger.formSubmit('UsersView', 'create_user', { name: form.name, email: form.email, ...rolePayload });
      await apiClient.post('/users', payload);
      toast.success(`User "${form.name}" created successfully`);
      logger.success('New user created', { email: form.email, ...rolePayload });
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
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">Create user</h2>
          <CloseButton onClick={onClose} />
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
            <div className="relative">
              <input
                className={inputCls + ' pr-14'}
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E8734A] hover:text-[#E8734A]/80 text-xs font-semibold transition-colors px-1 select-none"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Role / Type</label>
            <select className={inputCls} value={form.roleOption} onChange={(e) => set('roleOption', e.target.value)}>
              {['Leadership', 'Marketing', 'Creative', 'Technology', 'Operations', 'External'].map((g) => {
                const opts = options.filter((o) => o.group === g);
                if (!opts.length) return null;
                return (
                  <optgroup key={g} label={g} style={optStyle}>
                    {opts.map((o) => <option key={o.value} value={o.value} style={optStyle}>{o.label}</option>)}
                  </optgroup>
                );
              })}
            </select>
            {form.roleOption === 'custom' && (
              <input className={inputCls + ' mt-2'} value={form.customRole} onChange={(e) => set('customRole', e.target.value)} placeholder="e.g. Cleaner" />
            )}
          </div>
          {selectedOpt.role === 'client' && (
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Link to Client Profile</label>
              <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
                <option value="" style={optStyle}>— Select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
              </select>
            </div>
          )}
          {selectedOpt.role === 'employee' && (
            <ClientAssignCheckboxes
              clients={clients}
              selectedIds={form.assigned_client_ids}
              onChange={(ids) => set('assigned_client_ids', ids)}
            />
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ editUser, clients, onClose, onSave, actor }) {
  const [form, setForm] = useState({
    name: editUser.name,
    roleOption: optionForUser(editUser),
    customRole: optionForUser(editUser) === 'custom' ? (editUser.job_title || editUser.sub_role || '') : '',
    client_id: editUser.client_id || '',
    assigned_client_ids: editUser.assigned_client_ids || [],
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0D0E1A_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]";

  const options = JOB_OPTIONS.filter((o) => {
    if (o.role === 'admin') return actor?.role === 'owner';
    if (o.role === 'operations_manager') return actor?.role === 'owner' || actor?.role === 'admin';
    return true;
  });
  const selectedOpt = options.find((o) => o.value === form.roleOption) || options[0];
  const optStyle = { background: '#0D0E1A', color: '#fff' };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (selectedOpt.role === 'client' && !form.client_id) {
      toast.error('Please select a client profile for this user');
      return;
    }
    if (form.roleOption === 'custom' && !form.customRole.trim()) { toast.error('Please enter a custom role'); return; }
    setSaving(true);
    try {
      const rolePayload = payloadFromOption(form, selectedOpt);
      const payload = { name: form.name, ...rolePayload };
      await apiClient.put(`/users/${editUser.id}`, payload);
      toast.success('User updated successfully');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResettingPw(true);
    try {
      await apiClient.put(`/users/${editUser.id}/reset-password`, { password: newPassword });
      toast.success('Password reset successfully');
      setNewPassword('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResettingPw(false);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">Edit user</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Full Name</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Email (cannot change)</label>
            <input className={inputCls + ' opacity-40 cursor-not-allowed'} value={editUser.email} readOnly />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Role / Type</label>
            <select className={inputCls} value={form.roleOption} onChange={(e) => set('roleOption', e.target.value)}>
              {['Leadership', 'Marketing', 'Creative', 'Technology', 'Operations', 'External'].map((g) => {
                const opts = options.filter((o) => o.group === g);
                if (!opts.length) return null;
                return (
                  <optgroup key={g} label={g} style={optStyle}>
                    {opts.map((o) => <option key={o.value} value={o.value} style={optStyle}>{o.label}</option>)}
                  </optgroup>
                );
              })}
            </select>
            {form.roleOption === 'custom' && (
              <input className={inputCls + ' mt-2'} value={form.customRole} onChange={(e) => set('customRole', e.target.value)} placeholder="e.g. Cleaner" />
            )}
          </div>
          {selectedOpt.role === 'client' && (
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Linked Client Profile</label>
              <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
                <option value="" style={optStyle}>— Select client —</option>
                {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
              </select>
            </div>
          )}
          {selectedOpt.role === 'employee' && editUser.role !== 'owner' && (
            <ClientAssignCheckboxes
              clients={clients}
              selectedIds={form.assigned_client_ids}
              onChange={(ids) => set('assigned_client_ids', ids)}
            />
          )}
        </div>

        <div className="flex gap-3 mb-5">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="border-t border-white/[0.08] pt-4">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Reset Password</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                className={inputCls + ' pr-14'}
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E8734A] hover:text-[#E8734A]/80 text-xs font-semibold transition-colors px-1 select-none"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            <button onClick={handleResetPassword} disabled={resettingPw || newPassword.length < 6}
              className="bg-white/[0.08] border border-white/[0.12] text-white/70 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/[0.14] disabled:opacity-40 transition-all whitespace-nowrap">
              {resettingPw ? '…' : 'Reset'}
            </button>
          </div>
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
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/users'),
      apiClient.get('/clients'),
    ]).then(([ur, cr]) => {
      setUsers((ur.data || []).filter((u) => u.is_active !== false));
      setClients(cr.data || []);
      setLoading(false);
      logger.info('Users list loaded', { count: ur.data?.length || 0 });
    }).catch((e) => {
      logger.error('Failed to load users', { error: e.message });
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      logger.userAction('UsersView', 'delete_user', { userId: deleteConfirm.id, email: deleteConfirm.email });
      await apiClient.delete(`/users/${deleteConfirm.id}`);
      setUsers((u) => u.filter((x) => x.id !== deleteConfirm.id));
      toast.success(`User "${deleteConfirm.name}" has been deleted`);
      logger.success('User deleted', { userId: deleteConfirm.id });
      setDeleteConfirm(null);
    } catch (e) {
      const errorMsg = e.response?.data?.detail || 'Failed to delete user';
      toast.error(errorMsg);
      logger.error('Failed to delete user', { userId: deleteConfirm.id, error: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const clientName = (u) => {
    if (u.role === 'client') return u.client_id ? clients.find((c) => c.id === u.client_id)?.name || u.client_id : '—';
    const ids = u.assigned_client_ids || [];
    if (!ids.length) return 'None assigned';
    return ids.map((id) => clients.find((c) => c.id === id)?.name || id).join(', ');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">People</h1>
          <p className="dash-sub">Who can get in, and what they can see.</p>
        </div>
        <button onClick={() => setModal(true)} className="dash-btn dash-btn-primary self-start">
          <Plus size={14} strokeWidth={2} />
          Create user
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="dash-card overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(220px,1fr)_180px_160px_140px] gap-4 px-5 py-3 border-b border-white/[0.06]">
            {['Name / Email', 'Linked Client', 'Role', 'Actions'].map((h) => (
              <div key={h} className="text-white/30 text-[10px] uppercase tracking-widest">{h}</div>
            ))}
          </div>
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap md:grid md:grid-cols-[minmax(220px,1fr)_180px_160px_140px] gap-4 items-center px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 bg-navy border border-white/[0.08]">
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{u.name}</div>
                  <div className="text-white/30 text-xs truncate">{u.email}</div>
                </div>
              </div>
              <div className="text-white/50 text-sm truncate">{clientName(u)}</div>
              <div className="min-w-0">
                {(() => { const rd = getRoleDisplay(u); return (
                  <span className="flex w-full min-h-7 items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase leading-4"
                    style={{ background: `${rd.color}15`, color: rd.color, border: `1px solid ${rd.color}40` }}>
                    <span className="block min-w-0 break-words text-center">{rd.label}</span>
                  </span>
                ); })()}
              </div>
              <div className="flex gap-1.5">
                {u.id !== user?.id && (
                  <>
                    <button onClick={() => setEditModal(u)}
                      className="dash-btn dash-btn-ghost dash-btn-sm">
                      Edit
                    </button>
                    {u.role !== 'owner' && (
                      <button onClick={() => setDeleteConfirm(u)}
                        className="dash-btn dash-btn-danger dash-btn-sm">
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CreateUserModal clients={clients} actor={user} onClose={() => setModal(false)} onSave={load} />
      )}

      {editModal && (
        <EditUserModal editUser={editModal} clients={clients} actor={user} onClose={() => setEditModal(null)} onSave={load} />
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete user"
          message={`This permanently deletes "${deleteConfirm.name}" (${deleteConfirm.email}) from the team. They will be removed from chat and will not be able to sign in. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
