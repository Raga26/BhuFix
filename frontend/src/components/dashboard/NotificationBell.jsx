import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import apiClient from '../../utils/axiosConfig';
import { CloseButton } from './CloseButton';

const TIER_LABEL = {
  action: 'Needs action',
  important: 'Important',
  info: 'Info',
  completed: 'Completed',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], groups: {}, unread: 0 });

  const load = useCallback(() => {
    apiClient.get('/notifications').then((r) => setData(r.data || { items: [], groups: {}, unread: 0 })).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const openNote = async (n) => {
    try {
      await apiClient.post(`/notifications/${n.id}/read`);
    } catch {
      /* still navigate */
    }
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      load();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); load(); }}
        className="relative text-white/45 hover:text-white p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.7} />
        {data.unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E8734A] text-[10px] text-white flex items-center justify-center">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="dash-overlay" onClick={() => setOpen(false)}>
          <div className="dash-modal p-5 sm:p-6 w-full max-w-md pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Notifications</h2>
              <div className="flex items-center gap-2">
                {data.unread > 0 && (
                  <button type="button" className="text-xs text-[#E8734A] min-h-[44px] px-2" onClick={markAll}>Mark all read</button>
                )}
                <CloseButton onClick={() => setOpen(false)} />
              </div>
            </div>
            {['action', 'important', 'info', 'completed'].map((tier) => {
              const list = data.groups?.[tier] || [];
              if (!list.length) return null;
              return (
                <div key={tier} className="mb-4">
                  <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1.5">{TIER_LABEL[tier]}</p>
                  <div className="space-y-1">
                    {list.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openNote(n)}
                        className={`w-full text-left px-3 py-3 rounded-xl min-h-[52px] ${n.read ? 'bg-white/[0.02]' : 'bg-white/[0.05]'}`}
                      >
                        <div className="text-white text-sm">{n.title}</div>
                        {n.body && <div className="text-white/40 text-xs mt-0.5">{n.body}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {(data.items || []).length === 0 && (
              <p className="text-white/35 text-sm py-6 text-center">You are caught up.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
