import { Button } from "./ui/button";
import { ArrowRight, TrendingUp, MousePointerClick, Users } from "lucide-react";

export const HeroSection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #ffffff 0%, #FFF7F3 30%, #F8FAFC 70%, #ffffff 100%)" }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #1B2A4A 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Ambient blobs */}
      <div
        className="absolute top-20 right-10 w-80 h-80 rounded-full blur-3xl"
        style={{ background: "rgba(232,115,74,0.07)", animation: "dashFloat 10s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-20 left-10 w-96 h-96 rounded-full blur-3xl"
        style={{ background: "rgba(186,230,253,0.45)", animation: "dashFloat 13s ease-in-out 2s infinite reverse" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 sm:pt-32 pb-12 sm:pb-20 w-full">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left Content */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 text-coral text-sm font-semibold mb-6 sm:mb-8"
              style={{ animation: "fadeSlideUp 0.7s ease-out both" }}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Your Growth Partner in Digital Marketing</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy leading-[1.15] tracking-tight mb-4 sm:mb-6"
              style={{ animation: "fadeSlideUp 0.7s ease-out 0.15s both" }}
            >
              Grow Your Brand.
              <br />
              Expand Your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-coral">Reach.</span>
                <span className="absolute bottom-1 left-0 w-full h-3 bg-coral/15 rounded-sm -z-0" />
              </span>
              <br />
              Dominate Your Market.
            </h1>

            <p
              className="text-base sm:text-lg lg:text-xl text-slate-500 max-w-2xl mb-8 sm:mb-10 leading-relaxed"
              style={{ animation: "fadeSlideUp 0.7s ease-out 0.3s both" }}
            >
              At Bhufix, we help businesses grow into strong digital brands. We
              combine creativity, strategy, and smart marketing to reach the right
              audience and deliver real results.
            </p>

            <div
              className="flex flex-col xs:flex-row flex-wrap items-center gap-3 sm:gap-4 mb-12 sm:mb-16"
              style={{ animation: "fadeSlideUp 0.7s ease-out 0.45s both" }}
            >
              <Button
                onClick={() => scrollTo("#services")}
                className="w-full xs:w-auto bg-coral hover:bg-coral-dark text-white font-semibold px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-coral/25 hover:-translate-y-1"
              >
                Our Services
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollTo("#contact")}
                className="w-full xs:w-auto border-2 border-slate-200 text-navy font-semibold px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base rounded-full hover:border-coral hover:text-coral transition-all duration-300 hover:-translate-y-1 bg-transparent"
              >
                <MousePointerClick className="mr-2 h-3 sm:h-4 w-3 sm:w-4" />
                Contact Us
              </Button>
            </div>
          </div>

          {/* Right Side — Campaign Dashboard Visual */}
          <div
            className="relative w-full h-[380px] sm:h-[440px] lg:h-[520px] flex items-center justify-center"
            style={{ animation: "fadeSlideUp 0.8s ease-out 0.2s both" }}
          >
            {/* Main Dashboard Card */}
            <div
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[270px] sm:w-[310px]"
              style={{ animation: "dashFloat 7s ease-in-out 1.2s infinite" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Campaign Overview
                </span>
                <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"
                    style={{ animation: "dotPulse 2s ease-in-out infinite" }}
                  />
                  Live
                </span>
              </div>

              {/* Bar Chart */}
              <div className="flex items-end gap-[5px] h-24 mb-3 px-1">
                {[55, 70, 45, 85, 60, 95, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h}%`,
                      background:
                        i === 5
                          ? "#E8734A"
                          : i === 6
                          ? "rgba(232,115,74,0.45)"
                          : "rgba(27,42,74,0.08)",
                      animation: `barGrow 0.55s cubic-bezier(0.34,1.56,0.64,1) ${1 + i * 0.08}s both`,
                      transformOrigin: "bottom",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-300 mb-4 px-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 mb-0.5">Reach</div>
                  <div className="text-sm font-bold text-navy">48.2K</div>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: "rgba(232,115,74,0.07)" }}>
                  <div className="text-[10px] text-coral mb-0.5">ROI</div>
                  <div className="text-sm font-bold text-coral">↑ 240%</div>
                </div>
              </div>
            </div>

            {/* Floating Badge — Clicks (top-right) */}
            <div
              className="absolute top-10 right-3 sm:right-0 bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
              style={{ animation: "badge1Float 9s ease-in-out 0.8s both infinite" }}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MousePointerClick className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Clicks</div>
                <div className="text-sm font-bold text-navy">12.5K</div>
              </div>
            </div>

            {/* Floating Badge — Audience (bottom-left) */}
            <div
              className="absolute bottom-12 left-3 sm:left-0 bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
              style={{ animation: "badge2Float 11s ease-in-out 1.2s both infinite" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(232,115,74,0.1)" }}
              >
                <Users className="w-3.5 h-3.5 text-coral" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Audience</div>
                <div className="text-sm font-bold text-navy">94% Engaged</div>
              </div>
            </div>

            {/* Floating Badge — Growth (mid-right) */}
            <div
              className="absolute right-3 sm:right-0 bg-coral rounded-xl shadow-lg shadow-coral/20 px-3 py-2 flex items-center gap-1.5"
              style={{ top: "42%", animation: "badge3Float 8s ease-in-out 1.5s both infinite" }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <div className="text-sm font-bold text-white">+3.2x Growth</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes badge1Float {
          0%   { opacity: 0; transform: translateY(14px); }
          11%  { opacity: 1; transform: translateY(0px); }
          55%  { opacity: 1; transform: translateY(-9px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
        @keyframes badge2Float {
          0%   { opacity: 0; transform: translateY(14px); }
          9%   { opacity: 1; transform: translateY(0px); }
          50%  { opacity: 1; transform: translateY(9px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
        @keyframes badge3Float {
          0%   { opacity: 0; transform: translateY(14px); }
          12%  { opacity: 1; transform: translateY(0px); }
          58%  { opacity: 1; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0px); }
        }
        .anim-delay-1 { animation-delay: 0.2s; }
        .anim-delay-2 { animation-delay: 0.4s; }
        .anim-delay-3 { animation-delay: 0.6s; }
      `}</style>
    </section>
  );
};
