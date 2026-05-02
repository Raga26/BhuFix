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
          <h1 className="text-white font-extrabold text-2xl">Drive Links</h1>
          <p className="text-white/40 text-sm mt-1">Google Drive folders — one per client</p>
        </div>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-6 h-6 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">No drive links yet. Add drive links when creating clients.</div>
        ) : (
          clients.map((c) => (
            <a key={c.id} href={c.drive_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2 last:mb-0 hover:border-[#4DD9FF]/30 hover:bg-[#4DD9FF]/[0.04] transition-all group">
              <span className="text-2xl">📁</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">{c.logo_emoji} {c.name}</div>
                <div className="text-white/40 text-xs">{c.industry} · Started {c.start_date} · {c.ig_handle}</div>
              </div>
              <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full flex-shrink-0 group-hover:bg-green-500/20 transition-colors">Open →</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
