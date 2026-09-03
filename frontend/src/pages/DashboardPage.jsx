import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, LayoutDashboard, Briefcase, CalendarDays, MessageSquare, LogOut, CheckSquare, Clapperboard, FileCheck, Globe, Megaphone, Search, Sparkles } from 'lucide-react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { deskKind } from '../lib/access';
import apiClient from '../utils/axiosConfig';

const MOBILE_TABS = {
  leadership: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  creative: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/clip', label: 'Clip', icon: Clapperboard },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  tech: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/web', label: 'Web', icon: Globe },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  ads: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/ads', label: 'Ads', icon: Megaphone },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  smm: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  seo: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/seo', label: 'SEO', icon: Search },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  analyst: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/insights', label: 'Insights', icon: Sparkles },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  ops: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  staff: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/clients', label: 'Clients', icon: Briefcase },
    { to: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
  client: [
    { to: '/dashboard', label: 'Home', exact: true, icon: LayoutDashboard },
    { to: '/dashboard/calendar', label: 'Content', icon: CalendarDays },
    { to: '/dashboard/approvals', label: 'Approve', icon: FileCheck },
    { to: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
  ],
};

function BottomTabBar({ onMore }) {
  const { user } = useAuth();
  const tabs = MOBILE_TABS[deskKind(user)] || MOBILE_TABS.staff;

  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-2 py-2.5 flex-1 transition-colors ${
      isActive ? 'text-[#E8734A]' : 'text-white/35'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy-dark/95 backdrop-blur-md border-t border-white/[0.07] flex items-center safe-area-bottom">
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
    apiClient.post('/automations/tick').catch(() => {});
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

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="grid grid-cols-3 md:flex md:items-center md:justify-between items-center gap-2 px-4 md:px-8 min-h-12 md:h-14 py-1 md:py-0 pt-[max(0.5rem,env(safe-area-inset-top,0px))] md:pt-0 border-b border-white/[0.06] bg-navy-dark/90 backdrop-blur sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden justify-self-start text-white/50 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <p className="hidden md:block font-anchor italic text-[15px] text-white/40">{today}</p>
          <Link to="/" className="md:hidden justify-self-center text-[15px] font-extrabold tracking-tight text-white">
            Bhu<span className="text-coral">Fix</span>
          </Link>
          <div className="justify-self-end flex items-center gap-0 md:gap-3">
            <NotificationBell />
            <span className="hidden md:inline text-[13px] text-white/40 truncate max-w-[200px]">{user?.name}</span>
            <Link to="/?site=1" className="hidden md:inline text-[12px] text-white/35 hover:text-white/70 transition-colors">
              Website
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden text-white/40 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Sign out"
            >
              <LogOut size={16} strokeWidth={1.75} />
            </button>
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
