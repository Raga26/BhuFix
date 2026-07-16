import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClockInAuth } from '../../context/ClockInAuthContext';

export default function ClockInRegisterPage() {
  const { register } = useClockInAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', business_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/clockin/app', { replace: true });
    } catch (err) {
      const d = err.response?.data?.detail;
      const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join(', ') : null;
      setError(msg || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080F] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/clockin" className="block text-center mb-8">
          <div className="text-white font-extrabold text-xl">BhuFix <span className="text-[#E8734A]">ClockIN</span></div>
          <div className="text-white/40 text-xs uppercase tracking-widest mt-1">Create owner account</div>
        </Link>
        <p className="text-center mb-4">
          <Link to="/" className="text-white/40 text-xs hover:text-[#E8734A]">← Back to BhuFix website</Link>
        </p>
        <form onSubmit={submit} className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
          {[
            ['name', 'Your name', 'text'],
            ['business_name', 'Business name', 'text'],
            ['email', 'Email', 'email'],
            ['password', 'Password (min 6)', 'password'],
          ].map(([k, label, type]) => (
            <div key={k}>
              <label className="text-white/40 text-xs uppercase tracking-wider">{label}</label>
              <input
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#E8734A]/50"
                type={type}
                required
                minLength={k === 'password' ? 6 : undefined}
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </div>
          ))}
          <button disabled={loading} className="w-full py-3 rounded-xl bg-[#E8734A] text-white font-semibold disabled:opacity-50">
            {loading ? 'Creating…' : 'Create ClockIN'}
          </button>
          <p className="text-center text-white/40 text-sm">
            Already have an account? <Link to="/clockin/login" className="text-[#E8734A]">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
