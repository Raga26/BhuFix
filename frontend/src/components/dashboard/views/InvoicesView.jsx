import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { ClientMark } from '../ClientMark';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

export default function InvoicesView() {
  const { user } = useAuth();
  const canWrite = can(user, 'invoices.write');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ client_id: '', billing_period: '', due_date: '', tax_rate: 0, discount: 0 });

  const load = useCallback(() => {
    apiClient.get('/invoices').then((r) => setInvoices(r.data || [])).catch(() => toast.error('Failed to load invoices'));
    if (canWrite) apiClient.get('/clients').then((r) => setClients(r.data || [])).catch(() => {});
  }, [canWrite]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      const inv = (await apiClient.post('/invoices', form)).data;
      toast.success(`Created ${inv.number}`);
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not create invoice');
    }
  };

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">Invoices</h1>
          <p className="dash-sub">Numbers reserved as BF-YYYY-0001. Snapshot of the package at issue time.</p>
        </div>
        {canWrite && (
          <button className="dash-btn dash-btn-primary self-start" onClick={() => setModal(true)}>
            <Plus size={14} /> Draft invoice
          </button>
        )}
      </div>
      <div className="dash-card overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No invoices yet.</div>
        ) : invoices.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/[0.04] last:border-0">
            <ClientMark client={clientMap[inv.client_id] || { name: inv.client_name }} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{inv.number}</div>
              <div className="text-white/40 text-xs">{inv.client_name} · {inv.package_name} v{inv.package_version || '—'} · {inv.status}</div>
            </div>
            <div className="text-white text-sm">₹{Number(inv.total || 0).toLocaleString('en-IN')}</div>
            {canWrite && inv.status !== 'paid' && (
              <button
                className="dash-btn dash-btn-ghost dash-btn-sm"
                onClick={async () => {
                  await apiClient.patch(`/invoices/${inv.id}`, { status: 'paid' });
                  load();
                }}
              >Mark paid</button>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">Draft invoice</h2>
              <CloseButton onClick={() => setModal(false)} />
            </div>
            <div className="space-y-3">
              <select className={inputCls} value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                <option value="" style={optStyle}>Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name} · {c.package_name || c.level}</option>)}
              </select>
              <input className={inputCls} placeholder="Billing period e.g. Sep 2026" value={form.billing_period} onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value }))} />
              <input className={inputCls} type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setModal(false)}>Cancel</button>
              <button className="dash-btn dash-btn-primary flex-[2]" disabled={!form.client_id} onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
