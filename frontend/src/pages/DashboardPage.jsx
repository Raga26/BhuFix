import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, LayoutDashboard, Briefcase, CalendarDays, MessageSquare, LogOut, CheckSquare } from 'lucide-react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/axiosConfig';

const MOBILE_TABS = {
  owner: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  admin: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  operations_manager: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  employee: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  client: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/calendar', label: 'Schedule', icon: CalendarDays },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
    { to: '/dashboard/invoices', label: 'Invoices', icon: Briefcase },
  ],
};

function BottomTabBar({ onMore }) {
  const { user } = useAuth();
  const tabs = MOBILE_TABS[user?.role] || MOBILE_TABS.client;

  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-2 py-2.5 flex-1 transition-colors ${
      isActive ? 'text-[#E8734A]' : 'text-white/35'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy-dark/95 backdrop-blur-md border-t border-white/[0.07] flex items-center safe-area-bottom">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <NavLink key={t.to} to={t.to} end={t.exact} className={tabClass}>
            <Icon size={18} strokeWidth={1.7} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        className="flex flex-col items-center gap-1 px-2 py-2.5 flex-1 text-white/35"
        onClick={onMore}
      >
        <Menu size={18} strokeWidth={1.7} />
        <span className="text-[10px] font-medium">More</span>
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const beat = () => apiClient.post('/chat/presence').catch(() => {});
    beat();
    const t = setInterval(beat, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen bg-navy-dark">
      <div className="hidden md:flex w-60 fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] z-10">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 md:ml-60 relative z-10 flex flex-col min-h-screen">
        <div className="md:hidden flex items-center justify-between px-4 min-h-12 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] border-b border-white/[0.06] bg-navy-dark/90 backdrop-blur sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/50 hover:text-white p-1"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <Link to="/" className="text-[15px] font-extrabold tracking-tight text-white">
            Bhu<span className="text-coral">Fix</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white p-1"
            aria-label="Sign out"
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>

        <header className="hidden md:flex items-center justify-between px-8 h-14 border-b border-white/[0.06]">
          <p className="font-anchor italic text-[15px] text-white/40">{today}</p>
          <div className="flex items-center gap-5">
            <span className="text-[13px] text-white/40 truncate max-w-[200px]">{user?.name}</span>
            <Link to="/" className="text-[12px] text-white/35 hover:text-white/70 transition-colors">
              Website
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 md:p-8 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-10">
          <Outlet />
        </main>
      </div>

      <div className="md:hidden">
        <BottomTabBar onMore={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}
