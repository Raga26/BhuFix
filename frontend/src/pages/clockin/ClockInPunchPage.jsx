import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const getBase = () => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (process.env.NODE_ENV === 'production') return window.location.origin;
  return 'http://localhost:8000';
};

/**
 * Flow: WhatsApp link → scan live office QR → selfie (face match) → done.
 * PIN is fallback only.
 */
export default function ClockInPunchPage() {
  const [params] = useSearchParams();
  const challengeId = params.get('challenge') || '';
  const displayTokenParam = params.get('display') || '';
  const codeFromQr = params.get('code') || '';

  const [step, setStep] = useState(1); // 1 QR+GPS, 2 selfie, 3 done
  const [boot, setBoot] = useState(null);
  const [phone, setPhone] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [officeQr, setOfficeQr] = useState(codeFromQr);
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (codeFromQr) setOfficeQr(codeFromQr);
  }, [codeFromQr]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (displayTokenParam) q.set('display_token', displayTokenParam);
    if (challengeId) q.set('challenge_id', challengeId);
    if (!displayTokenParam && !challengeId) {
      setBoot({
        error: 'Text IN or OUT to the ClockIN WhatsApp number, or scan the live office QR.',
      });
      return;
    }
    axios
      .get(`${getBase()}/api/clockin/public/punch/bootstrap?${q}`)
      .then((r) => setBoot(r.data))
      .catch((err) => {
        setBoot({
          error: err.response?.data?.detail || 'Open from WhatsApp link or office QR',
        });
      });
  }, [challengeId, displayTokenParam]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('GPS not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Allow location — you must be at the office'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error('Camera permission required for selfie');
    }
  };

  useEffect(() => {
    if (step === 2) startCamera();
    else stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const buildQrPayload = () => {
    let qrPayload = officeQr.trim();
    if (qrPayload && !qrPayload.startsWith('CLOCKIN|') && displayTokenParam) {
      qrPayload = `CLOCKIN|${displayTokenParam}|${qrPayload}`;
    }
    return qrPayload;
  };

  const startSession = async () => {
    if (!coords) {
      toast.error(geoError || 'Waiting for GPS…');
      return;
    }
    const qrPayload = buildQrPayload();
    if (!qrPayload && !displayTokenParam) {
      toast.error('Enter or scan the live office QR code');
      return;
    }
    if (!challengeId && !phone && !empCode) {
      toast.error('Enter your phone or employee code');
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.post(`${getBase()}/api/clockin/public/punch/session`, {
        challenge_id: challengeId || null,
        office_qr: qrPayload || null,
        display_token: displayTokenParam || null,
        phone: phone || null,
        employee_code: empCode || null,
        lat: coords.lat,
        lng: coords.lng,
        direction: boot?.direction || 'auto',
      });
      setSession(data);
      setStep(2);
      toast.success(`Hi ${data.employee_name} — take a selfie`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not verify office presence');
    } finally {
      setBusy(false);
    }
  };

  const captureAndPunch = async () => {
    if (!session || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const selfie_base64 = canvas.toDataURL('image/jpeg', 0.85);

    setBusy(true);
    try {
      const { data } = await axios.post(`${getBase()}/api/clockin/public/punch`, {
        session_id: session.session_id,
        selfie_base64,
        liveness_action: session.liveness_key,
        use_pin_fallback: false,
      });
      stopCamera();
      setResult(data);
      setStep(3);
      toast.success(data.message);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Face check failed';
      toast.error(msg);
      if (String(msg).toLowerCase().includes('pin')) setShowPin(true);
    } finally {
      setBusy(false);
    }
  };

  const punchWithPin = async () => {
    if (!session || pin.length < 4) {
      toast.error('Enter PIN');
      return;
    }
    setBusy(true);
    try {
      const { data } = await axios.post(`${getBase()}/api/clockin/public/punch`, {
        session_id: session.session_id,
        use_pin_fallback: true,
        pin,
      });
      stopCamera();
      setResult(data);
      setStep(3);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'PIN failed');
    } finally {
      setBusy(false);
    }
  };

  if (boot?.error) {
    return (
      <div className="min-h-screen bg-[#07080F] text-white flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-[#E8734A] font-bold mb-2">BhuFix ClockIN</p>
          <p className="text-white/60 text-sm max-w-sm">{boot.error}</p>
        </div>
      </div>
    );
  }

  if (!boot) {
    return (
      <div className="min-h-screen bg-[#07080F] text-white/40 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080F] text-white flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="text-[#E8734A] text-[10px] uppercase tracking-[3px] font-bold mb-2">BhuFix ClockIN</p>
        <h1 className="text-2xl font-extrabold mb-1">{boot.company_name}</h1>
        <p className="text-white/40 text-xs mb-4 leading-relaxed">
          {boot.employee_name ? `Hi ${boot.employee_name}. ` : ''}
          Step {step}/3 — QR at door, then selfie. Server time only (phone clock cannot cheat).
        </p>

        <div className="flex gap-2 mb-6">
          {['QR', 'Selfie', 'Done'].map((label, i) => (
            <div
              key={label}
              className={`flex-1 text-center text-[10px] uppercase tracking-wider py-1.5 rounded-lg border ${
                step === i + 1
                  ? 'border-[#E8734A] text-[#E8734A] bg-[#E8734A]/10'
                  : step > i + 1
                    ? 'border-[#4ADE80]/40 text-[#4ADE80]'
                    : 'border-white/10 text-white/30'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            {geoError && <p className="text-amber-300 text-xs mb-2">{geoError}</p>}
            {coords && (
              <p className="text-[#4ADE80] text-xs mb-3">
                GPS ready ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
              </p>
            )}

            <label className="text-white/30 text-[10px] uppercase tracking-wider">
              Live office code (from door screen)
            </label>
            <input
              className="w-full mt-1 mb-3 bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-3 text-sm font-mono outline-none focus:border-[#E8734A]/50"
              placeholder={codeFromQr ? 'Code from QR scan' : '8-char code'}
              value={officeQr}
              onChange={(e) => setOfficeQr(e.target.value.toUpperCase())}
            />

            {!challengeId && (
              <>
                <label className="text-white/30 text-[10px] uppercase tracking-wider">Phone</label>
                <input
                  className="w-full mt-1 mb-3 bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-3 text-sm outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                />
                <label className="text-white/30 text-[10px] uppercase tracking-wider">Or employee code</label>
                <input
                  className="w-full mt-1 mb-4 bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-3 text-sm outline-none"
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                />
              </>
            )}

            <button
              disabled={busy}
              onClick={startSession}
              className="w-full py-3.5 rounded-2xl bg-[#E8734A] font-semibold disabled:opacity-50"
            >
              {busy ? 'Checking…' : 'Verify office QR → continue'}
            </button>
          </>
        )}

        {step === 2 && session && (
          <>
            <p className="text-sm text-white/80 mb-1">
              Clocking <span className="text-[#E8734A] font-bold">{session.direction?.toUpperCase()}</span> for{' '}
              {session.employee_name}
            </p>
            <p className="text-[#4DD9FF] text-sm font-semibold mb-3">{session.liveness_prompt}</p>

            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black aspect-square mb-4">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            </div>

            {!session.face_enrolled && (
              <p className="text-amber-300 text-xs mb-3">
                No face enrolled yet — use PIN fallback below, or ask owner to enroll your face.
              </p>
            )}

            <button
              disabled={busy || !session.face_enrolled}
              onClick={captureAndPunch}
              className="w-full py-3.5 rounded-2xl bg-[#4ADE80] text-[#07080F] font-bold disabled:opacity-40 mb-3"
            >
              {busy ? 'Matching…' : 'Capture selfie & ClockIN'}
            </button>

            <button
              type="button"
              className="w-full text-white/40 text-xs underline mb-2"
              onClick={() => setShowPin((v) => !v)}
            >
              Use PIN fallback instead
            </button>

            {(showPin || !session.face_enrolled) && (
              <div className="space-y-2">
                <input
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-3 text-sm tracking-widest outline-none"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <button
                  disabled={busy}
                  onClick={punchWithPin}
                  className="w-full py-3 rounded-xl border border-white/20 text-sm font-semibold disabled:opacity-50"
                >
                  Confirm with PIN
                </button>
              </div>
            )}
          </>
        )}

        {step === 3 && result && (
          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-5 text-center">
            <p className="text-[#4ADE80] text-lg font-bold mb-2">{result.message}</p>
            <p className="text-white/50 text-sm">
              {new Date(result.punched_at).toLocaleString('en-IN')}
            </p>
            <p className="text-white/30 text-xs mt-2">
              Via {result.identity_via}
              {result.face_score != null ? ` · face score ${result.face_score}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
