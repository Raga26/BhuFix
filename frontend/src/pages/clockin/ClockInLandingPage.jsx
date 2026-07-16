import { Link } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';

export default function ClockInLandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Header />
      <main>
        <section className="relative pt-28 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" />
          <div
            className="absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(232,115,74,0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(77,217,255,0.2), transparent 35%)',
            }}
          />
          <div className="relative max-w-5xl mx-auto">
            <p className="text-coral font-bold text-xs uppercase tracking-[3px] mb-4">BhuFix ClockIN</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy dark:text-white max-w-3xl leading-[1.1]">
              Attendance that proves
              <span className="text-coral"> they came to work.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
              Employees text IN on WhatsApp → scan the live office QR → selfie matched to enrolled face.
              Or connect a biometric machine. Separate product from the BhuFix marketing dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/clockin/login"
                className="inline-flex items-center px-6 py-3 rounded-full bg-coral text-white font-semibold shadow-lg shadow-orange-500/25 hover:opacity-95 transition"
              >
                Owner login
              </Link>
              <Link
                to="/clockin/register"
                className="inline-flex items-center px-6 py-3 rounded-full border border-slate-300 dark:border-slate-700 text-navy dark:text-white font-semibold hover:border-coral transition"
              >
                Start free
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white mb-4">
            How employees ClockIN (no machine)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-2xl text-sm">
            Not “text IN from WhatsApp at home”. Presence is verified at the door.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['1. WhatsApp IN', 'Employee texts IN or OUT → gets a 90-second link. That alone is not a punch.'],
              ['2. Live QR + selfie', 'Scan the door QR (changes every 30s), then a selfie matched to their enrolled face.'],
              ['3. Or biometric machine', 'ZKTeco/eSSL ADMS still works for true fingerprint/face hardware.'],
            ].map(([t, d]) => (
              <div
                key={t}
                className="rounded-3xl p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800"
              >
                <h3 className="font-bold text-navy dark:text-white mb-2">{t}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-6 bg-navy dark:bg-black text-white">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
            {[
              ['Server time', 'Changing phone time cannot fake punch time'],
              ['Live QR', 'Photo of yesterday’s QR expires in 30 seconds'],
              ['Face match', 'Selfie vs enrolled photo — PIN only as fallback'],
            ].map(([t, d]) => (
              <div key={t}>
                <h3 className="font-bold text-lg mb-2">{t}</h3>
                <p className="text-white/60 text-sm">{d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/clockin/register"
              className="inline-flex px-8 py-3 rounded-full bg-coral font-semibold hover:opacity-95 transition"
            >
              Create ClockIN account
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
