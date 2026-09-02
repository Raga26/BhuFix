import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { can } from '../../../lib/access';
import { apiError } from '../../../utils/apiError';

const TONE = {
  action: 'text-[#FB923C]',
  important: 'text-[#FBBF24]',
  info: 'text-[#4DD9FF]',
};

export default function InsightsView() {
  const { user } = useAuth();
  const canWrite = can(user, 'insights.write');
  const [items, setItems] = useState([]);
  const [llm, setLlm] = useState(false);
  const [busy, setBusy] = useState(null);
  const scanned = useRef(false);

  const load = useCallback(async (refresh) => {
    try {
      if (refresh) await apiClient.post('/insights/refresh');
      const r = await apiClient.get('/insights');
      setItems(r.data?.items || []);
      setLlm(!!r.data?.llm);
    } catch (e) {
      toast.error(apiError(e, 'Could not load recommendations'));
    }
  }, []);

  useEffect(() => {
    if (scanned.current) return;
    scanned.current = true;
    load(true);
  }, [load]);

  const act = async (id, path, ok) => {
    setBusy(id + path);
    try {
      const r = await apiClient.post(`/insights/${id}/${path}`);
      toast.success(ok);
      if (path === 'rewrite') {
        setItems((list) => list.map((x) => (x.id === id ? r.data : x)));
      } else {
        setItems((list) => list.filter((x) => x.id !== id));
      }
      return r.data;
    } catch (e) {
      toast.error(apiError(e, 'Could not update'));
      return null;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="dash-title">Insights</h1>
          <p className="dash-sub">
            {user?.role === 'client'
              ? 'Suggestions from your ads, SEO, and site numbers. The studio still decides what to do.'
              : 'Recommendations from the live loop — ads, SEO, web, plans, overdue work. Nothing runs until you accept. Rewrite needs an API key; ideas still work without one.'}
          </p>
        </div>
        <button type="button" className="dash-btn dash-btn-ghost self-start min-h-[44px]" onClick={() => load(true)}>
          <Sparkles size={14} /> Scan again
        </button>
      </div>

      {items.length === 0 ? (
        <div className="dash-card p-6 text-white/40 text-sm">Nothing to recommend right now. Add ads, ranks, or an approved plan and scan again.</div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="dash-card p-4 sm:p-5">
              <div className={`text-[11px] uppercase tracking-wide mb-1 ${TONE[n.severity] || 'text-white/40'}`}>{n.severity} · {String(n.kind || '').replace(/_/g, ' ')}</div>
              <div className="text-white text-sm font-medium">{n.title}</div>
              <p className="text-white/55 text-sm mt-1">{n.body}</p>
              {n.why && <p className="text-white/35 text-xs mt-2">{n.why}</p>}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4">
                {n.link && <Link to={n.link} className="dash-btn dash-btn-ghost min-h-[44px] w-full sm:w-auto text-center">Open</Link>}
                {canWrite && n.action?.type === 'clip' && llm && (
                  <button type="button" className="dash-btn dash-btn-ghost min-h-[44px] w-full sm:w-auto" disabled={!!busy} onClick={() => act(n.id, 'rewrite', 'Rewritten')}>
                    {busy === `${n.id}rewrite` ? 'Rewriting…' : 'Rewrite with AI'}
                  </button>
                )}
                {canWrite && n.action && (
                  <button type="button" className="dash-btn dash-btn-primary min-h-[44px] w-full sm:w-auto" disabled={!!busy} onClick={() => act(n.id, 'accept', n.action?.type === 'clip' ? 'Opened as a clip' : 'Opened as a task')}>
                    {busy === `${n.id}accept` ? 'Working…' : (n.action?.type === 'clip' ? 'Accept → Clip' : 'Accept → Task')}
                  </button>
                )}
                {canWrite && (
                  <button type="button" className="dash-btn dash-btn-danger min-h-[44px] w-full sm:w-auto" disabled={!!busy} onClick={() => act(n.id, 'dismiss', 'Dismissed')}>
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
