import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { apiError } from '../../../utils/apiError';
import { toast } from 'sonner';

export default function ClientHomeView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    apiClient.get('/portal/home').then((r) => setData(r.data)).catch((e) => {
      toast.error(apiError(e, 'Could not load'));
      setFailed(true);
    });
  };

  useEffect(() => { load(); }, []);

  if (failed && !data) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm mb-4">Could not load your home.</p>
        <button type="button" className="dash-btn dash-btn-primary min-h-[44px]" onClick={load}>Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#E8734A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = data.upcoming || [];
  const campaigns = data.campaigns || [];
  const files = data.files || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="dash-title">Hello, {user?.name?.split(' ')[0]}</h1>
        <p className="dash-sub">Your content and files — nothing internal.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/dashboard/calendar" className="dash-card p-4 min-h-[72px]">
          <div className="text-white text-lg">{upcoming.length}</div>
          <div className="text-white/35 text-xs">Upcoming</div>
        </Link>
        <Link to="/dashboard/drive" className="dash-card p-4 min-h-[72px]">
          <div className="text-white text-lg">{files.length}</div>
          <div className="text-white/35 text-xs">Shared files</div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="dash-card p-4 sm:p-5">
          <div className="flex justify-between mb-3">
            <div className="text-white font-medium text-sm">Content</div>
            <Link to="/dashboard/calendar" className="text-[#E8734A] text-xs min-h-[32px] inline-flex items-center">Schedule</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-white/35 text-sm">Nothing scheduled.</p>
          ) : upcoming.slice(0, 6).map((e) => (
            <Link key={e.id} to="/dashboard/calendar" className="block py-2 border-b border-white/[0.04] last:border-0">
              <div className="text-white text-sm truncate">{e.title}</div>
              <div className="text-white/35 text-xs">{e.date} · {e.status}</div>
            </Link>
          ))}
        </div>

        <div className="dash-card p-4 sm:p-5">
          <div className="flex justify-between mb-3">
            <div className="text-white font-medium text-sm">Files</div>
            <Link to="/dashboard/drive" className="text-[#E8734A] text-xs min-h-[32px] inline-flex items-center">Open</Link>
          </div>
          {files.length === 0 ? (
            <p className="text-white/35 text-sm">No shared files.</p>
          ) : files.slice(0, 5).map((f) => (
            <Link key={f.id} to="/dashboard/drive" className="block py-2 border-b border-white/[0.04] last:border-0 text-white text-sm truncate">{f.filename}</Link>
          ))}
        </div>

        {campaigns.length > 0 && (
          <div className="dash-card p-4 sm:p-5 md:col-span-2">
            <div className="flex justify-between mb-3">
              <div className="text-white font-medium text-sm">Campaigns</div>
              <Link to="/dashboard/ads" className="text-[#E8734A] text-xs min-h-[32px] inline-flex items-center">Open</Link>
            </div>
            {campaigns.slice(0, 4).map((c) => (
              <Link key={c.id} to="/dashboard/ads" className="block py-2 border-b border-white/[0.04] last:border-0 text-sm text-white">
                {c.platform} · {c.month}/{c.year} · ₹{Number(c.spent || 0).toLocaleString('en-IN')} of ₹{Number(c.budget || 0).toLocaleString('en-IN')}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
