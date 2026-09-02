import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  Megaphone,
  Compass,
  FolderOpen,
  MessageSquare,
  LineChart,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ICONS = {
  Overview: LayoutDashboard,
  Clients: Briefcase,
  Calendar: CalendarDays,
  Schedule: CalendarDays,
  'Meta Ads': Megaphone,
  'Strategy Hub': Compass,
  'Drive Links': FolderOpen,
  'My Files': FolderOpen,
  Chat: MessageSquare,
  'KPI Tracker': LineChart,
  'My Reports': LineChart,
  'Team & Users': Users,
};

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
        { to: '/dashboard/chat', label: 'Chat' },
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
        { to: '/dashboard/calendar', label: 'Calendar' },
      ],
    },
    {
      section: 'Work',
      items: [
        { to: '/dashboard/ads', label: 'Meta Ads' },
        { to: '/dashboard/strategy', label: 'Strategy Hub' },
        { to: '/dashboard/drive', label: 'Drive Links' },
        { to: '/dashboard/chat', label: 'Chat' },
        { to: '/dashboard/kpis', label: 'KPI Tracker' },
      ],
    },
  ],
  client: [
    {
      section: 'Portal',
      items: [
        { to: '/dashboard', label: 'Overview', exact: true },
        { to: '/dashboard/calendar', label: 'Schedule' },
        { to: '/dashboard/drive', label: 'My Files' },
        { to: '/dashboard/chat', label: 'Chat' },
        { to: '/dashboard/kpis', label: 'My Reports' },
      ],
    },
  ],
};

const ROLE_BADGE = {
  owner: { label: 'Owner', color: 'text-[#E8734A]' },
  employee: { label: 'Team', color: 'text-sky-300' },
  client: { label: 'Client', color: 'text-white/50' },
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
    `group relative flex items-center gap-2.5 px-3 py-[9px] rounded-md text-[13px] transition-colors ${
      isActive
        ? 'text-white bg-white/[0.06]'
        : 'text-white/45 hover:text-white/80 hover:bg-white/[0.03]'
    }`;

  return (
    <div className={`flex flex-col h-full bg-navy-dark border-r border-white/[0.07] ${mobile ? 'w-full' : 'w-60'}`}>
      <div className="flex items-center gap-3 px-5 h-14 border-b border-white/[0.07]">
        <Link to="/" className="text-[17px] font-extrabold tracking-tight text-white">
          Bhu<span className="text-coral">Fix</span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="ml-auto p-1.5 text-white/40 hover:text-white" aria-label="Close menu">
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        {groups.map((group) => (
          <div key={group.section}>
            <p className="text-white/25 text-[10px] tracking-[0.16em] uppercase px-3 mb-1.5">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.label] || LayoutDashboard;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={linkClass}
                    onClick={mobile ? onClose : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#E8734A]" />
                        )}
                        <Icon size={15} strokeWidth={1.7} className={isActive ? 'text-[#E8734A]' : 'text-white/35 group-hover:text-white/55'} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-white/[0.07] space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-md bg-navy border border-white/[0.08] flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[13px] font-medium truncate">{user?.name}</div>
            <span className={`text-[11px] ${badge.color}`}>{badge.label}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
        >
          <LogOut size={14} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );
}
