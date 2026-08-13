import { useEffect, useState } from 'react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

export default function DriveView() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/clients').then((r) => {
      const all = r.data || [];
      setClients(all.filter((c) => c.drive_link));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="dash-title">Drive</h1>
          <p className="dash-sub">One folder per client.</p>
        </div>
      </div>

      <div className="dash-card p-5">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">No drive links yet. Add drive links when creating clients.</div>
        ) : (
          clients.map((c) => (
            <a key={c.id} href={c.drive_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-md bg-white/[0.03] border border-white/[0.06] mb-2 last:mb-0 hover:border-white/15 transition-colors group">
              <span className="w-8 h-8 rounded-md bg-navy border border-white/[0.08] flex items-center justify-center text-white/50 text-xs font-semibold flex-shrink-0">
                {c.name?.[0]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">{c.name}</div>
                <div className="text-white/40 text-xs">{c.industry} · Started {c.start_date} · {c.ig_handle}</div>
              </div>
              <span className="text-xs text-coral flex-shrink-0">Open</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
