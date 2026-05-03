import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/dashboard/Sidebar';
import { useAuth } from '../context/AuthContext';

// Mobile bottom tab items (max 4 per role)
const MOBILE_TABS = {
  owner: [
    { to: '/dashboard', icon: '⚡', label: 'Home', exact: true },
    { to: '/dashboard/clients', icon: '👥', label: 'Clients' },
    { to: '/dashboard/calendar', icon: '📅', label: 'Calendar' },
    { to: '/dashboard/chat', icon: '💬', label: 'Chat' },
  ],
  employee: [
    { to: '/dashboard', icon: '⚡', label: 'Home', exact: true },
    { to: '/dashboard/clients', icon: '👥', label: 'Clients' },
    { to: '/dashboard/calendar', icon: '📅', label: 'Calendar' },
    { to: '/dashboard/chat', icon: '💬', label: 'Chat' },
  ],
  client: [
    { to: '/dashboard', icon: '⚡', label: 'Home', exact: true },
    { to: '/dashboard/calendar', icon: '📅', label: 'Schedule' },
    { to: '/dashboard/messages', icon: '💬', label: 'Messages' },
    { to: '/dashboard/kpis', icon: '📈', label: 'Reports' },
  ],
};

function BottomTabBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tabs = MOBILE_TABS[user?.role] || MOBILE_TABS.client;

  const tabClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1 transition-all ${
      isActive ? 'text-[#E8734A]' : 'text-white/40'
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#07080F]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center safe-area-bottom">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.exact} className={tabClass}>
          <span className="text-xl">{t.icon}</span>
          <span className="text-[10px] font-medium">{t.label}</span>
        </NavLink>
      ))}
      {/* More / Menu button */}
      <button
        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1 text-white/40"
        onClick={() => navigate('/dashboard')}
      >
        <span className="text-xl">☰</span>
        <span className="text-[10px] font-medium">More</span>
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#07080F]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#E8734A] rounded-full opacity-[0.07] blur-[100px]" />
        <div className="absolute top-[30%] right-[-150px] w-[500px] h-[500px] bg-[#4DD9FF] rounded-full opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-[-100px] left-[30%] w-[400px] h-[400px] bg-[#A78BFA] rounded-full opacity-[0.05] blur-[100px]" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </div>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 relative z-10 flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#07080F]/80 backdrop-blur sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white text-xl p-1">
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8734A] to-[#D4633D] flex items-center justify-center">
              <span className="font-extrabold text-xs text-white">B</span>
            </div>
            <span className="text-white font-bold text-sm">BhuFix</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              title="Back to website"
              className="text-white/40 hover:text-white/80 text-lg p-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              🌐
            </button>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-white/40 hover:text-red-400 text-lg p-1.5 rounded-lg hover:bg-red-400/10 transition-all"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}
