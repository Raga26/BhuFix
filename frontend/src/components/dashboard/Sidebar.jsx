import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Role-based navigation groups
const NAV_CONFIG = {
  owner: [
    {
      section: 'Main',
      items: [
        { to: '/dashboard', label: 'Overview', exact: true },
        { to: '/dashboard/clients', label: 'Clients' },
        { to: '/dashboard/calendar', label: 'Calendar' },
      ],
    },
    {
      section: 'Work',
      items: [
        { to: '/dashboard/ads', label: 'Meta Ads' },
        { to: '/dashboard/strategy', label: 'Strategy Hub' },
        { to: '/dashboard/drive', label: 'Drive Links' },
        { to: '/dashboard/chat', label: 'Team Chat' },
        { to: '/dashboard/kpis', label: 'KPI Tracker' },
      ],
    },
    {
      section: 'Admin',
      items: [
        { to: '/dashboard/users', label: 'Team & Users' },
      ],
    },
  ],
  employee: [
    {
      section: 'Main',
      items: [
        { to: '/dashboard', label: 'Overview', exact: true },
        { to: '/dashboard/clients', label: 'Clients' },
        { to: '/dashboard/calendar', label: 'Calendar' },
      ],
    },
    {
      section: 'Work',
      items: [
        { to: '/dashboard/ads', label: 'Meta Ads' },
        { to: '/dashboard/strategy', label: 'Strategy Hub' },
        { to: '/dashboard/drive', label: 'Drive Links' },
        { to: '/dashboard/chat', label: 'Team Chat' },
        { to: '/dashboard/kpis', label: 'KPI Tracker' },
      ],
    },
  ],
  client: [
    {
      section: 'My Portal',
      items: [
        { to: '/dashboard', label: 'Overview', exact: true },
        { to: '/dashboard/calendar', label: 'Schedule' },
        { to: '/dashboard/drive', label: 'My Files' },
        { to: '/dashboard/messages', label: 'Messages' },
        { to: '/dashboard/kpis', label: 'My Reports' },
      ],
    },
  ],
};

const ROLE_BADGE = {
  owner: { label: 'Owner', color: 'text-[#E8734A]', bg: 'bg-[#E8734A]/10' },
  employee: { label: 'Employee', color: 'text-[#4DD9FF]', bg: 'bg-[#4DD9FF]/10' },
  client: { label: 'Client', color: 'text-[#A78BFA]', bg: 'bg-[#A78BFA]/10' },
};

export function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const groups = NAV_CONFIG[user?.role] || NAV_CONFIG.client;
  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.client;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-[#E8734A]/15 border border-[#E8734A]/30 text-[#E8734A]'
        : 'text-white/50 hover:bg-white/[0.06] hover:text-white border border-transparent'
    }`;

  return (
    <div className={`flex flex-col h-full bg-[#07080F]/90 backdrop-blur-2xl border-r border-white/[0.08] ${mobile ? 'w-full' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.08]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8734A] to-[#D4633D] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(232,115,74,0.35)]">
          <span className="font-extrabold text-sm text-white">B</span>
        </div>
        <div>
          <div className="text-white font-extrabold text-sm">BhuFix</div>
          <div className="text-white/30 text-[10px] uppercase tracking-widest">Dashboard</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white text-xl p-1">✕</button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#E8734A]/40">
        {groups.map((group) => (
          <div key={group.section}>
            <p className="text-white/20 text-[9px] uppercase tracking-[2.5px] px-3 mb-2">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={linkClass}
                  onClick={mobile ? onClose : undefined}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.08] space-y-2">
        {/* User chip */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8734A] to-[#A78BFA] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${badge.color} ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
