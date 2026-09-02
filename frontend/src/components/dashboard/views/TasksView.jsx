import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, TASK_STATUSES } from '../../../lib/access';
import { ClientMark } from '../ClientMark';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

function TaskModal({ task, clients, staff, onClose, onSave }) {
  const isEdit = !!task?.id;
  const [form, setForm] = useState(task?.id ? task : {
    client_id: clients[0]?.id || '',
    owner_id: staff[0]?.id || '',
    title: '',
    brief: '',
    deadline: '',
    status: 'todo',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.client_id || !form.owner_id || !form.title?.trim()) {
      toast.error('Client, owner and title are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        owner_id: form.owner_id,
        title: form.title,
        brief: form.brief || '',
        deadline: form.deadline || null,
        status: form.status || 'todo',
      };
      if (isEdit) await apiClient.put(`/tasks/${form.id}`, payload);
      else await apiClient.post('/tasks', payload);
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onSave();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-overlay">
      <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-medium">{isEdit ? 'Edit task' : 'New task'}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Client</label>
            <select className={inputCls} value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Owner</label>
            <select className={inputCls} value={form.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
              {staff.map((s) => <option key={s.id} value={s.id} style={optStyle}>{s.name} · {s.job_label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What needs to be done" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Brief</label>
            <textarea className={inputCls + ' min-h-[90px]'} value={form.brief} onChange={(e) => set('brief', e.target.value)} placeholder="Context, references, definition of done" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Deadline</label>
              <input className={inputCls} type="date" value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} />
            </div>
            <div>
              <label className="block text-white/40 text-[10px] uppercase tracking-widest mb-1.5">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s.value} value={s.value} style={optStyle}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="dash-btn dash-btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="dash-btn dash-btn-primary flex-[2] h-10">
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TasksView() {
  const { user } = useAuth();
  const canWrite = can(user, 'tasks.write');
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [evidenceTask, setEvidenceTask] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/tasks'),
      apiClient.get('/clients'),
      apiClient.get('/users/directory').catch(() => ({ data: [] })),
    ]).then(([t, c, s]) => {
      setTasks(t.data || []);
      setClients(c.data || []);
      setStaff(s.data || []);
    }).catch(() => toast.error('Failed to load tasks')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEvidence = async () => {
    if (!evidenceText.trim() || !evidenceTask) return;
    try {
      await apiClient.post(`/tasks/${evidenceTask.id}/evidence`, { type: 'note', value: evidenceText.trim() });
      toast.success('Evidence added');
      setEvidenceText('');
      setEvidenceTask(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add evidence');
    }
  };

  const statusLabel = (v) => TASK_STATUSES.find((s) => s.value === v)?.label || v;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">Tasks</h1>
          <p className="dash-sub">Client, owner, deadline, brief, status, evidence.</p>
        </div>
        {canWrite && (
          <button onClick={() => setModal({})} className="dash-btn dash-btn-primary self-start" disabled={!clients.length}>
            <Plus size={14} strokeWidth={2} />
            New task
          </button>
        )}
      </div>

      {!clients.length && user?.role === 'employee' && (
        <div className="dash-card p-5 mb-6 text-sm text-white/50">
          You have no assigned clients yet. Ask an admin to assign you before work can appear here.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-white/30">No tasks yet.</div>
      ) : (
        <div className="dash-card overflow-hidden">
          {tasks.map((t) => {
            const cl = clientMap[t.client_id];
            const owner = staffMap[t.owner_id];
            return (
              <div key={t.id} className="px-4 sm:px-5 py-4 border-b border-white/[0.04] last:border-0">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                  <ClientMark client={cl || { name: '?' }} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white text-sm font-medium">{t.title}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/40 border border-white/10 rounded-full px-2 py-0.5">{statusLabel(t.status)}</span>
                    </div>
                    <div className="text-white/40 text-xs mt-1">
                      {cl?.name || 'Client'} · {owner?.name || 'Owner'}
                      {t.deadline ? ` · due ${t.deadline}` : ''}
                    </div>
                    {t.brief && <p className="text-white/50 text-sm mt-2 whitespace-pre-wrap">{t.brief}</p>}
                    {(t.evidence || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {t.evidence.map((ev) => (
                          <div key={ev.id} className="text-xs text-white/35">Evidence · {ev.value}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                  {canWrite && (
                    <div className="flex gap-1.5 flex-wrap pl-12 sm:pl-0 flex-shrink-0">
                      <button className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setEvidenceTask(t)}>Evidence</button>
                      <button className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => setModal(t)}>Edit</button>
                      <button className="dash-btn dash-btn-danger dash-btn-sm" onClick={() => setDeleteConfirm(t)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <TaskModal task={modal?.id ? modal : null} clients={clients} staff={staff} onClose={() => setModal(null)} onSave={load} />
      )}
      {evidenceTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">Add evidence</h2>
              <CloseButton onClick={() => setEvidenceTask(null)} />
            </div>
            <textarea className={inputCls + ' min-h-[80px]'} value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} placeholder="Link, note, or what you delivered" />
            <div className="flex gap-3 mt-4">
              <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setEvidenceTask(null)}>Cancel</button>
              <button className="dash-btn dash-btn-primary flex-[2]" onClick={addEvidence}>Save</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <DeleteConfirmDialog
          title="Delete task"
          message={`Delete "${deleteConfirm.title}"?`}
          onConfirm={async () => {
            try {
              await apiClient.delete(`/tasks/${deleteConfirm.id}`);
              toast.success('Task deleted');
              setDeleteConfirm(null);
              load();
            } catch (e) {
              toast.error(e.response?.data?.detail || 'Could not delete');
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
