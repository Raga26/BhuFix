import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const getBase = () => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (process.env.NODE_ENV === 'production') return window.location.origin;
  return 'http://localhost:8000';
};

/** Large live QR for office TV/tablet — codes rotate so phone photos go stale. */
export default function ClockInDisplayPage() {
  const { displayToken } = useParams();
  const [info, setInfo] = useState(null);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${getBase()}/api/clockin/public/display/${displayToken}`)
      .then((r) => setInfo(r.data))
      .catch(() => setError('Invalid display link'));
  }, [displayToken]);

  useEffect(() => {
    if (!displayToken) return undefined;
    let alive = true;
    const load = () => {
      axios
        .get(`${getBase()}/api/clockin/public/display/${displayToken}/qr`)
        .then((r) => {
          if (alive) setQr(r.data);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [displayToken]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-400 flex items-center justify-center p-6">
        {error}
      </div>
    );
  }

  const qrImg = qr?.qr_payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(qr.qr_payload)}`
    : null;

  return (
    <div className="min-h-screen bg-[#05060A] text-white flex flex-col items-center justify-center px-6 py-10">
      <p className="text-[#E8734A] text-xs uppercase tracking-[4px] font-bold mb-2">BhuFix ClockIN</p>
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-center">{info?.company_name || '…'}</h1>
      <p className="text-white/40 text-sm mb-8 text-center max-w-md">
        Scan this live code at the door. It changes every {info?.window_seconds || 30}s — a photo will not work later.
      </p>

      <div className="bg-white rounded-3xl p-6 shadow-[0_0_60px_rgba(232,115,74,0.25)]">
        {qrImg ? (
          <img src={qrImg} alt="ClockIN QR" width={360} height={360} className="w-72 h-72 sm:w-80 sm:h-80" />
        ) : (
          <div className="w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center text-slate-400">Loading…</div>
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Or type code</p>
        <p className="text-4xl sm:text-5xl font-mono font-bold tracking-[0.35em] text-[#4DD9FF]">
          {qr?.code || '--------'}
        </p>
        <p className="text-white/30 text-xs mt-3">
          Refreshes in ~{qr?.expires_in ?? '—'}s
        </p>
      </div>
    </div>
  );
}
