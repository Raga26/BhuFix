import { Button } from "./ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";

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
      {/* Decorative blobs */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-coral/5 rounded-full blur-3xl animate-bh-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl animate-bh-float-slow" />
      <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-coral/30 rounded-full animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-teal-300/40 rounded-full animate-pulse" />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #1B2A4A 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 sm:pt-32 pb-12 sm:pb-20 w-full">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 text-coral text-sm font-semibold mb-6 sm:mb-8 animate-bh-fadeUp">
              <Sparkles className="h-4 w-4" />
              <span>Your Growth Partner in Digital Marketing</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-navy leading-[1.08] tracking-tight mb-4 sm:mb-6 animate-bh-fadeUp anim-delay-1">
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

            {/* Description */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-500 max-w-2xl mb-8 sm:mb-10 leading-relaxed animate-bh-fadeUp anim-delay-2">
              At Bhufix, we help businesses grow into strong digital brands. We
              combine creativity, strategy, and smart marketing to reach the right
              audience and deliver real results.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col xs:flex-row flex-wrap items-center gap-3 sm:gap-4 mb-12 sm:mb-16 animate-bh-fadeUp anim-delay-3">
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
                <Play className="mr-2 h-3 sm:h-4 w-3 sm:w-4 fill-current" />
                Contact Us
              </Button>
            </div>
          </div>

          {/* Right Side - Animated Growth Chart */}
          <div className="relative w-full h-[400px] sm:h-[450px] lg:h-[500px] flex flex-col items-center justify-center animate-bh-fadeUp anim-delay-2 px-2 sm:px-0">
            {/* Professional Growth Chart */}
            <svg 
              viewBox="0 0 520 360" 
              className="w-full h-full max-w-2xl"
              style={{ filter: 'drop-shadow(0 15px 40px rgba(232, 115, 74, 0.15))' }}
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="barGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E8734A" />
                  <stop offset="100%" stopColor="#D4633D" />
                </linearGradient>
                <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F4A87E" />
                  <stop offset="100%" stopColor="#E8734A" />
                </linearGradient>
                <linearGradient id="barGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#14B8A6" />
                  <stop offset="100%" stopColor="#0D9488" />
                </linearGradient>
                <linearGradient id="trendLine" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E8734A" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.8" />
                </linearGradient>
                <filter id="barShadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.12" />
                </filter>
              </defs>

              {/* Subtle background grid */}
              <line x1="60" y1="280" x2="490" y2="280" stroke="#cbd5e1" strokeWidth="1" opacity="0.4" />
              <line x1="60" y1="200" x2="490" y2="200" stroke="#e2e8f0" strokeWidth="1" opacity="0.2" />
              <line x1="60" y1="120" x2="490" y2="120" stroke="#e2e8f0" strokeWidth="1" opacity="0.2" />
              <line x1="60" y1="40" x2="490" y2="40" stroke="#cbd5e1" strokeWidth="1" opacity="0.4" />

              {/* Y-axis */}
              <line x1="60" y1="30" x2="60" y2="290" stroke="#1b2a4a" strokeWidth="3" opacity="0.25" />
              {/* X-axis */}
              <line x1="60" y1="290" x2="490" y2="290" stroke="#1b2a4a" strokeWidth="3" opacity="0.25" />

              {/* Bars - GROWING UPWARD */}
              {/* Bar 1 - Jan - 60px */}
              <g>
                <rect x="75" y="290" width="42" height="0" fill="url(#barGradient1)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="230" dur="1s" begin="0.2s" fill="freeze" />
                  <animate attributeName="height" from="0" to="60" dur="1s" begin="0.2s" fill="freeze" />
                </rect>
                <text x="96" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">Jan</text>
              </g>

              {/* Bar 2 - Feb - 100px */}
              <g>
                <rect x="130" y="290" width="42" height="0" fill="url(#barGradient1)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="190" dur="1s" begin="0.35s" fill="freeze" />
                  <animate attributeName="height" from="0" to="100" dur="1s" begin="0.35s" fill="freeze" />
                </rect>
                <text x="151" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">Feb</text>
              </g>

              {/* Bar 3 - Mar - 150px */}
              <g>
                <rect x="185" y="290" width="42" height="0" fill="url(#barGradient2)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="140" dur="1s" begin="0.5s" fill="freeze" />
                  <animate attributeName="height" from="0" to="150" dur="1s" begin="0.5s" fill="freeze" />
                </rect>
                <text x="206" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">Mar</text>
              </g>

              {/* Bar 4 - Apr - 200px */}
              <g>
                <rect x="240" y="290" width="42" height="0" fill="url(#barGradient2)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="90" dur="1s" begin="0.65s" fill="freeze" />
                  <animate attributeName="height" from="0" to="200" dur="1s" begin="0.65s" fill="freeze" />
                </rect>
                <text x="261" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">Apr</text>
              </g>

              {/* Bar 5 - May - 240px */}
              <g>
                <rect x="295" y="290" width="42" height="0" fill="url(#barGradient3)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="50" dur="1s" begin="0.8s" fill="freeze" />
                  <animate attributeName="height" from="0" to="240" dur="1s" begin="0.8s" fill="freeze" />
                </rect>
                <text x="316" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">May</text>
              </g>

              {/* Bar 6 - Jun - 270px */}
              <g>
                <rect x="350" y="290" width="42" height="0" fill="url(#barGradient3)" rx="4" filter="url(#barShadow)">
                  <animate attributeName="y" from="290" to="20" dur="1s" begin="0.95s" fill="freeze" />
                  <animate attributeName="height" from="0" to="270" dur="1s" begin="0.95s" fill="freeze" />
                </rect>
                <text x="371" y="310" textAnchor="middle" fontSize="16" fontWeight="600" fill="#64748b">Jun</text>
              </g>

              {/* Upward Trend Line - GOING UP */}
              <polyline 
                points="96,230 151,190 206,140 261,90 316,50 371,20"
                fill="none"
                stroke="url(#trendLine)"
                strokeWidth="4"
                style={{ animation: 'drawTrend 1.5s ease-out 2.2s forwards', opacity: 0 }}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#barShadow)"
              />

              {/* Data Points on Trend */}
              <circle cx="96" cy="230" r="6" fill="#E8734A" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.1s forwards', opacity: 0 }} filter="url(#barShadow)" />
              <circle cx="151" cy="190" r="6" fill="#E8734A" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.25s forwards', opacity: 0 }} filter="url(#barShadow)" />
              <circle cx="206" cy="140" r="6" fill="#E8734A" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.4s forwards', opacity: 0 }} filter="url(#barShadow)" />
              <circle cx="261" cy="90" r="6" fill="#0D9488" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.55s forwards', opacity: 0 }} filter="url(#barShadow)" />
              <circle cx="316" cy="50" r="6" fill="#0D9488" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.7s forwards', opacity: 0 }} filter="url(#barShadow)" />
              <circle cx="371" cy="20" r="6" fill="#0D9488" style={{ animation: 'popPoint 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 3.85s forwards', opacity: 0 }} filter="url(#barShadow)" />
            </svg>

            {/* Stats Below Visualization */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full mt-6 sm:mt-8 px-2 sm:px-6">
              <div className="text-center p-3 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-coral/15 shadow-lg"
                style={{ animation: 'slideUp 0.8s ease-out 4.2s forwards', opacity: 0 }}
              >
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-coral">3x</p>
                <p className="text-xs sm:text-sm text-slate-600 font-bold mt-2">Growth</p>
              </div>
              <div className="text-center p-3 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-teal-200/40 shadow-lg"
                style={{ animation: 'slideUp 0.8s ease-out 4.4s forwards', opacity: 0 }}
              >
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-teal-600">100%</p>
                <p className="text-xs sm:text-sm text-slate-600 font-bold mt-2">ROI Driven</p>
              </div>
              <div className="text-center p-3 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-coral/15 shadow-lg"
                style={{ animation: 'slideUp 0.8s ease-out 4.6s forwards', opacity: 0 }}
              >
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-coral">∞</p>
                <p className="text-xs sm:text-sm text-slate-600 font-bold mt-2">Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add animations to stylesheet via inline style injection */}
      <style>{`
        @keyframes barWaveIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drawTrend {
          from {
            opacity: 0;
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
          }
          to {
            opacity: 1;
            stroke-dasharray: 1000;
            stroke-dashoffset: 0;
          }
        }

        @keyframes popPoint {
          from {
            r: 0;
            opacity: 0;
          }
          to {
            r: 6;
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .anim-delay-1 {
          animation-delay: 0.2s;
        }

        .anim-delay-2 {
          animation-delay: 0.4s;
        }

        .anim-delay-3 {
          animation-delay: 0.6s;
        }
      `}</style>
    </section>
  );
};
