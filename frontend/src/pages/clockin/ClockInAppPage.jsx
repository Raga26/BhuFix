import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { clockInApi, useClockInAuth } from '../../context/ClockInAuthContext';

const TABS = ['Today', 'Employees', 'Devices', 'Payroll', 'Setup'];
const inputCls =
  'w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#E8734A]/50';
const btnPrimary =
  'px-4 py-2 rounded-xl bg-[#E8734A] text-white text-sm font-semibold hover:bg-[#D4633D] transition-colors';
const btnGhost =
  'px-3 py-1.5 rounded-lg border border-white/[0.12] text-white/60 text-xs hover:text-white hover:border-white/25 transition-colors';

const STATUS_STYLE = {
  present: { label: 'Present', color: '#4ADE80' },
  late: { label: 'Late', color: '#FBBF24' },
  half_day: { label: 'Half-day', color: '#A78BFA' },
  absent: { label: 'Absent', color: '#F87171' },
  week_off: { label: 'Week off', color: '#94A3B8' },
};

const ENROLL_SHOTS = [
  { id: 'front', prompt: 'Look straight at the camera — face the light' },
  { id: 'left', prompt: 'Turn your head slightly left, then face the camera' },
  { id: 'right', prompt: 'Turn your head slightly right, then face the camera' },
];

const fmtTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const fmtHours = (h) => {
  if (h == null || h === '') return '—';
  const n = Number(h);
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)} h`;
};

export default function ClockInAppPage() {
  const { owner, loading: authLoading, logout } = useClockInAuth();
  const navigate = useNavigate();
  const api = clockInApi();

  const [tab, setTab] = useState('Today');
  const [company, setCompany] = useState(null);
  const [today, setToday] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [devices, setDevices] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empForm, setEmpForm] = useState(null);
  const [deviceForm, setDeviceForm] = useState(null);
  const [faceEmp, setFaceEmp] = useState(null);
  const [faceMeta, setFaceMeta] = useState(null);
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, t, e, d] = await Promise.all([
        api.get('/clockin/company'),
        api.get('/clockin/attendance/today'),
        api.get('/clockin/employees'),
        api.get('/clockin/devices'),
      ]);
      setCompany(c.data);
      setToday(t.data);
      setEmployees(e.data || []);
      setDevices(d.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load ClockIN');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (owner) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  if (authLoading) {
    return <div className="min-h-screen bg-[#07080F] text-white/40 flex items-center justify-center">Loading…</div>;
  }
  if (!owner) return <Navigate to="/clockin/login" replace />;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const apiBase =
    process.env.REACT_APP_BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? origin : 'http://localhost:8000');
  const admsHost = apiBase.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const displayUrl = company ? `${origin}${company.display_path}` : '';
  const webhookUrl = `${apiBase.replace(/\/$/, '')}/api/clockin/whatsapp/webhook`;

  const saveCompany = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/clockin/company', {
        name: company.name,
        owner_whatsapp: company.owner_whatsapp || '',
        bot_whatsapp: company.bot_whatsapp || '',
        shift_start: company.shift_start,
        shift_end: company.shift_end,
        grace_minutes: +company.grace_minutes || 15,
        half_day_hours: +company.half_day_hours || 4,
        timezone: company.timezone || 'Asia/Kolkata',
        office_lat: company.office_lat === '' || company.office_lat == null ? null : +company.office_lat,
        office_lng: company.office_lng === '' || company.office_lng == null ? null : +company.office_lng,
        geofence_radius_m: +company.geofence_radius_m || 120,
      });
      setCompany((prev) => ({ ...prev, ...data }));
      toast.success('Saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS not available');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCompany((c) => ({
          ...c,
          office_lat: pos.coords.latitude.toFixed(6),
          office_lng: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Office pin set from your current location');
      },
      () => toast.error('Could not read GPS')
    );
  };

  const saveEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: empForm.name,
        phone: empForm.phone || null,
        employee_code: empForm.employee_code || null,
        device_user_id: empForm.device_user_id || null,
        pay_type: empForm.pay_type || 'monthly',
        monthly_salary: +empForm.monthly_salary || 0,
        daily_wage: +empForm.daily_wage || 0,
        ot_rate_per_hour: +empForm.ot_rate_per_hour || 0,
      };
      if (empForm.pin) payload.pin = empForm.pin;
      if (empForm.id) {
        if (!empForm.pin) delete payload.pin;
        await api.put(`/clockin/employees/${empForm.id}`, payload);
        toast.success('Employee updated');
      } else {
        if (!empForm.pin) {
          toast.error('PIN required (4–6 digits)');
          return;
        }
        payload.pin = empForm.pin;
        await api.post('/clockin/employees', payload);
        toast.success('Employee added');
      }
      setEmpForm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not save');
    }
  };

  const saveDevice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/clockin/devices', {
        serial_number: deviceForm.serial_number,
        name: deviceForm.name || 'Biometric Device',
        brand: deviceForm.brand || 'zkteco',
      });
      toast.success('Device registered');
      setDeviceForm(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not register');
    }
  };

  const generatePayroll = async () => {
    try {
      const { data } = await api.post('/clockin/payroll/generate', {
        month: +payMonth,
        year: +payYear,
      });
      setPayroll(data);
      toast.success(`Payroll ₹${data.total_net?.toLocaleString('en-IN')}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payroll failed');
    }
  };

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  };

  const openFaceEnroll = async (emp) => {
    setFaceEmp(emp);
    try {
      const { data } = await api.get(`/clockin/employees/${emp.id}/faces`);
      setFaceMeta(data);
    } catch {
      setFaceMeta({ count: 0, faces: [], max: 3 });
    }
  };

  const createTestLink = async (emp, direction = 'in') => {
    try {
      const { data } = await api.post(
        `/clockin/challenges/create-test?employee_id=${emp.id}&direction=${direction}`
      );
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${base}${data.punch_path || `/clockin/punch?challenge=${data.challenge_id}`}`;
      await copy(link, `${direction.toUpperCase()} link`);
      window.open(link, '_blank', 'noopener,noreferrer');
      toast.message('Opened punch page — finish within 90 seconds');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create link');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080F] text-white">
      <header className="border-b border-white/[0.08] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <Link to="/clockin" className="text-white font-extrabold">
            BhuFix <span className="text-[#E8734A]">ClockIN</span>
          </Link>
          <p className="text-white/30 text-xs">{owner.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Link to="/" className={btnGhost}>
            ← BhuFix home
          </Link>
          {displayUrl && (
            <a href={displayUrl} target="_blank" rel="noreferrer" className={btnGhost}>
              Open office display
            </a>
          )}
          <button
            className={btnGhost}
            onClick={() => {
              logout();
              navigate('/clockin/login');
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Owner console</h1>
            <p className="text-white/40 text-sm mt-1">Separate from BhuFix marketing dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  tab === t ? 'bg-[#E8734A] text-white' : 'text-white/45 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-white/40 text-sm">Loading…</p>}

        {!loading && tab === 'Today' && today && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(today.counts || {}).map(([k, v]) => {
                const st = STATUS_STYLE[k] || { label: k, color: '#fff' };
                return (
                  <div key={k} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
                    <div className="text-2xl font-extrabold" style={{ color: st.color }}>{v}</div>
                    <div className="text-white/35 text-xs mt-1">{st.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-white/70 text-sm font-semibold">Daily attendance — {today.date}</span>
                  <p className="text-white/30 text-[11px] mt-0.5">
                    Check-in, check-out, hours, and how they punched (QR + selfie / PIN / machine).
                  </p>
                </div>
                <button className={btnGhost} onClick={() => copy(today.digest_text, 'WhatsApp digest')}>
                  Copy WhatsApp digest
                </button>
              </div>

              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-white/25 border-b border-white/[0.04]">
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Check-in</div>
                <div className="col-span-2">Check-out</div>
                <div className="col-span-1">Hours</div>
                <div className="col-span-2">Method</div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {(today.summaries || []).map((s) => {
                  const st = STATUS_STYLE[s.status] || STATUS_STYLE.absent;
                  const emp = employees.find((e) => e.id === s.employee_id);
                  const open = expandedEmp === s.employee_id;
                  const method =
                    s.awaiting_checkout
                      ? `${s.check_in_method || '—'} (still in)`
                      : s.last_out
                        ? `IN: ${s.check_in_method || '—'} · OUT: ${s.check_out_method || '—'}`
                        : s.check_in_method || '—';
                  return (
                    <div key={s.employee_id}>
                      <button
                        type="button"
                        onClick={() => setExpandedEmp(open ? null : s.employee_id)}
                        className="w-full text-left px-4 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center space-y-2 sm:space-y-0">
                          <div className="sm:col-span-3">
                            <div className="text-white text-sm font-semibold">{emp?.name || s.employee_name}</div>
                            <div className="text-white/25 text-[11px]">{emp?.phone || emp?.employee_code || ''}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <span
                              className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                              style={{ color: st.color, background: `${st.color}22` }}
                            >
                              {st.label}
                            </span>
                          </div>
                          <div className="sm:col-span-2 text-sm text-white/70">
                            <span className="sm:hidden text-white/30 text-[10px] mr-1">In</span>
                            {fmtTime(s.first_in)}
                          </div>
                          <div className="sm:col-span-2 text-sm text-white/70">
                            <span className="sm:hidden text-white/30 text-[10px] mr-1">Out</span>
                            {s.awaiting_checkout ? (
                              <span className="text-amber-300/80 text-xs">Still in</span>
                            ) : (
                              fmtTime(s.last_out)
                            )}
                          </div>
                          <div className="sm:col-span-1 text-sm text-white/70">{fmtHours(s.worked_hours)}</div>
                          <div className="sm:col-span-2 text-[11px] text-white/45 leading-snug">{method}</div>
                        </div>
                      </button>
                      {open && (
                        <div className="px-4 pb-4 bg-black/20">
                          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">Punch log</p>
                          {(s.punches || []).length === 0 ? (
                            <p className="text-white/35 text-xs">No punches recorded.</p>
                          ) : (
                            <div className="space-y-2">
                              {s.punches.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-wrap items-center justify-between gap-2 text-xs bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold uppercase text-[#E8734A]">{p.direction || '?'}</span>
                                    <span className="text-white/70">{fmtTime(p.punched_at)}</span>
                                  </div>
                                  <div className="text-white/40">
                                    {p.method || p.source || '—'}
                                    {p.face_score != null ? ` · face ${p.face_score}` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {s.late_minutes > 0 && (
                            <p className="text-amber-300/70 text-[11px] mt-2">Late by {s.late_minutes} min</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'Employees' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                className={btnPrimary}
                onClick={() =>
                  setEmpForm({
                    name: '',
                    phone: '',
                    employee_code: '',
                    device_user_id: '',
                    pin: '',
                    pay_type: 'monthly',
                    monthly_salary: '',
                    daily_wage: '',
                    ot_rate_per_hour: '',
                  })
                }
              >
                + Add employee
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {employees
                .filter((e) => e.is_active !== false)
                .map((e) => (
                  <div key={e.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
                    <div className="flex justify-between gap-2">
                      <div className="text-white font-bold text-sm">{e.name}</div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          e.face_enrolled ? 'text-[#4ADE80] bg-[#4ADE80]/15' : 'text-amber-300 bg-amber-500/10'
                        }`}
                      >
                        {e.face_enrolled ? 'Face OK' : 'No face'}
                      </span>
                    </div>
                    <div className="text-white/35 text-xs mt-1">
                      Code {e.employee_code} · Device ID {e.device_user_id || '—'} · {e.phone || 'no phone'}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button className={btnGhost} onClick={() => setEmpForm({ ...e, pin: '' })}>
                        Edit
                      </button>
                      <button className={btnGhost} onClick={() => openFaceEnroll(e)}>
                        Enroll face (live)
                      </button>
                      <button className={btnGhost} onClick={() => createTestLink(e, 'in')}>
                        Test IN link
                      </button>
                      <button className={btnGhost} onClick={() => createTestLink(e, 'out')}>
                        Test OUT link
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && tab === 'Devices' && (
          <div className="space-y-4">
            <div className="bg-[#E8734A]/10 border border-[#E8734A]/25 rounded-2xl p-4 text-xs text-white/60 space-y-1">
              <p className="text-[#E8734A] font-semibold text-sm">Biometric ADMS</p>
              <p>
                Server: <span className="text-white">{admsHost}</span> · Port 443 · HTTPS ON · path /iclock
              </p>
              <button className={btnGhost} onClick={() => copy(admsHost, 'Server')}>
                Copy host
              </button>
            </div>
            <button
              className={btnPrimary}
              onClick={() => setDeviceForm({ serial_number: '', name: '', brand: 'zkteco' })}
            >
              + Register device
            </button>
            <div className="grid sm:grid-cols-2 gap-3">
              {devices.map((d) => (
                <div key={d.id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
                  <div className="text-white font-bold text-sm">{d.name}</div>
                  <div className="text-white/40 text-xs">SN {d.serial_number}</div>
                  <div className="text-white/30 text-xs">
                    Last seen: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('en-IN') : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === 'Payroll' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <input
                className={inputCls}
                type="number"
                min={1}
                max={12}
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
              />
              <input className={inputCls} type="number" value={payYear} onChange={(e) => setPayYear(e.target.value)} />
              <button className={btnPrimary} onClick={generatePayroll}>
                Generate
              </button>
            </div>
            {payroll && (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.05]">
                <div className="px-4 py-3 flex justify-between text-sm">
                  <span>
                    {payroll.month}/{payroll.year}
                  </span>
                  <span className="text-[#E8734A] font-bold">₹{payroll.total_net?.toLocaleString('en-IN')}</span>
                </div>
                {(payroll.slips || []).map((s) => (
                  <div key={s.employee_id} className="px-4 py-3 flex justify-between text-sm">
                    <span>{s.employee_name}</span>
                    <span className="font-bold">₹{s.net?.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'Setup' && company && (
          <div className="space-y-4 max-w-xl">
            <div className="bg-[#E8734A]/10 border border-[#E8734A]/25 rounded-2xl p-4 text-xs text-white/60 space-y-2">
              <p className="text-[#E8734A] font-semibold text-sm">WhatsApp bot — {company.bot_whatsapp || '9498802936'}</p>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>
                  Meta Developer → create/select app → add <span className="text-white">WhatsApp</span> product.
                </li>
                <li>
                  WhatsApp → API Setup → copy <span className="text-white">Phone number ID</span> for the business
                  number linked to <span className="text-white">9498802936</span> (or your Cloud API test number).
                </li>
                <li>
                  Create a permanent access token with <span className="text-white">whatsapp_business_messaging</span>.
                </li>
                <li>
                  In Render (backend) set:
                  <br />
                  <code className="text-[#4DD9FF]">WHATSAPP_PHONE_NUMBER_ID</code>,{' '}
                  <code className="text-[#4DD9FF]">WHATSAPP_TOKEN</code>,{' '}
                  <code className="text-[#4DD9FF]">WHATSAPP_VERIFY_TOKEN</code> (e.g. bhufix-clockin-verify),{' '}
                  <code className="text-[#4DD9FF]">FRONTEND_URL</code> = your live site URL.
                </li>
                <li>
                  Webhook callback URL:
                  <code className="block text-[#4DD9FF] break-all bg-black/30 rounded-lg p-2 mt-1">{webhookUrl}</code>
                  Verify token = same as <code className="text-white">WHATSAPP_VERIFY_TOKEN</code>. Subscribe to{' '}
                  <span className="text-white">messages</span>.
                </li>
                <li>
                  Employees text <span className="text-white">IN</span> / <span className="text-white">OUT</span> to
                  that number → they get a 90s punch link. Phone on employee profile must match (e.g. 9944643690).
                </li>
              </ol>
              <button className={btnGhost} onClick={() => copy(webhookUrl, 'Webhook URL')}>
                Copy webhook URL
              </button>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-xs text-white/50 space-y-2">
              <p className="text-white/70 font-semibold text-sm">What each tab does</p>
              <p>
                <span className="text-white">Today</span> — full daily report (in/out, hours, selfie vs QR vs PIN).
              </p>
              <p>
                <span className="text-white">Employees</span> — add staff, PIN, live face enroll (3 camera shots), test
                links.
              </p>
              <p>
                <span className="text-white">Devices</span> — optional biometric machines.
              </p>
              <p>
                <span className="text-white">Payroll</span> — month-end salary from attendance.
              </p>
              <p>
                <span className="text-white">Setup</span> — office GPS, bot number, door display QR.
              </p>
            </div>

            <form onSubmit={saveCompany} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <p className="text-white font-semibold text-sm">BhuFix business setup</p>
              <p className="text-white/40 text-xs leading-relaxed">
                <span className="text-white/70">ClockIN WhatsApp (bot)</span> = number employees text IN/OUT to.
                <span className="text-white/70"> Owner WhatsApp</span> = your personal number for digests (optional).
              </p>
              {[
                ['name', 'Business name'],
                ['bot_whatsapp', 'ClockIN WhatsApp bot (employees text here) — e.g. 9498802936'],
                ['owner_whatsapp', 'Owner personal WhatsApp (optional)'],
                ['shift_start', 'Shift start (HH:MM)'],
                ['shift_end', 'Shift end (HH:MM)'],
                ['grace_minutes', 'Grace minutes'],
                ['office_lat', 'Office latitude'],
                ['office_lng', 'Office longitude'],
                ['geofence_radius_m', 'Geofence radius (meters)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-white/30 text-[10px] uppercase tracking-wider">{label}</label>
                  <input
                    className={inputCls}
                    value={company[key] ?? ''}
                    onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
                  />
                </div>
              ))}
              <button type="button" className={btnGhost} onClick={useMyLocation}>
                Use my GPS as office
              </button>
              <button type="submit" className={btnPrimary}>
                Save
              </button>
            </form>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 space-y-2">
              <p className="text-white font-semibold text-sm">Office display (put on TV / tablet at door)</p>
              <code className="block text-xs text-[#4DD9FF] break-all bg-black/30 rounded-xl p-3">{displayUrl}</code>
              <button className={btnGhost} onClick={() => copy(displayUrl, 'Display link')}>
                Copy link
              </button>
            </div>
          </div>
        )}
      </main>

      {empForm && (
        <Modal title={empForm.id ? 'Edit employee' : 'Add employee'} onClose={() => setEmpForm(null)}>
          <form onSubmit={saveEmployee} className="space-y-3">
            {[
              ['name', 'Name', 'text', true],
              ['phone', 'Phone', 'text', false],
              ['employee_code', 'Code', 'text', false],
              ['device_user_id', 'Biometric User ID', 'text', false],
              ['pin', empForm.id ? 'New PIN (optional)' : 'PIN (4–6 digits)', 'password', !empForm.id],
              ['monthly_salary', 'Monthly salary', 'number', false],
            ].map(([key, label, type, req]) => (
              <div key={key}>
                <label className="text-white/30 text-[10px] uppercase tracking-wider">{label}</label>
                <input
                  className={inputCls}
                  type={type}
                  required={req}
                  autoComplete="off"
                  value={empForm[key] ?? ''}
                  onChange={(e) => setEmpForm({ ...empForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" className={btnPrimary}>
              Save
            </button>
          </form>
        </Modal>
      )}

      {deviceForm && (
        <Modal title="Register device" onClose={() => setDeviceForm(null)}>
          <form onSubmit={saveDevice} className="space-y-3">
            <input
              className={inputCls}
              placeholder="Serial number"
              required
              value={deviceForm.serial_number}
              onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Name"
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
            />
            <select
              className={inputCls}
              value={deviceForm.brand}
              onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })}
            >
              <option value="zkteco">ZKTeco</option>
              <option value="essl">eSSL</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" className={btnPrimary}>
              Register
            </button>
          </form>
        </Modal>
      )}

      {faceEmp && (
        <Modal
          title={`Live face enroll — ${faceEmp.name}`}
          wide
          onClose={() => {
            setFaceEmp(null);
            setFaceMeta(null);
          }}
        >
          <LiveFaceEnroll
            emp={faceEmp}
            faceMeta={faceMeta}
            api={api}
            onRefresh={() => openFaceEnroll(faceEmp)}
            onDone={() => {
              openFaceEnroll(faceEmp);
              loadAll();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function LiveFaceEnroll({ emp, faceMeta, api, onRefresh, onDone }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [shotIdx, setShotIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const max = faceMeta?.max || 3;
  const count = faceMeta?.count || 0;
  const remaining = Math.max(0, max - count);
  const shots = ENROLL_SHOTS.slice(0, remaining || 1);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCamReady(true);
      }
    } catch {
      toast.error('Allow camera access to enroll face');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (remaining > 0) startCamera();
    return () => stopCamera();
  }, [remaining, startCamera, stopCamera]);

  const captureAndUpload = async () => {
    if (!videoRef.current || busy || remaining <= 0) return;
    setBusy(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const image_base64 = canvas.toDataURL('image/jpeg', 0.92);
      await api.post(`/clockin/employees/${emp.id}/faces`, { image_base64 });
      const nextCount = count + 1;
      toast.success(`Shot ${nextCount} of ${max} saved`);
      await onRefresh();
      if (nextCount >= max) {
        stopCamera();
        onDone();
        toast.success('Face enrollment complete');
      } else {
        setShotIdx((i) => Math.min(i + 1, ENROLL_SHOTS.length - 1));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Capture failed — try again with better light');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-white/45 text-xs leading-relaxed">
        We take <span className="text-white/80">up to 3 live photos</span> (different angles) so punch selfies
        match more reliably. No gallery upload — camera only.
        {faceMeta ? ` Currently ${count}/${max}.` : ''}
      </p>

      {remaining <= 0 ? (
        <p className="text-[#4ADE80] text-sm">All 3 face photos enrolled. Remove one below to retake.</p>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden bg-black aspect-square max-h-72 mx-auto relative">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {!camReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">
                Starting camera…
              </div>
            )}
          </div>
          <p className="text-center text-sm text-white/80 font-medium">
            Shot {Math.min(shotIdx + 1, shots.length)} of {shots.length}:{' '}
            {shots[Math.min(shotIdx, shots.length - 1)]?.prompt}
          </p>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={startCamera}>
              Restart camera
            </button>
            <button type="button" className={`${btnPrimary} flex-1`} disabled={busy || !camReady} onClick={captureAndUpload}>
              {busy ? 'Saving…' : 'Capture this shot'}
            </button>
          </div>
        </>
      )}

      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
        <p className="text-white/30 text-[10px] uppercase tracking-wider">Saved photos</p>
        {(faceMeta?.faces || []).length === 0 && (
          <p className="text-white/35 text-xs">None yet — capture above.</p>
        )}
        {(faceMeta?.faces || []).map((f) => (
          <div
            key={f.id}
            className="flex justify-between items-center text-xs text-white/50 bg-white/[0.04] rounded-lg px-3 py-2"
          >
            <span>Photo · {new Date(f.created_at).toLocaleString('en-IN')}</span>
            <button
              className={btnGhost}
              onClick={async () => {
                try {
                  await api.delete(`/clockin/employees/${emp.id}/faces/${f.id}`);
                  onRefresh();
                  onDone();
                } catch (err) {
                  toast.error(err.response?.data?.detail || 'Delete failed');
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} bg-[#0D0F18] border border-white/[0.1] rounded-2xl p-5 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="text-white/40">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
