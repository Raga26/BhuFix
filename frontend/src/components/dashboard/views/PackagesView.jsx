import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";

export default function PackagesView() {
  const [packages, setPackages] = useState([]);
  const [edit, setEdit] = useState(null);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    apiClient.get('/packages').then((r) => setPackages(r.data || [])).catch(() => toast.error('Failed to load packages'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = (pkg) => {
    setEdit(pkg);
    setServices((pkg.current?.services || []).map((s) => ({ ...s })));
  };

  const saveVersion = async () => {
    setSaving(true);
    try {
      await apiClient.post(`/packages/${edit.id}/versions`, { services });
      toast.success(`Saved ${edit.name} v${(edit.current_version || 1) + 1}. Old invoices stay on the previous version.`);
      setEdit(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save package');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="dash-title">Packages</h1>
        <p className="dash-sub">Editing a package creates a new version. Issued invoices never change.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {packages.map((p) => (
          <div key={p.id} className="dash-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-medium">{p.name}</div>
                <div className="text-white/35 text-xs">Version {p.current_version}</div>
              </div>
              <button className="dash-btn dash-btn-ghost dash-btn-sm" onClick={() => openEdit(p)}>Edit</button>
            </div>
            {(p.current?.services || []).map((s, i) => (
              <div key={i} className="flex justify-between text-sm text-white/50 py-1 border-t border-white/[0.04]">
                <span>{s.name} × {s.quantity}</span>
                <span>₹{Number(s.unit_price || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {edit && (
        <div className="dash-overlay">
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">New version of {edit.name}</h2>
              <CloseButton onClick={() => setEdit(null)} />
            </div>
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_90px] gap-2">
                  <input className={inputCls} value={s.name} onChange={(e) => setServices((arr) => arr.map((x, n) => n === i ? { ...x, name: e.target.value } : x))} />
                  <input className={inputCls} type="number" value={s.quantity} onChange={(e) => setServices((arr) => arr.map((x, n) => n === i ? { ...x, quantity: +e.target.value } : x))} />
                  <input className={inputCls} type="number" value={s.unit_price} onChange={(e) => setServices((arr) => arr.map((x, n) => n === i ? { ...x, unit_price: +e.target.value } : x))} />
                </div>
              ))}
              <button className="text-[#E8734A] text-xs" onClick={() => setServices((arr) => [...arr, { name: '', quantity: 1, unit_price: 0 }])}>Add line</button>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="dash-btn dash-btn-ghost flex-1" onClick={() => setEdit(null)}>Cancel</button>
              <button className="dash-btn dash-btn-primary flex-[2]" disabled={saving} onClick={saveVersion}>{saving ? 'Saving…' : 'Save as new version'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
