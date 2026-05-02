import { useEffect, useState } from 'react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

const PILLARS = [
  { emoji: '🎬', title: 'The Reveal', desc: 'Empty → magical transformation. Highest save rate. Must post 4× weekly.', freq: '4× per week', color: '#E8734A' },
  { emoji: '🎥', title: 'Behind The Scenes', desc: 'Team, chaos, effort. Builds trust and emotional connection with audience.', freq: '3× per week', color: '#4DD9FF' },
  { emoji: '💬', title: 'Testimonials', desc: 'Real client reactions. Most shareable emotional content. Goes viral organically.', freq: '1× per week', color: '#A78BFA' },
  { emoji: '📚', title: 'Education', desc: 'Tips, mistakes to avoid, planning guides. Heavy saves & shares = algorithm boost.', freq: '2× per week', color: '#34D399' },
  { emoji: '🤝', title: 'Collabs', desc: 'Tag vendors, feature couples, collab with photographers. Reaches new audiences.', freq: '1× per week', color: '#F472B6' },
];

function HookList() {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', example_text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/strategy/hooks').then((r) => { setHooks(r.data || []); setLoading(false); });
  }, []);

  const handleAdd = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const r = await apiClient.post('/strategy/hooks', form);
      setHooks((h) => [...h, r.data]);
      setForm({ title: '', body: '', example_text: '' });
      setShowAdd(false);
    } catch (e) { alert(e.response?.data?.detail || 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hook?')) return;
    await apiClient.delete(`/strategy/hooks/${id}`);
    setHooks((h) => h.filter((x) => x.id !== id));
  };

  const inputCls = "w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-[#E8734A]/50 transition-colors";

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white font-bold text-sm">🪝 Hook Template Library</div>
        {user?.role === 'owner' && (
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-[#E8734A] text-xs hover:underline">{showAdd ? '× Cancel' : '+ Add Hook'}</button>
        )}
      </div>

      {showAdd && (
        <div className="mb-5 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2">
          <input className={inputCls} placeholder="Hook title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className={inputCls} placeholder="Short description" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <input className={inputCls} placeholder="Example text" value={form.example_text} onChange={(e) => setForm((f) => ({ ...f, example_text: e.target.value }))} />
          <button onClick={handleAdd} disabled={saving}
            className="w-full bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold py-2 rounded-xl disabled:opacity-60">
            {saving ? 'Saving…' : 'Add Hook'}
          </button>
        </div>
      )}

      {loading ? <div className="text-center py-6 text-white/30">Loading…</div> : hooks.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-sm">No hooks yet. Add your first hook template.</div>
      ) : (
        hooks.map((h, i) => (
          <div key={h.id} className="flex gap-4 py-4 border-b border-white/[0.05] last:border-0">
            <div className="text-2xl font-black text-[#E8734A] min-w-[32px]">{String(i + 1).padStart(2, '0')}</div>
            <div className="flex-1">
              <div className="text-white text-sm font-semibold mb-1">{h.title}</div>
              <div className="text-white/40 text-xs mb-2">{h.body}</div>
              {h.example_text && (
                <div className="text-[#E8734A]/80 text-sm italic bg-[#E8734A]/[0.06] px-3 py-2 rounded-lg">{h.example_text}</div>
              )}
            </div>
            {user?.role === 'owner' && (
              <button onClick={() => handleDelete(h.id)} className="text-white/20 hover:text-red-400 text-sm flex-shrink-0 self-start mt-1">✕</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function AdFunnel() {
  const stages = [
    { stage: 'TOP OF FUNNEL', title: 'Reach New People', desc: 'Objective: Video Views. Boost your best Reveal Reels. Target engaged couples, local city + 50km. Budget: ₹200–300/day.', color: '#4DD9FF', bg: 'rgba(77,217,255,0.06)', border: 'rgba(77,217,255,0.2)' },
    { stage: 'MID FUNNEL', title: 'Retarget Warm Audience', desc: 'Objective: Engagement. Target profile visitors + video viewers (last 30 days). Show carousel of best event transformations. Budget: ₹150–200/day.', color: '#E8734A', bg: 'rgba(232,115,74,0.06)', border: 'rgba(232,115,74,0.2)' },
    { stage: 'BOTTOM FUNNEL', title: 'Convert to Clients', desc: 'Objective: Messages / Lead Gen. Testimonial video + strong CTA. Retarget engaged users (last 60 days). Budget: ₹100–150/day.', color: '#34D399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.2)' },
  ];
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
      <div className="text-white font-bold text-sm mb-5">📣 3-Stage Meta Ads Funnel</div>
      <div className="flex flex-col items-center gap-0 max-w-lg mx-auto">
        {stages.map((s, i) => (
          <div key={s.stage} className="w-full">
            <div className="rounded-2xl p-5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: s.color }}>{s.stage}</div>
              <div className="text-white font-bold text-base mb-2">{s.title}</div>
              <div className="text-white/50 text-sm leading-relaxed">{s.desc}</div>
            </div>
            {i < stages.length - 1 && (
              <div className="w-0.5 h-6 mx-auto" style={{ background: `linear-gradient(to bottom, ${s.color}, ${stages[i+1].color})` }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StrategyView() {
  const [tab, setTab] = useState('pillars');
  const tabCls = (t) => `px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${tab === t ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'text-white/40 hover:text-white'}`;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-white font-extrabold text-2xl">Strategy Hub</h1>
        <p className="text-white/40 text-sm mt-1">Content pillars, hooks, funnels and plans</p>
      </div>

      <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 w-fit">
        {[['pillars','Content Pillars'],['hooks','Hook Library'],['funnel','Ad Funnels']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={tabCls(id)}>{label}</button>
        ))}
      </div>

      {tab === 'pillars' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-white/[0.04] rounded-2xl p-5 hover:-translate-y-1 transition-transform"
              style={{ border: `1px solid ${p.color}40` }}>
              <div className="text-3xl mb-3">{p.emoji}</div>
              <div className="text-white font-bold text-base mb-2">{p.title}</div>
              <div className="text-white/50 text-sm leading-relaxed mb-3">{p.desc}</div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${p.color}15`, color: p.color }}>{p.freq}</span>
            </div>
          ))}
          <div className="bg-white/[0.02] border border-dashed border-white/[0.1] rounded-2xl p-5 flex items-center justify-center flex-col gap-2 text-white/20 min-h-[160px] cursor-pointer hover:border-[#E8734A]/30 hover:text-white/40 transition-colors">
            <span className="text-2xl">＋</span>
            <span className="text-xs">Add New Pillar</span>
          </div>
        </div>
      )}
      {tab === 'hooks' && <HookList />}
      {tab === 'funnel' && <AdFunnel />}
    </div>
  );
}
