import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { apiError } from '../../../utils/apiError';

export default function AuditView() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    apiClient.get('/audit').then((r) => setRows(r.data || [])).catch((e) => toast.error(apiError(e, 'Could not load audit log')));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="dash-title">Audit log</h1>
        <p className="dash-sub">Logins, permission changes, deletes, approvals, and exports. Leadership only.</p>
      </div>
      <div className="dash-card divide-y divide-white/[0.04]">
        {rows.length === 0 ? (
          <p className="text-white/35 text-sm p-5">Nothing logged yet.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="text-white text-sm">
                {r.actor_name || 'Someone'} · {r.action} · {r.resource}
              </div>
              <div className="text-white/30 text-xs">{r.at ? new Date(r.at).toLocaleString('en-IN') : ''}</div>
            </div>
            {(r.detail || r.resource_id) && (
              <div className="text-white/40 text-xs mt-0.5 truncate">{r.detail || r.resource_id}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
