import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClockInAuth } from '../../context/ClockInAuthContext';

export default function ClockInLoginPage() {
  const { login } = useClockInAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/clockin/app', { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080F] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/clockin" className="block text-center mb-8">
          <div className="text-white font-extrabold text-xl">BhuFix <span className="text-[#E8734A]">ClockIN</span></div>
          <div className="text-white/40 text-xs uppercase tracking-widest mt-1">Owner login</div>
        </Link>
        <p className="text-center mb-4">
          <Link to="/" className="text-white/40 text-xs hover:text-[#E8734A]">← Back to BhuFix website</Link>
        </p>
        <form onSubmit={submit} className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Email</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#E8734A]/50" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider">Password</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#E8734A]/50" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button disabled={loading} className="w-full py-3 rounded-xl bg-[#E8734A] text-white font-semibold disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-white/40 text-sm">
            New business? <Link to="/clockin/register" className="text-[#E8734A]">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
