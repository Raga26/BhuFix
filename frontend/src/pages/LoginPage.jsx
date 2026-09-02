import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  return 'Good evening.';
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hourIST = Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(now)
  );
  const timeIST = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const studioOpen = hourIST >= 10 && hourIST < 19;

  const handleCaps = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark text-white flex">
      <aside className="relative hidden lg:flex w-[44%] min-h-screen flex-col justify-between px-12 py-10 overflow-hidden bg-navy border-r border-white/[0.06]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(232,115,74,0.18) 0%, transparent 62%)',
          }}
        />
        <div className="login-grain absolute inset-0 opacity-[0.14] pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-coral" />

        <div className="relative">
          <Link to="/" className="inline-block text-[22px] font-extrabold tracking-tight">
            Bhu<span className="text-coral">Fix</span>
          </Link>
        </div>

        <div className="relative max-w-sm">
          <p className="text-coral/90 text-sm mb-4">{greetingForHour(hourIST)}</p>
          <h1 className="font-anchor italic font-medium text-[2.55rem] leading-[1.15] tracking-tight">
            The desk for work that actually ships.
          </h1>
          <p className="mt-5 text-white/40 text-[15px] leading-relaxed">
            Clients, calendars, and the floor — without the usual software noise.
          </p>
        </div>

        <div className="relative">
          <div className="font-anchor italic tabular-nums text-[1.65rem] text-white">
            {timeIST}
            <span className="ml-2 text-sm not-italic font-sans text-white/35 tracking-wide">IST</span>
          </div>
          <div className="mt-3 flex items-center gap-2.5 text-[12px] text-white/40">
            <span className={`w-1.5 h-1.5 rounded-full ${studioOpen ? 'bg-coral' : 'bg-white/25'}`} />
            <span>{studioOpen ? 'Studio open' : 'Studio closed'}</span>
            <span className="text-white/20">·</span>
            <span>10:00–19:00</span>
          </div>
          <p className="mt-8 text-[11px] tracking-[0.18em] uppercase text-white/25">
            Udumalpet · Coimbatore · Tirupur
          </p>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center px-5 py-12 relative">
        <div className="absolute top-6 left-5 right-5 flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden text-[18px] font-extrabold tracking-tight">
            Bhu<span className="text-coral">Fix</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/80 transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={1.75} />
            Website
          </Link>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8">
            <p className="text-coral/90 text-sm mb-1">{greetingForHour(hourIST)}</p>
            <h1 className="font-anchor italic font-medium text-[1.85rem] leading-tight">Sign in</h1>
          </div>
          <div className="hidden lg:block mb-9">
            <h1 className="font-anchor italic font-medium text-[2.1rem] leading-tight">Sign in</h1>
            <p className="text-white/40 text-sm mt-2">Use the credentials issued to you.</p>
          </div>

          {error && (
            <div className="mb-6 px-3.5 py-2.5 rounded-md border border-red-500/25 bg-red-500/[0.07] text-red-300 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="dash-label">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="dash-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-white/40 text-[11px]">Password</label>
                {capsOn && (
                  <span className="text-[11px] text-coral">Caps Lock is on</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleCaps}
                  onKeyUp={handleCaps}
                  placeholder="Your password"
                  className="dash-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="dash-btn dash-btn-primary w-full h-11 text-[14px]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in
                </span>
              ) : (
                'Continue'
              )}
            </button>

            <p className="flex items-center justify-center gap-2 text-[11px] text-white/30">
              Press
              <kbd className="px-1.5 py-0.5 rounded border border-white/15 bg-white/[0.04] text-white/50 font-sans text-[10px] tracking-wide">
                Enter
              </kbd>
              to continue
            </p>
          </form>

          <div className="mt-10 pt-6 border-t border-white/[0.07] text-[12px] text-white/35 leading-relaxed">
            Team accounts are issued by the owner. Client access is set up by BhuFix.
            {' '}
            <Link to="/#contact" className="text-coral hover:text-coral-dark transition-colors">
              Get in touch
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
