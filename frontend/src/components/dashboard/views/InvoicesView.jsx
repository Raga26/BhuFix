import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { ClientMark } from '../ClientMark';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

async function downloadInvoice(id, number) {
  const r = await apiClient.get(`/invoices/${id}/document`, { responseType: 'text' });
  const blob = new Blob([r.data], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${number || 'invoice'}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

async function printInvoice(id) {
  const r = await apiClient.get(`/invoices/${id}/document`, { responseType: 'text' });
  const w = window.open('', '_blank');
  if (!w) {
    toast.error('Allow pop-ups to print');
    return;
  }
  w.document.write(r.data);
  w.document.close();
  w.focus();
  w.print();
}

export default function InvoicesView() {
  const { user } = useAuth();
  const canWrite = can(user, 'invoices.write');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(false);
  const [open, setOpen] = useState(null);
  const [payAmt, setPayAmt] = useState('');
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
          <p className="dash-sub">{canWrite ? 'Draft from the package snapshot, send to the client, record payments, download.' : 'Invoices sent to you. Download or print as PDF from the browser.'}</p>
        </div>
        {canWrite && (
          <button className="dash-btn dash-btn-primary self-start min-h-[44px]" onClick={() => setModal(true)}>
            <Plus size={14} /> Draft invoice
          </button>
        )}
      </div>
      <div className="dash-card overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No invoices yet.</div>
        ) : invoices.map((inv) => (
          <button key={inv.id} type="button" onClick={() => { setOpen(inv); setPayAmt(''); }} className="w-full text-left flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/[0.04] last:border-0">
            <ClientMark client={clientMap[inv.client_id] || { name: inv.client_name }} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{inv.number}</div>
              <div className="text-white/40 text-xs">{inv.client_name} · {inv.package_name} v{inv.package_version || '—'} · {inv.status}</div>
            </div>
            <div className="text-white text-sm">₹{Number(inv.total || 0).toLocaleString('en-IN')}</div>
          </button>
        ))}
      </div>

      {open && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.number}</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            <p className="text-white/50 text-sm mb-3">{open.client_name} · {open.package_name} · ₹{Number(open.total || 0).toLocaleString('en-IN')} · {open.status}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => downloadInvoice(open.id, open.number).catch((e) => toast.error(apiError(e, 'Download failed')))}>Download</button>
              <button type="button" className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => printInvoice(open.id).catch((e) => toast.error(apiError(e, 'Print failed')))}>Print / PDF</button>
            </div>
            {(open.payments || []).length > 0 && (
              <div className="text-xs text-white/45 mb-3 space-y-1">
                {(open.payments || []).map((p) => (
                  <div key={p.id}>₹{p.amount} · {p.method} · {(p.created_at || '').slice(0, 10)}</div>
                ))}
              </div>
            )}
            {canWrite && open.status === 'draft' && (
              <button type="button" className="dash-btn dash-btn-primary w-full min-h-[44px] mb-2" onClick={async () => {
                try {
                  const r = await apiClient.post(`/invoices/${open.id}/send`, {});
                  toast.success('Sent to the client');
                  setOpen(r.data);
                  load();
                } catch (e) { toast.error(apiError(e, 'Could not send')); }
              }}>Send to client</button>
            )}
            {canWrite && open.status !== 'paid' && open.status !== 'void' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input className={inputCls} type="number" inputMode="decimal" placeholder="Payment ₹" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={async () => {
                  const amt = Number(payAmt);
                  if (!amt) { toast.error('Enter an amount'); return; }
                  try {
                    const r = await apiClient.post(`/invoices/${open.id}/payments`, { amount: amt, method: 'bank' });
                    toast.success(r.data.status === 'paid' ? 'Paid in full' : 'Payment recorded');
                    setOpen(r.data);
                    setPayAmt('');
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not record')); }
                }}>Record</button>
                <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={async () => {
                  try {
                    const r = await apiClient.patch(`/invoices/${open.id}`, { status: 'paid' });
                    toast.success('Marked paid');
                    setOpen(r.data);
                    load();
                  } catch (e) { toast.error(apiError(e, 'Could not mark paid')); }
                }}>Mark paid</button>
              </div>
            )}
          </div>
        </div>
      )}

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
              <button className="dash-btn dash-btn-primary flex-[2]" disabled={!form.client_id} onClick={create}>Create from package</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
