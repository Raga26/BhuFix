import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import logger from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';
import { Plus } from 'lucide-react';

// Map sub_role → display label + colour
const SUB_ROLE_META = {
  editor:       { label: 'Editor',          color: '#34D399' }, // green
  videographer: { label: 'Videographer',    color: '#60A5FA' }, // blue
  management:   { label: 'Management Team', color: '#F59E0B' }, // amber
  digital_marketer: { label: 'Digital Marketer', color: '#22C55E' },
  graphic_designer: { label: 'Graphic Designer', color: '#F472B6' },
  content_writer:   { label: 'Content Writer',   color: '#38BDF8' },
};

const ROLE_COLOR = {
  owner: '#E8734A',
  employee: '#A78BFA',
  client: '#4DD9FF',
};

function getRoleDisplay(u) {
  if (u.sub_role && SUB_ROLE_META[u.sub_role]) return SUB_ROLE_META[u.sub_role];
  if (u.sub_role) return { label: u.sub_role, color: ROLE_COLOR.employee };
  if (u.role === 'owner')    return { label: 'Owner',    color: ROLE_COLOR.owner };
  if (u.role === 'client')   return { label: 'Client',   color: ROLE_COLOR.client };
  return { label: 'Employee', color: ROLE_COLOR.employee };
}

// Role labels describe a team member's job.  Their dashboard access remains
// employee access; only the configured owner account can be an owner.
const ROLE_OPTIONS = [
  { value: 'editor',        label: 'Editor',          role: 'employee', sub_role: 'editor' },
  { value: 'videographer',  label: 'Videographer',    role: 'employee', sub_role: 'videographer' },
  { value: 'management',    label: 'Management Team', role: 'employee', sub_role: 'management' },
  { value: 'digital_marketer', label: 'Digital Marketer', role: 'employee', sub_role: 'digital_marketer' },
  { value: 'graphic_designer', label: 'Graphic Designer', role: 'employee', sub_role: 'graphic_designer' },
  { value: 'content_writer',   label: 'Content Writer',   role: 'employee', sub_role: 'content_writer' },
  { value: 'custom',        label: 'Custom role',      role: 'employee', sub_role: null },
  { value: 'client',        label: 'Client',          role: 'client',   sub_role: null },
];

function getRoleOption(user) {
  if (user.sub_role && ROLE_OPTIONS.find((o) => o.value === user.sub_role)) return user.sub_role;
  if (user.role === 'client') return 'client';
  if (user.sub_role) return 'custom';
  return 'editor'; // default fallback for legacy employees
}

function getRolePayload(form, selectedOpt) {
  return {
    role: selectedOpt.role,
    sub_role: form.roleOption === 'custom' ? form.customRole.trim() : selectedOpt.sub_role,
  };
}

function CreateUserModal({ clients, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', roleOption: 'editor', customRole: '', client_id: '' });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0D0E1A_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]";

  const selectedOpt = ROLE_OPTIONS.find((o) => o.value === form.roleOption) || ROLE_OPTIONS[0];
  const optStyle = { background: '#0D0E1A', color: '#fff' };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
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
      const rolePayload = getRolePayload(form, selectedOpt);
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        ...rolePayload,
        client_id: selectedOpt.role === 'client' ? form.client_id : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="dash-modal p-6 w-full max-w-md">
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
              <optgroup label="Team" style={optStyle}>
                <option value="editor" style={optStyle}>Editor</option>
                <option value="videographer" style={optStyle}>Videographer</option>
                <option value="management" style={optStyle}>Management Team</option>
                <option value="digital_marketer" style={optStyle}>Digital Marketer</option>
                <option value="graphic_designer" style={optStyle}>Graphic Designer</option>
                <option value="content_writer" style={optStyle}>Content Writer</option>
                <option value="custom" style={optStyle}>Custom role…</option>
              </optgroup>
              <optgroup label="Other" style={optStyle}>
                <option value="client" style={optStyle}>Client</option>
              </optgroup>
            </select>
            {form.roleOption === 'management' && (
              <p className="text-amber-400/70 text-[10px] mt-1.5">Management Team has employee access.</p>
            )}
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

function EditUserModal({ editUser, clients, onClose, onSave }) {
  const [form, setForm] = useState({
    name: editUser.name,
    roleOption: getRoleOption(editUser),
    customRole: getRoleOption(editUser) === 'custom' ? editUser.sub_role || '' : '',
    client_id: editUser.client_id || '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors [&:-webkit-autofill]:shadow-[0_0_0_1000px_#0D0E1A_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]";

  const selectedOpt = ROLE_OPTIONS.find((o) => o.value === form.roleOption) || ROLE_OPTIONS[0];
  const optStyle = { background: '#0D0E1A', color: '#fff' };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.roleOption === 'custom' && !form.customRole.trim()) { toast.error('Please enter a custom role'); return; }
    setSaving(true);
    try {
      const rolePayload = getRolePayload(form, selectedOpt);
      const payload = {
        name: form.name,
        ...rolePayload,
        client_id: selectedOpt.role === 'client' ? form.client_id || null : null,
      };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="dash-modal p-6 w-full max-w-md">
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
              <optgroup label="Team" style={optStyle}>
                <option value="editor" style={optStyle}>Editor</option>
                <option value="videographer" style={optStyle}>Videographer</option>
                <option value="management" style={optStyle}>Management Team</option>
                <option value="digital_marketer" style={optStyle}>Digital Marketer</option>
                <option value="graphic_designer" style={optStyle}>Graphic Designer</option>
                <option value="content_writer" style={optStyle}>Content Writer</option>
                <option value="custom" style={optStyle}>Custom role…</option>
              </optgroup>
              <optgroup label="Other" style={optStyle}>
                <option value="client" style={optStyle}>Client</option>
              </optgroup>
            </select>
            {form.roleOption === 'management' && (
              <p className="text-amber-400/70 text-[10px] mt-1.5">Management Team has employee access.</p>
            )}
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

  const clientName = (cid) => cid ? clients.find((c) => c.id === cid)?.name || cid : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="dash-title">People</h1>
          <p className="dash-sub">Who can get in, and what they can see.</p>
        </div>
        <button onClick={() => setModal(true)} className="dash-btn dash-btn-primary">
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
              <div className="text-white/50 text-sm truncate">{clientName(u.client_id)}</div>
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
        <CreateUserModal clients={clients} onClose={() => setModal(false)} onSave={load} />
      )}

      {editModal && (
        <EditUserModal editUser={editModal} clients={clients} onClose={() => setEditModal(null)} onSave={load} />
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
