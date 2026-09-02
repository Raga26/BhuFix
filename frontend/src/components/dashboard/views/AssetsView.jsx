import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can, ASSET_BUCKETS } from '../../../lib/access';
import { ClientMark, assetSrc } from '../ClientMark';
import { CloseButton } from '../CloseButton';

const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50";
const optStyle = { background: '#0D0E1A', color: '#fff' };

export default function AssetsView() {
  const { user } = useAuth();
  const canWrite = can(user, 'assets.write');
  const [clients, setClients] = useState([]);
  const [assets, setAssets] = useState([]);
  const [clientId, setClientId] = useState('');
  const [bucket, setBucket] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadClients = useCallback(() => {
    apiClient.get('/clients').then((r) => {
      const rows = r.data || [];
      setClients(rows);
      setClientId((id) => id || rows[0]?.id || '');
    }).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (clientId) params.client_id = clientId;
    if (bucket) params.bucket = bucket;
    apiClient.get('/assets', { params }).then((r) => setAssets(r.data || []))
      .catch(() => toast.error('Failed to load files'))
      .finally(() => setLoading(false));
  }, [clientId, bucket]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { if (clientId || user?.role === 'client') load(); }, [load, clientId, user?.role]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !clientId) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('client_id', clientId);
    fd.append('bucket', bucket || 'working');
    setUploading(true);
    try {
      await apiClient.post('/assets', fd);
      toast.success('Uploaded');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="dash-title">Assets</h1>
          <p className="dash-sub">Versioned files per client. Links expire; reopen from here.</p>
        </div>
        {canWrite && clientId && (
          <label className="dash-btn dash-btn-primary cursor-pointer">
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select className={inputCls + ' w-full sm:w-56'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id} style={optStyle}>{c.name}</option>)}
        </select>
        <select className={inputCls + ' w-full sm:w-44'} value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="" style={optStyle}>All folders</option>
          {ASSET_BUCKETS.map((b) => <option key={b} value={b} style={optStyle}>{b}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 text-white/30">No files in this folder.</div>
      ) : (
        <div className="dash-card divide-y divide-white/[0.04]">
          {assets.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
              <ClientMark client={clientMap[a.client_id] || { name: a.filename }} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">{a.filename}</div>
                <div className="text-white/35 text-xs">{a.bucket} · {a.label || `v${a.version}`} · {(a.size / 1024).toFixed(0)} KB</div>
              </div>
              <a href={assetSrc(a.url)} target="_blank" rel="noreferrer" className="dash-btn dash-btn-ghost dash-btn-sm">Open</a>
              {canWrite && !a.locked && (
                <button
                  className="dash-btn dash-btn-danger dash-btn-sm"
                  onClick={async () => {
                    try {
                      await apiClient.delete(`/assets/${a.id}`);
                      load();
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'Could not delete');
                    }
                  }}
                >Delete</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
