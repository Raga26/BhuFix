import { Link } from 'react-router-dom';

/** Public signup frozen during ClockIN pilot development. */
export default function ClockInRegisterPage() {
  return (
    <div className="min-h-screen bg-[#07080F] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <Link to="/clockin" className="block mb-8">
          <div className="text-white font-extrabold text-xl">
            BhuFix <span className="text-[#E8734A]">ClockIN</span>
          </div>
        </Link>
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 space-y-4">
          <h1 className="text-white font-bold text-lg">Registration closed</h1>
          <p className="text-white/45 text-sm leading-relaxed">
            ClockIN is in a private pilot. New owner accounts cannot be created right now.
            If you already have access, sign in below.
          </p>
          <Link
            to="/clockin/login"
            className="inline-flex w-full justify-center py-3 rounded-xl bg-[#E8734A] text-white font-semibold"
          >
            Owner login
          </Link>
          <p>
            <Link to="/" className="text-white/40 text-xs hover:text-[#E8734A]">
              ← Back to BhuFix website
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
