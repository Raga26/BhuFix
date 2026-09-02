import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';
import { apiError } from '../../../utils/apiError';
import { CloseButton } from '../CloseButton';

function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function money(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `₹${Number(v).toLocaleString('en-IN')}`;
}

function healthTone(score) {
  if (score == null) return 'text-white/40';
  if (score >= 75) return 'text-[#34D399]';
  if (score >= 50) return 'text-[#FBBF24]';
  return 'text-[#FB923C]';
}

function Metric({ label, value }) {
  return (
    <div className="dash-card p-3">
      <div className="text-white text-sm">{value}</div>
      <div className="text-white/35 text-xs">{label}</div>
    </div>
  );
}

export default function PerformanceView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    apiClient.get('/performance/summary').then((r) => setData(r.data)).catch((e) => toast.error(apiError(e, 'Could not load performance')));
  }, []);

  const steps = data?.funnel?.steps || [];
  const max = Math.max(1, ...steps.map((s) => Number(s.value) || 0));
  const campaigns = data?.campaigns || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="dash-title">Performance</h1>
        <p className="dash-sub">
          {user?.role === 'client'
            ? 'Funnel and health from the numbers the studio entered. This is not a Meta score.'
            : 'CTR, CPC, Frequency, CPL, ROAS and the lead funnel, calculated from Ads. BhuFix Ad Health is an internal diagnostic, not a Meta score.'}
        </p>
        <Link to="/dashboard/insights" className="inline-flex items-center mt-2 text-[#E8734A] text-sm min-h-[44px]">Open recommendations</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="dash-card p-4">
          <div className={`font-anchor italic text-[1.35rem] ${healthTone(data?.overall_health)}`}>
            {data?.overall_health ?? '—'}
          </div>
          <div className="text-white/40 text-xs">Ad Health (internal)</div>
        </div>
        {[['leads', 'Leads'], ['customers', 'Customers'], ['revenue', 'Revenue']].map(([k, label]) => (
          <div key={k} className="dash-card p-4">
            <div className="font-anchor italic text-[1.35rem] text-white mb-1">
              {k === 'revenue' ? money(data?.funnel?.totals?.[k]) : fmt(data?.funnel?.totals?.[k])}
            </div>
            <div className="text-white/40 text-xs">{label}</div>
          </div>
        ))}
      </div>

      <div className="dash-card p-4 sm:p-5 mb-6">
        <div className="text-white font-medium text-sm mb-4">Lead funnel</div>
        <div className="space-y-2">
          {steps.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-xs text-white/50 mb-1 gap-2">
                <span className="min-w-0 truncate">{s.label}</span>
                <span className="text-white shrink-0">{s.key === 'revenue' ? money(s.value) : fmt(s.value)}</span>
              </div>
              <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#E8734A]" style={{ width: `${Math.min(100, (Number(s.value) / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-card p-4 sm:p-5">
        <div className="text-white font-medium text-sm mb-3">Campaign calculators</div>
        {campaigns.length === 0 ? (
          <p className="text-white/35 text-sm py-4">Add campaigns under Ads to see CTR, CPC, CPL, and ROAS.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const m = c.metrics || {};
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setOpen(c)}
                  className="w-full text-left dash-card p-3 min-h-[52px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white text-sm truncate">{c.name || c.platform}</div>
                      <div className="text-white/35 text-xs">{c.platform} · {c.month}/{c.year}</div>
                    </div>
                    <div className={`text-sm shrink-0 ${healthTone(c.health?.score)}`}>
                      {c.health?.score ?? '—'} {c.health?.label || ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-2 text-xs text-white/50">
                    <span>CTR {m.ctr != null ? `${m.ctr}%` : '—'}</span>
                    <span>CPC {m.cpc != null ? money(m.cpc) : '—'}</span>
                    <span>Freq {m.frequency != null ? fmt(m.frequency) : '—'}</span>
                    <span>CPL {m.cpl != null ? money(m.cpl) : '—'}</span>
                    <span>ROAS {m.roas != null ? `${m.roas}x` : '—'}</span>
                    <span>BE {m.break_even_roas != null ? `${m.break_even_roas}x` : '1x'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-white/30 text-[11px] mt-3">{data?.disclaimer}</p>
      </div>

      {open && (
        <div className="dash-overlay" onClick={() => setOpen(null)}>
          <div className="dash-modal p-5 sm:p-6 w-full max-w-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="text-white font-medium">{open.name || open.platform}</h2>
              <CloseButton onClick={() => setOpen(null)} />
            </div>
            <p className={`text-sm mb-3 ${healthTone(open.health?.score)}`}>
              {open.health?.name}: {open.health?.score ?? '—'} · {open.health?.label}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Metric label="CTR" value={open.metrics?.ctr != null ? `${open.metrics.ctr}%` : '—'} />
              <Metric label="CPC" value={open.metrics?.cpc != null ? money(open.metrics.cpc) : '—'} />
              <Metric label="CPM" value={open.metrics?.cpm != null ? money(open.metrics.cpm) : '—'} />
              <Metric label="Frequency" value={fmt(open.metrics?.frequency)} />
              <Metric label="CPL" value={open.metrics?.cpl != null ? money(open.metrics.cpl) : '—'} />
              <Metric label="CPA / CAC" value={open.metrics?.cac != null ? money(open.metrics.cac) : '—'} />
              <Metric label="Conv. rate" value={open.metrics?.conversion_rate != null ? `${open.metrics.conversion_rate}%` : '—'} />
              <Metric label="ROAS" value={open.metrics?.roas != null ? `${open.metrics.roas}x` : '—'} />
              <Metric label="Break-even ROAS" value="1x" />
              <Metric label="Revenue" value={money(open.metrics?.revenue)} />
            </div>
            <p className="text-white/35 text-xs mb-2">{open.health?.disclaimer}</p>
            {(open.health?.reasons || []).map((r) => (
              <p key={r} className="text-white/55 text-sm py-1">{r}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
