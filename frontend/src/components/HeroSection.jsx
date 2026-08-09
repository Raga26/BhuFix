import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
  ArrowRight,
  LayoutDashboard,
  Check,
  Send,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

// Full-bleed path: strong upward arc; tip sits below the peak badge with a gap.
const LINE_PATH =
  "M20,300 C110,285 200,270 280,250 C380,220 460,230 540,200 C640,165 720,150 820,140 C920,128 1000,155 1100,125 C1180,100 1260,88 1320,78 C1340,72 1355,70 1370,68";

const AREA_PATH =
  "M20,300 C110,285 200,270 280,250 C380,220 460,230 540,200 C640,165 720,150 820,140 C920,128 1000,155 1100,125 C1180,100 1260,88 1320,78 C1340,72 1355,70 1370,68 C1384,95 1394,180 1400,420 L20,420 Z";

const AVG_PATH =
  "M20,350 C200,340 400,328 600,318 C850,302 1100,288 1370,275";

const chartMarkers = [
  { x: 280, y: 250, label: "clicks", value: "248K" },
  { x: 640, y: 150, label: "reach", value: "3.6M" },
  { x: 1000, y: 140, label: "audience", value: "1.2M" },
  { x: 1260, y: 88, label: "ROI", value: "↑ 420%" },
];

const VB_W = 1440;
const VB_H = 420;
const FLIGHT_DELAY = 350;
const FLIGHT_DURATION = 2400;
// Stop short of the tip so the plane never merges with the peak badge.
const PLANE_STOP = 0.9;

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const HeroSection = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const chartWrapRef = useRef(null);
  const linePathRef = useRef(null);
  const planeRef = useRef(null);
  const trackerRef = useRef(null);
  const trackerLabelRef = useRef(null);
  const [flightDone, setFlightDone] = useState(false);

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const path = linePathRef.current;
    const plane = planeRef.current;
    const wrap = chartWrapRef.current;
    if (!path || !plane || !wrap) return;

    const total = path.getTotalLength();
    path.style.strokeDasharray = `${total}`;
    path.style.strokeDashoffset = `${total}`;

    let raf;
    let start;
    let done = false;

    const place = (len) => {
      const pt = path.getPointAtLength(len);
      const ahead = path.getPointAtLength(Math.min(len + 8, total));
      const w = wrap.offsetWidth || 1;
      const h = wrap.offsetHeight || 1;
      const dx = ((ahead.x - pt.x) / VB_W) * w;
      const dy = ((ahead.y - pt.y) / VB_H) * h;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      plane.style.left = `${(pt.x / VB_W) * 100}%`;
      plane.style.top = `${(pt.y / VB_H) * 100}%`;
      plane.style.transform = `translate(-50%, -50%) rotate(${angle + 45}deg)`;
    };

    const tick = (now) => {
      if (start === undefined) start = now;
      const elapsed = now - start - FLIGHT_DELAY;
      if (elapsed <= 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / FLIGHT_DURATION, 1);
      const eased = easeInOutCubic(progress);
      path.style.strokeDashoffset = `${total * (1 - eased)}`;
      plane.style.opacity = "1";
      place(Math.min(eased, PLANE_STOP) * total);
      if (progress >= 1 && !done) {
        done = true;
        // Fade the plane out at the tip so it never stacks on the peak badge.
        plane.style.transition = "opacity 0.45s ease-out";
        plane.style.opacity = "0";
        setFlightDone(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMouseMove = (e) => {
    const wrap = chartWrapRef.current;
    const path = linePathRef.current;
    const tracker = trackerRef.current;
    if (!wrap || !path || !tracker || !flightDone) return;

    const rect = wrap.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) {
      tracker.style.opacity = "0";
      return;
    }

    const fx = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0.02), 0.94);
    const targetX = fx * VB_W;
    const total = path.getTotalLength();
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).x < targetX) lo = mid;
      else hi = mid;
    }
    const pt = path.getPointAtLength((lo + hi) / 2);
    tracker.style.left = `${(pt.x / VB_W) * 100}%`;
    tracker.style.top = `${(pt.y / VB_H) * 100}%`;
    tracker.style.opacity = "1";
    const month = Math.max(1, Math.min(6, Math.round(((pt.x - 20) / 1352) * 6)));
    const mult = 1 + Math.pow(Math.max(300 - pt.y, 0) / 260, 1.05) * 4.4;
    if (trackerLabelRef.current) {
      trackerLabelRef.current.textContent = `month ${month} · ${mult.toFixed(1)}x`;
    }
  };

  const hideTracker = () => {
    if (trackerRef.current) trackerRef.current.style.opacity = "0";
  };

  const gridLine = isDark ? "rgba(255,255,255,0.04)" : "rgba(27,42,74,0.05)";

  return (
    <section
      id="home"
      className="relative h-[100svh] min-h-[640px] sm:min-h-[720px] overflow-x-clip overflow-y-hidden scroll-mt-24"
      onMouseMove={handleMouseMove}
      onMouseLeave={hideTracker}
      style={{
        background: isDark
          ? "linear-gradient(180deg, #0f172a 0%, #131b31 60%, #0f172a 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #FBF9F7 60%, #F8FAFC 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(180deg, transparent, black 20%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, black 20%)",
        }}
      />

      {/* ——— COPY (slightly smaller so the full-width graph has room) ——— */}
      <div className="relative z-20 mx-auto flex h-full max-w-4xl flex-col items-center px-5 pt-20 pb-[40%] text-center sm:px-6 sm:pt-24 sm:pb-[36%] lg:px-8">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral/10 px-3.5 py-1.5 text-[13px] font-semibold text-coral sm:mb-5"
          style={{ animation: "fadeSlideUp 0.6s ease-out both" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Digital marketing, measured properly
        </div>

        <h1
          className="mb-3 text-4xl font-extrabold leading-[1.12] tracking-tight text-navy dark:text-white sm:mb-4 sm:text-5xl lg:text-6xl"
          style={{ animation: "fadeSlideUp 0.6s ease-out 0.1s both" }}
        >
          Want your business to{" "}
          <em className="font-anchor font-semibold not-italic text-coral" style={{ fontStyle: "italic" }}>
            grow?
          </em>
        </h1>

        <p
          className="mb-3 text-xl font-semibold text-navy dark:text-slate-100 sm:mb-4 sm:text-2xl"
          style={{ animation: "fadeSlideUp 0.6s ease-out 0.18s both" }}
        >
          Then run marketing that{" "}
          <span className="font-anchor italic text-coral">shows its work</span>.
        </p>

        <p
          className="mb-6 max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-300 sm:mb-7 sm:text-lg"
          style={{ animation: "fadeSlideUp 0.6s ease-out 0.26s both" }}
        >
          Most agencies send a report and hope you don&apos;t read it. At Bhufix, we
          plan the strategy, make the creative, and run the campaigns — then hand
          you a live dashboard so you can see exactly what your budget did, any
          day of the week.
        </p>

        <div
          className="mb-5 flex w-full flex-col items-center justify-center gap-3 sm:mb-6 sm:w-auto sm:flex-row"
          style={{ animation: "fadeSlideUp 0.6s ease-out 0.34s both" }}
        >
          <Button
            onClick={() => scrollTo("#services")}
            className="w-full rounded-full bg-coral px-7 py-5 text-sm font-semibold text-white hover:bg-coral-dark sm:w-auto sm:text-base"
          >
            See What We Do
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate("/login")}
            className="w-full rounded-full bg-navy px-7 py-5 text-sm font-semibold text-white hover:bg-navy/90 dark:bg-slate-700 dark:hover:bg-slate-600 sm:w-auto sm:text-base"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Client Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => scrollTo("#contact")}
            className="w-full rounded-full border-2 border-slate-300 bg-transparent px-7 py-5 text-sm font-semibold text-navy hover:border-coral hover:text-coral dark:border-slate-500 dark:text-slate-100 dark:hover:border-coral dark:hover:text-coral sm:w-auto sm:text-base"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Talk to Us
          </Button>
        </div>

        <div
          className="flex flex-col items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-6 sm:text-sm"
          style={{ animation: "fadeSlideUp 0.6s ease-out 0.42s both" }}
        >
          {[
            "Strategy, creative and ads in one place",
            "You see the same numbers we do",
            "Plain-language reports, every week",
          ].map((point) => (
            <span key={point} className="inline-flex items-center gap-2 text-center sm:whitespace-nowrap">
              <Check className="h-4 w-4 shrink-0 text-coral" strokeWidth={2.5} />
              {point}
            </span>
          ))}
        </div>
      </div>

      {/* ——— GRAPH: full page width, left → right ——— */}
      <div
        ref={chartWrapRef}
        className="absolute inset-x-0 bottom-0 z-10 h-[38%] select-none sm:h-[36%]"
        style={{ pointerEvents: flightDone ? "auto" : "none" }}
      >
        <div className="relative h-full w-full px-3 sm:px-4 pb-2">
          <div className="relative h-full w-full">
            <p
              className="pointer-events-none absolute left-2 bottom-[54%] hidden font-hand text-lg text-slate-400 dark:text-slate-500 sm:block sm:text-xl"
              style={{ animation: "fadeSlideUp 0.5s ease-out 2.8s both" }}
            >
              your growth, plotted weekly →
            </p>

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="heroAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8734A" stopOpacity={isDark ? "0.18" : "0.12"} />
                  <stop offset="70%" stopColor="#E8734A" stopOpacity={isDark ? "0.06" : "0.04"} />
                  <stop offset="100%" stopColor="#E8734A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="heroLineStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8734A" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#E8734A" />
                </linearGradient>
                {/* Soften the hard vertical cut-off at month 6 */}
                <linearGradient id="heroAreaFadeX" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="white" stopOpacity="1" />
                  <stop offset="88%" stopColor="white" stopOpacity="1" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <mask id="heroAreaMask">
                  <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#heroAreaFadeX)" />
                </mask>
              </defs>

              <path
                d={AREA_PATH}
                fill="url(#heroAreaFill)"
                mask="url(#heroAreaMask)"
                style={{ animation: "fadeSlideUp 1s ease-out 2s both" }}
              />
              <path
                d={AVG_PATH}
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(27,42,74,0.1)"}
                strokeWidth="2"
                strokeDasharray="5 7"
              />
              <path
                ref={linePathRef}
                d={LINE_PATH}
                fill="none"
                stroke="url(#heroLineStroke)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {chartMarkers.map((m) => (
                <g key={m.label}>
                  <circle cx={m.x} cy={m.y} r="10" fill="rgba(232,115,74,0.18)" />
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r="4.5"
                    fill="#E8734A"
                    stroke={isDark ? "#0f172a" : "#fff"}
                    strokeWidth="2.5"
                  />
                </g>
              ))}

              {/* Tip marker — below badge, not under it */}
              <circle
                cx="1370"
                cy="68"
                r="5.5"
                fill="#E8734A"
                stroke={isDark ? "#0f172a" : "#fff"}
                strokeWidth="2.5"
              />
            </svg>

            {/* Metric chips aligned to each marker */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-7 h-10 sm:bottom-8"
              style={{ animation: "fadeSlideUp 0.5s ease-out 2.2s both" }}
            >
              {chartMarkers.map((m, i) => (
                <div
                  key={m.label}
                  className="absolute rounded-lg border border-slate-100 bg-white/95 px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/95"
                  style={{
                    left: `${Math.min(Math.max((m.x / VB_W) * 100, 8), 86)}%`,
                    transform:
                      i === chartMarkers.length - 1
                        ? "translateX(-75%)"
                        : "translateX(-50%)",
                  }}
                >
                  <span className="font-hand text-[14px] text-slate-400">{m.label} </span>
                  <span className="text-xs font-bold text-navy dark:text-white">{m.value}</span>
                </div>
              ))}
            </div>

            {/* Peak badge: clearly left of the tip — no orange-on-orange merge */}
            <div
              className="absolute z-30 rounded-xl bg-coral px-3.5 py-1.5 shadow-lg shadow-coral/30 ring-2 ring-slate-950/40"
              style={{
                right: "18%",
                top: "4%",
                animation: "fadeSlideUp 0.5s ease-out 2.9s both",
              }}
            >
              <span className="font-hand text-lg font-semibold leading-none text-white sm:text-xl">
                5.4x in 6 months
              </span>
            </div>

            {/* Month labels across full path */}
            <div
              className="pointer-events-none absolute bottom-2 left-[2%] right-[3%] hidden justify-between font-hand text-sm text-slate-400/80 dark:text-slate-500/70 sm:flex"
            >
              {["month 1", "month 2", "month 3", "month 4", "month 5", "month 6"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div
              ref={planeRef}
              className="absolute z-20 opacity-0"
              style={{ left: "8%", top: "75%" }}
            >
              <Send
                className="h-7 w-7 text-coral sm:h-8 sm:w-8"
                fill="rgba(232,115,74,0.3)"
                strokeWidth={2}
                style={{ filter: "drop-shadow(0 4px 10px rgba(232,115,74,0.45))" }}
              />
            </div>

            <div
              ref={trackerRef}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150"
              style={{ left: "50%", top: "50%" }}
            >
              <div className="h-3.5 w-3.5 rounded-full border-[2.5px] border-coral bg-white shadow dark:bg-slate-900" />
              <div
                ref={trackerLabelRef}
                className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap font-hand text-lg font-semibold text-coral pointer-events-none"
              >
                month 1 · 1.0x
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};
