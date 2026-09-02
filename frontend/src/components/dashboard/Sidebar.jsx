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
  CheckSquare,
  Package,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can, jobLabel } from '../../lib/access';

const ICONS = {
  Overview: LayoutDashboard,
  Clients: Briefcase,
  Tasks: CheckSquare,
  Calendar: CalendarDays,
  Schedule: CalendarDays,
  'Meta Ads': Megaphone,
  'Strategy Hub': Compass,
  Assets: FolderOpen,
  'My Files': FolderOpen,
  Chat: MessageSquare,
  'KPI Tracker': LineChart,
  'My Reports': LineChart,
  Packages: Package,
  Invoices: Receipt,
  'Team & Users': Users,
};

function navFor(user) {
  const item = (to, label, perm, exact) => (can(user, perm) ? { to, label, exact, perm } : null);
  const main = [
    { to: '/dashboard', label: 'Overview', exact: true },
    item('/dashboard/clients', 'Clients', 'clients.read'),
    item('/dashboard/tasks', 'Tasks', 'tasks.read'),
    item('/dashboard/calendar', user?.role === 'client' ? 'Schedule' : 'Calendar', 'calendar.read'),
  ].filter(Boolean);
  const work = [
    item('/dashboard/ads', 'Meta Ads', 'ads.read'),
    item('/dashboard/strategy', 'Strategy Hub', 'strategy.read'),
    item('/dashboard/drive', user?.role === 'client' ? 'My Files' : 'Assets', 'assets.read'),
    item('/dashboard/chat', 'Chat', 'chat.read'),
    item('/dashboard/kpis', user?.role === 'client' ? 'My Reports' : 'KPI Tracker', 'kpis.read'),
  ].filter(Boolean);
  const admin = [
    item('/dashboard/packages', 'Packages', 'packages.read'),
    item('/dashboard/invoices', 'Invoices', 'invoices.read'),
    item('/dashboard/users', 'Team & Users', 'users.read'),
  ].filter(Boolean);
  const groups = [{ section: 'Main', items: main }];
  if (work.length) groups.push({ section: 'Work', items: work });
  if (admin.length) groups.push({ section: 'Admin', items: admin });
  return groups;
}

export function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = navFor(user);

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
            <span className="text-[11px] text-white/45">{jobLabel(user)}</span>
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
