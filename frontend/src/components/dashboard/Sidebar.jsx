import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '⚡', roles: ['owner', 'employee'], exact: true },
  { to: '/dashboard/clients', label: 'Clients', icon: '👥', roles: ['owner', 'employee'] },
  { to: '/dashboard/calendar', label: 'Calendar', icon: '📅', roles: ['owner', 'employee', 'client'] },
  { to: '/dashboard/ads', label: 'Meta Ads', icon: '📊', roles: ['owner', 'employee'] },
  { to: '/dashboard/strategy', label: 'Strategy Hub', icon: '🎯', roles: ['owner', 'employee'] },
  { to: '/dashboard/drive', label: 'Drive Links', icon: '📁', roles: ['owner', 'employee'] },
  { to: '/dashboard/chat', label: 'Team Chat', icon: '💬', roles: ['owner', 'employee'] },
  { to: '/dashboard/messages', label: 'Messages', icon: '💬', roles: ['client'] },
  { to: '/dashboard/kpis', label: 'KPI Tracker', icon: '📈', roles: ['owner', 'employee'] },
  { to: '/dashboard/users', label: 'Users', icon: '🔐', roles: ['owner'] },
];

export function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(user?.role));

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
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.08]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8734A] to-[#D4633D] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(232,115,74,0.35)]">
          <span className="font-extrabold text-sm text-white">B</span>
        </div>
        <div>
          <div className="text-white font-extrabold text-sm">BhuFix</div>
          <div className="text-white/30 text-[10px] uppercase tracking-widest">Command Center</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-white/40 hover:text-white text-xl">✕</button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-white/20 text-[9px] uppercase tracking-[2.5px] px-3 mb-2 mt-1">Main</p>
        {visibleNav.slice(0, 4).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.exact}
            className={linkClass}
            onClick={mobile ? onClose : undefined}
          >
            <span className="text-base w-5 text-center">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}

        {user?.role !== 'client' && (
          <>
            <p className="text-white/20 text-[9px] uppercase tracking-[2.5px] px-3 mb-2 mt-4">Work</p>
            {visibleNav.slice(4).map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={linkClass}
                onClick={mobile ? onClose : undefined}
              >
                <span className="text-base w-5 text-center">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </>
        )}

        {user?.role === 'client' && visibleNav.slice(1).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={linkClass}
            onClick={mobile ? onClose : undefined}
          >
            <span className="text-base w-5 text-center">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* User chip + logout */}
      <div className="px-3 py-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8734A] to-[#A78BFA] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-white/40 text-[10px] capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} title="Logout" className="text-white/30 hover:text-[#E8734A] text-sm transition-colors">
            ↩
          </button>
        </div>
      </div>
    </div>
  );
}
