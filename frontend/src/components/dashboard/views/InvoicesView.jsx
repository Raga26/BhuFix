import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';
import { ClientMark } from '../ClientMark';
import { CloseButton } from '../CloseButton';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-base md:text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };
const labelCls = "block text-white/40 text-[10px] uppercase tracking-widest mb-1.5";

function currentPeriod() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function rupee(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function emptyForm() {
  return {
    client_id: '',
    billing_period: currentPeriod(),
    due_date: '',
    tax_rate: 0,
    discount: 0,
    notes: '',
    client_memo: '',
    bill_to: '',
    gstin: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    ifsc: '',
    upi: '',
    terms: '',
    services: [{ name: '', quantity: 1, unit_price: 0 }],
  };
}

function formFromInvoice(inv) {
  return {
    client_id: inv.client_id || '',
    billing_period: inv.billing_period || currentPeriod(),
    due_date: inv.due_date || '',
    tax_rate: inv.tax_rate || 0,
    discount: inv.discount || 0,
    notes: inv.notes || '',
    client_memo: inv.client_memo || '',
    bill_to: inv.bill_to || inv.client_name || '',
    gstin: inv.gstin || '',
    bank_name: inv.bank_name || '',
    account_name: inv.account_name || '',
    account_number: inv.account_number || '',
    ifsc: inv.ifsc || '',
    upi: inv.upi || '',
    terms: inv.terms || '',
    services: (inv.services || []).length
      ? inv.services.map((s) => ({ name: s.name || '', quantity: s.quantity || 1, unit_price: s.unit_price || 0 }))
      : [{ name: '', quantity: 1, unit_price: 0 }],
  };
}

function previewTotals(form) {
  const subtotal = (form.services || []).reduce((s, row) => s + Number(row.quantity || 0) * Number(row.unit_price || 0), 0);
  const discount = Number(form.discount || 0);
  const after = Math.max(subtotal - discount, 0);
  const tax = after * (Number(form.tax_rate || 0) / 100);
  return { subtotal, discount, tax, total: after + tax };
}

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
  const [packages, setPackages] = useState([]);
  const [modal, setModal] = useState(null);
  const [open, setOpen] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('bank');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = useCallback(() => {
    apiClient.get('/invoices').then((r) => setInvoices(r.data || [])).catch(() => toast.error('Failed to load invoices'));
    if (canWrite) {
      apiClient.get('/clients').then((r) => setClients(r.data || [])).catch(() => {});
      apiClient.get('/packages').then((r) => setPackages(r.data || [])).catch(() => {});
    }
  }, [canWrite]);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLine = (i, k, v) => setForm((f) => ({
    ...f,
    services: f.services.map((row, n) => (n === i ? { ...row, [k]: v } : row)),
  }));

  const applyClientPackage = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    const pkg = packages.find((p) => p.id === cl?.package_id);
    const services = (pkg?.current?.services || []).map((s) => ({
      name: s.name || '',
      quantity: s.quantity || 1,
      unit_price: s.unit_price || 0,
    }));
    setForm((f) => ({
      ...f,
      client_id: clientId,
      bill_to: f.bill_to || cl?.name || '',
      services: services.length ? services : f.services,
    }));
  };

  const openCreate = () => {
    if (!clients.length) {
      toast.error('Add a client first');
      return;
    }
    setForm(emptyForm());
    setDetailsOpen(false);
    setModal('create');
  };

  const openEdit = (inv) => {
    setForm(formFromInvoice(inv));
    setDetailsOpen(Boolean(inv.gstin || inv.bank_name || inv.upi || inv.account_number));
    setOpen(null);
    setModal(inv);
  };

  const save = async () => {
    if (!form.client_id) {
      toast.error('Pick a client');
      return;
    }
    const services = (form.services || []).filter((s) => (s.name || '').trim());
    if (!services.length) {
      toast.error('Add at least one line (name, quantity, rate)');
      return;
    }
    setSaving(true);
    const payload = { ...form, services, tax_rate: Number(form.tax_rate || 0), discount: Number(form.discount || 0) };
    try {
      if (modal === 'create') {
        const inv = (await apiClient.post('/invoices', payload)).data;
        toast.success(`Draft ${inv.number} ready — edit or send when it looks right`);
      } else {
        const inv = (await apiClient.patch(`/invoices/${modal.id}`, payload)).data;
        toast.success('Invoice updated');
        setOpen(inv);
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not save invoice'));
    } finally {
      setSaving(false);
    }
  };

  const removeInvoice = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/invoices/${deleteConfirm.id}`);
      toast.success(`Deleted ${deleteConfirm.number}`);
      setDeleteConfirm(null);
      setOpen(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Could not delete'));
    } finally {
      setDeleting(false);
    }
  };

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const totals = useMemo(() => previewTotals(form), [form]);
  const isEdit = modal && modal !== 'create';
  const canEditOpen = canWrite && open && open.status !== 'paid' && open.status !== 'void';
  const canDeleteOpen = canWrite && open && open.status !== 'paid';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">Invoices</h1>
          <p className="dash-sub">
            {canWrite
              ? 'A bill for one client for one billing period — usually a month of retainer work. Draft, edit lines and tax, send, record payment, print a BhuFix invoice. Drafts can be deleted.'
              : 'Invoices sent to you. Download or Print / PDF from the browser to save a copy.'}
          </p>
        </div>
        {canWrite && (
          <button type="button" className="dash-btn dash-btn-primary self-start min-h-[44px]" onClick={openCreate}>
            <Plus size={14} /> Draft invoice
          </button>
        )}
      </div>
      <div className="dash-card overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No invoices yet.</div>
        ) : invoices.map((inv) => (
          <button key={inv.id} type="button" onClick={() => { setOpen(inv); setPayAmt(''); }} className="w-full text-left flex flex-wrap items-center gap-3 px-4 sm:px-5 py-4 border-b border-white/[0.04] last:border-0 min-h-[52px]">
            <ClientMark client={clientMap[inv.client_id] || { name: inv.client_name }} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium">{inv.number}</div>
              <div className="text-white/40 text-xs">
                {inv.client_name}
                {inv.billing_period ? ` · ${inv.billing_period}` : ''}
                {inv.package_name ? ` · ${inv.package_name}` : ''}
                {' · '}{inv.status}
              </div>
            </div>
            <div className="text-white text-sm">{rupee(inv.total)}</div>
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
            <p className="text-white/50 text-sm mb-1">{open.bill_to || open.client_name} · {rupee(open.total)} · {open.status}</p>
            <p className="text-white/35 text-xs mb-4">
              Billing period: <span className="text-white/70">{open.billing_period || '—'}</span>
              {open.due_date ? ` · due ${open.due_date}` : ''}
              <span className="block mt-1 text-white/30">The period is the month (or dates) of work this bill is for — not the date you created it.</span>
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
              <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => downloadInvoice(open.id, open.number).catch((e) => toast.error(apiError(e, 'Download failed')))}>Download</button>
              <button type="button" className="dash-btn dash-btn-primary min-h-[44px]" onClick={() => printInvoice(open.id).catch((e) => toast.error(apiError(e, 'Print failed')))}>Print / PDF</button>
              {canEditOpen && (
                <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={() => openEdit(open)}>Edit</button>
              )}
              {canDeleteOpen && (
                <button type="button" className="dash-btn dash-btn-danger min-h-[44px]" onClick={() => setDeleteConfirm(open)}>Delete</button>
              )}
            </div>
            {(open.payments || []).length > 0 && (
              <div className="text-xs text-white/45 mb-3 space-y-1">
                {(open.payments || []).map((p) => (
                  <div key={p.id}>{rupee(p.amount)} · {p.method} · {(p.created_at || '').slice(0, 10)}</div>
                ))}
              </div>
            )}
            {canWrite && open.status === 'draft' && (
              <button type="button" className="dash-btn dash-btn-primary w-full min-h-[44px] mb-2" onClick={async () => {
                try {
                  const r = await apiClient.post(`/invoices/${open.id}/send`, { client_memo: open.client_memo || '' });
                  toast.success('Sent — the client can see this invoice now');
                  setOpen(r.data);
                  load();
                } catch (e) { toast.error(apiError(e, 'Could not send')); }
              }}>Send to client</button>
            )}
            {canWrite && open.status === 'sent' && (
              <button type="button" className="dash-btn dash-btn-ghost w-full min-h-[44px] mb-2" onClick={async () => {
                try {
                  const r = await apiClient.patch(`/invoices/${open.id}`, { status: 'void' });
                  toast.success('Marked void');
                  setOpen(r.data);
                  load();
                } catch (e) { toast.error(apiError(e, 'Could not void')); }
              }}>Void invoice</button>
            )}
            {canWrite && open.status !== 'paid' && open.status !== 'void' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input className={inputCls} type="number" inputMode="decimal" placeholder="Payment ₹" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                <select className={inputCls + ' sm:w-28'} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="bank" style={optStyle}>Bank</option>
                  <option value="upi" style={optStyle}>UPI</option>
                  <option value="cash" style={optStyle}>Cash</option>
                  <option value="other" style={optStyle}>Other</option>
                </select>
                <button type="button" className="dash-btn dash-btn-ghost min-h-[44px]" onClick={async () => {
                  const amt = Number(payAmt);
                  if (!amt) { toast.error('Enter an amount'); return; }
                  try {
                    const r = await apiClient.post(`/invoices/${open.id}/payments`, { amount: amt, method: payMethod });
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
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{isEdit ? `Edit ${modal.number}` : 'Draft invoice'}</h2>
              <CloseButton onClick={() => setModal(null)} />
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Client</label>
                <select
                  className={inputCls}
                  value={form.client_id}
                  disabled={!!isEdit}
                  onChange={(e) => applyClientPackage(e.target.value)}
                >
                  <option value="" style={optStyle}>Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name} · {c.package_name || c.level || 'no package'}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Billing period</label>
                <input className={inputCls} placeholder="e.g. September 2026" value={form.billing_period} onChange={(e) => set('billing_period', e.target.value)} />
                <p className="text-white/35 text-xs mt-1.5 leading-relaxed">
                  The month (or dates) this bill is for — the work the client is paying for. Example: September 2026 retainer, or 1–30 Sep 2026. It is printed on the invoice. It is not the date you click Create.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Due date</label>
                  <input className={inputCls} type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bill to (on the paper)</label>
                  <input className={inputCls} placeholder="Client legal name" value={form.bill_to} onChange={(e) => set('bill_to', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Line items</label>
                <div className="space-y-2">
                  {form.services.map((s, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_90px_40px] gap-2">
                      <input className={inputCls} placeholder="Service" value={s.name} onChange={(e) => setLine(i, 'name', e.target.value)} />
                      <input className={inputCls} type="number" inputMode="decimal" placeholder="Qty" value={s.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                      <input className={inputCls} type="number" inputMode="decimal" placeholder="Rate ₹" value={s.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} />
                      <button
                        type="button"
                        className="dash-btn dash-btn-ghost min-h-[44px] px-0"
                        onClick={() => setForm((f) => {
                          const next = f.services.filter((_, n) => n !== i);
                          return { ...f, services: next.length ? next : [{ name: '', quantity: 1, unit_price: 0 }] };
                        })}
                        aria-label="Remove line"
                      >−</button>
                    </div>
                  ))}
                </div>
                <button type="button" className="text-[#E8734A] text-sm min-h-[44px]" onClick={() => setForm((f) => ({ ...f, services: [...f.services, { name: '', quantity: 1, unit_price: 0 }] }))}>
                  + Add line
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Discount ₹</label>
                  <input className={inputCls} type="number" inputMode="decimal" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Tax % (GST if you charge it)</label>
                  <input className={inputCls} type="number" inputMode="decimal" value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} />
                </div>
              </div>
              <div className="text-white/55 text-xs flex justify-between border-t border-white/[0.06] pt-2">
                <span>Subtotal {rupee(totals.subtotal)} · Tax {rupee(totals.tax)}</span>
                <span className="text-white">Total {rupee(totals.total)}</span>
              </div>
              <div>
                <label className={labelCls}>Note on the invoice (client sees this)</label>
                <textarea className={inputCls + ' min-h-[72px]'} placeholder="Thank you — covers September retainer." value={form.client_memo} onChange={(e) => set('client_memo', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Internal note (not on the client copy)</label>
                <input className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
              <button type="button" className="text-white/45 text-xs min-h-[40px]" onClick={() => setDetailsOpen((v) => !v)}>
                {detailsOpen ? 'Hide' : 'Show'} GST, bank / UPI, terms
              </button>
              {detailsOpen && (
                <div className="space-y-3">
                  <input className={inputCls} placeholder="GSTIN" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} />
                  <input className={inputCls} placeholder="Account name" value={form.account_name} onChange={(e) => set('account_name', e.target.value)} />
                  <input className={inputCls} placeholder="Bank name" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
                  <input className={inputCls} placeholder="Account number" value={form.account_number} onChange={(e) => set('account_number', e.target.value)} />
                  <input className={inputCls} placeholder="IFSC" value={form.ifsc} onChange={(e) => set('ifsc', e.target.value)} />
                  <input className={inputCls} placeholder="UPI ID" value={form.upi} onChange={(e) => set('upi', e.target.value)} />
                  <textarea className={inputCls + ' min-h-[72px]'} placeholder="Terms printed at the bottom" value={form.terms} onChange={(e) => set('terms', e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" className="dash-btn dash-btn-ghost flex-1" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="dash-btn dash-btn-primary flex-[2]" disabled={saving || !form.client_id} onClick={save}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          title={`Delete ${deleteConfirm.number}?`}
          message={
            deleteConfirm.status === 'draft'
              ? 'This draft will be removed. You can create another one.'
              : 'This invoice will be removed. Paid invoices cannot be deleted.'
          }
          onConfirm={removeInvoice}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
