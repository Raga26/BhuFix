import { useEffect, useState } from 'react';
import apiClient from '../../../utils/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

function StatCard({ value, label, color, delta }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 relative overflow-hidden hover:-translate-y-1 transition-transform">
      <div className="absolute top-[-10px] right-[-10px] w-16 h-16 rounded-full blur-2xl opacity-20" style={{ background: color }} />
      <div className="text-2xl font-extrabold mb-1" style={{ color }}>{value}</div>
      <div className="text-white/40 text-xs">{label}</div>
      {delta && <span className="absolute top-4 right-4 text-[10px] font-semibold px-2 py-1 rounded-full bg-green-500/10 text-green-400">{delta}</span>}
    </div>
  );
}

function RecentClientRow({ client }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: client.color + '22', border: `1px solid ${client.color}44` }}>
        {client.logo_emoji || client.name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold truncate">{client.name}</div>
        <div className="text-white/40 text-xs">{client.industry}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold" style={{ color: client.color }}>{client.followers}</div>
        <div className="text-white/30 text-[10px]">followers</div>
      </div>
    </div>
  );
}

export default function OverviewView() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    apiClient.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    if (user?.role !== 'client') {
      apiClient.get('/clients').then((r) => setClients(r.data?.slice(0, 4) || [])).catch(() => {});
    }
  }, [user]);

  const fmt = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white font-extrabold text-2xl md:text-3xl">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {user?.role === 'owner' && (
          <a href="/dashboard/clients" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_4px_16px_rgba(232,115,74,0.35)] hover:shadow-[0_8px_28px_rgba(232,115,74,0.5)] hover:-translate-y-0.5 transition-all">
            + Add Client
          </a>
        )}
      </div>

      {/* Stats — owner/employee only */}
      {user?.role !== 'client' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon="" value={stats.total_clients} label="Active Clients" color="#E8734A" />
          <StatCard icon="" value={stats.total_reels} label="Reels Delivered" color="#4DD9FF" />
          <StatCard icon="" value={fmt(stats.total_ad_spent)} label="Ad Spend (All)" color="#A78BFA" />
          <StatCard icon="" value={stats.total_dm_inquiries || 0} label="DM Inquiries" color="#34D399" />
        </div>
      )}

      {/* Recent clients */}
      {user?.role !== 'client' && clients.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-bold text-sm">Recent Clients</div>
              <a href="/dashboard/clients" className="text-[#E8734A] text-xs hover:underline">View All →</a>
            </div>
            {clients.map((c) => <RecentClientRow key={c.id} client={c} />)}
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5">
            <div className="text-white font-bold text-sm mb-4">Best Posting Times (IST)</div>
            {[
              { time: '7:00 AM', label: 'Morning peak', score: 5, color: '#4DD9FF', best: true },
              { time: '12:30 PM', label: 'Lunch break', score: 4, color: '#E8734A' },
              { time: '7:30 PM', label: 'Evening scroll', score: 5, color: '#A78BFA', best: true },
              { time: '10:00 PM', label: 'Late night — niche', score: 2, color: '#ffffff44' },
            ].map((slot) => (
              <div key={slot.time} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="font-bold text-sm min-w-[70px]" style={{ color: slot.color }}>{slot.time}</div>
                <div className="flex-1 text-white/40 text-xs">{slot.label}</div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < slot.score ? slot.color : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                {slot.best && <span className="text-[10px] bg-[#E8734A]/10 text-[#E8734A] px-2 py-0.5 rounded-full font-bold">Best</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client welcome view */}
      {user?.role === 'client' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E8734A]/15 border border-[#E8734A]/20 mx-auto mb-4 flex items-center justify-center">
              <div className="w-5 h-5 rounded-sm bg-[#E8734A]/60" />
            </div>
            <div className="text-white font-bold mb-2">Your Content Calendar</div>
            <div className="text-white/40 text-sm mb-4">View your scheduled posts and upcoming content</div>
            <a href="/dashboard/calendar" className="inline-flex items-center gap-2 bg-[#E8734A]/15 border border-[#E8734A]/30 text-[#E8734A] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#E8734A]/25 transition-colors">
              Open Calendar →
            </a>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#A78BFA]/15 border border-[#A78BFA]/20 mx-auto mb-4 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[#A78BFA]/60" />
            </div>
            <div className="text-white font-bold mb-2">Messages</div>
            <div className="text-white/40 text-sm mb-4">Chat directly with the BhuFix team</div>
            <a href="/dashboard/messages" className="inline-flex items-center gap-2 bg-[#E8734A]/15 border border-[#E8734A]/30 text-[#E8734A] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#E8734A]/25 transition-colors">
              Open Chat →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
