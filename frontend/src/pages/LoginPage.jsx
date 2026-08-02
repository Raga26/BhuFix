import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#07080F] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-[#E8734A] rounded-full opacity-10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#4DD9FF] rounded-full opacity-8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8734A] to-[#D4633D] flex items-center justify-center shadow-[0_0_24px_rgba(232,115,74,0.4)]">
              <span className="font-extrabold text-lg text-white">B</span>
            </div>
            <div className="text-left">
              <div className="text-white font-extrabold text-xl tracking-tight">BhuFix</div>
              <div className="text-white/40 text-xs tracking-widest uppercase">Dashboard</div>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to access your dashboard</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-[#E8734A]/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/20 text-sm outline-none focus:border-[#E8734A]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors p-1 text-sm select-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.1] hover:border-white/20 font-semibold py-3 rounded-xl transition-all"
              >
                <span>🏠</span>
                Home
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] bg-gradient-to-r from-[#E8734A] to-[#D4633D] text-white font-bold py-3 rounded-xl shadow-[0_4px_20px_rgba(232,115,74,0.35)] hover:shadow-[0_8px_32px_rgba(232,115,74,0.5)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </div>
          </form>
        </div>

        {/* Role guide */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 text-center">
            <div className="text-base mb-1">🏢</div>
            <div className="text-white/60 text-xs font-semibold mb-0.5">Team Member?</div>
            <div className="text-white/30 text-[10px] leading-relaxed">
              Use credentials provided by the owner
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 text-center">
            <div className="text-base mb-1">👤</div>
            <div className="text-white/60 text-xs font-semibold mb-0.5">Client?</div>
            <div className="text-white/30 text-[10px] leading-relaxed">
              Your account is set up by our team
            </div>
          </div>
        </div>
        <p className="text-center text-white/25 text-xs mt-4">
          New here?{' '}
          <Link to="/#contact" className="text-[#E8734A]/80 hover:text-[#E8734A] transition-colors">
            Get in touch with BhuFix
          </Link>
        </p>
      </div>
    </div>
  );
}
