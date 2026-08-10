import { useState } from "react";
import { services } from "../data/mock";
import {
  Clapperboard,
  UserRound,
  Megaphone,
  Mic,
  Globe,
  PenLine,
  Workflow,
  Palette,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";

const iconMap = {
  Clapperboard,
  UserRound,
  Megaphone,
  Mic,
  Globe,
  PenLine,
  Workflow,
  Palette,
};

export const ServicesSection = () => {
  const [openId, setOpenId] = useState(null);

  return (
    <section
      id="services"
      className="py-24 lg:py-32 relative overflow-x-clip scroll-mt-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, #fff 45%, #FFF7F3 100%)",
      }}
    >
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-navy-dark pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/25 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Sticky notes — beside the header on large screens */}
        <aside
          className="services-note pointer-events-none absolute left-4 xl:left-8 top-6 z-[5] hidden lg:block w-[148px]"
          aria-hidden
        >
          <div className="relative bg-[#FFF3C4] dark:bg-amber-200/95 text-navy px-3.5 py-3 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-11 h-3 bg-white/55 rotate-1 shadow-sm" />
            <p className="font-hand text-lg leading-tight">
              all in-house.
              <br />
              <span className="text-coral-dark">no hand-offs.</span>
            </p>
          </div>
        </aside>

        <aside
          className="services-note services-note--alt pointer-events-none absolute right-4 xl:right-8 top-14 z-[5] hidden lg:block w-[142px]"
          aria-hidden
        >
          <div className="relative bg-[#FFE8D6] dark:bg-orange-200/95 text-navy px-3.5 py-3 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-11 h-3 bg-white/55 -rotate-1 shadow-sm" />
            <p className="font-hand text-lg leading-tight">
              mix &amp; match
              <br />
              <span className="text-coral-dark">into one plan →</span>
            </p>
          </div>
        </aside>

        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              What We Do
            </span>
            <span className="font-hand text-lg text-coral/80 -rotate-2 select-none hidden sm:inline">
              eight ways we show up
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-2 mb-5 leading-tight">
            Eight services.{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral">One team.</span>
              <span
                className="absolute bottom-1 left-0 w-full h-3 bg-coral/15 rounded-sm -z-0"
                aria-hidden
              />
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
            Everything below is done in-house — no outsourcing, no hand-offs.
            Pick what you need, or ask us to combine them into one plan.
          </p>

          <aside
            className="services-note mx-auto mt-6 w-[210px] lg:hidden"
            aria-hidden
          >
            <div className="relative bg-[#FFF3C4] dark:bg-amber-200/95 text-navy px-4 py-3 shadow-md">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-white/55 rotate-1 shadow-sm" />
              <p className="font-hand text-lg leading-tight">
                all in-house —{" "}
                <span className="text-coral-dark">mix into one plan →</span>
              </p>
            </div>
          </aside>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
          {services.map((service, index) => {
            const Icon = iconMap[service.icon];
            const isOpen = openId === service.id;
            const preview = service.items.slice(0, 4);
            const rest = service.items.slice(4);

            return (
              // Outer shell owns grid layout — never gets transformed (no skew/jump bugs)
              <div
                key={service.id}
                className="service-card-shell h-full min-h-[100%]"
                style={{
                  perspective: "900px",
                  animationDelay: `${index * 60}ms`,
                }}
              >
                <article
                  className={`service-card-face group relative h-full min-h-[320px] rounded-2xl p-6 border flex flex-col text-left ${
                    isOpen
                      ? "is-open border-coral/40 bg-white dark:bg-slate-800 shadow-md shadow-coral/10"
                      : "border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-800/85"
                  }`}
                >
                  <div
                    className="service-card-shine pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
                    aria-hidden
                  >
                    <span className="service-card-shine-bar" />
                  </div>

                  <div className="relative flex items-center justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-coral/10 flex items-center justify-center transition-colors duration-300 group-hover:bg-coral">
                      {Icon && (
                        <Icon className="h-5 w-5 text-coral transition-colors duration-300 group-hover:text-white" />
                      )}
                    </div>
                    <span className="font-hand text-base text-coral/70 leading-none select-none tabular-nums">
                      {String(service.id).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="relative text-lg font-bold text-navy dark:text-white mb-2 leading-snug min-h-[1.75rem]">
                    {service.title}
                  </h3>
                  <p className="relative text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5 min-h-[4.5rem]">
                    {service.shortDesc}
                  </p>

                  <ul className="relative space-y-1.5 mt-auto">
                    {preview.map((item) => (
                      <li
                        key={item}
                        className="text-[13px] text-slate-600 dark:text-slate-300 flex items-start gap-2"
                      >
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-coral flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {isOpen &&
                      rest.map((item) => (
                        <li
                          key={item}
                          className="text-[13px] text-slate-600 dark:text-slate-300 flex items-start gap-2 service-item-in"
                        >
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-coral flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                  </ul>

                  {rest.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : service.id)}
                      className="relative mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral hover:text-coral-dark transition-colors self-start"
                    >
                      {isOpen ? (
                        <>
                          <Minus className="h-3.5 w-3.5" /> Show less
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> {rest.length} more
                        </>
                      )}
                    </button>
                  )}

                  <div className="pointer-events-none absolute bottom-3 right-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Sparkles className="h-3.5 w-3.5 text-coral/50" />
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes servicesNoteFloat {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-6px) rotate(-6deg); }
        }
        @keyframes servicesNoteFloatAlt {
          0%, 100% { transform: translateY(0) rotate(5deg); }
          50% { transform: translateY(-6px) rotate(5deg); }
        }
        .services-note {
          animation: servicesNoteFloat 5.5s ease-in-out infinite;
        }
        .services-note--alt {
          animation: servicesNoteFloatAlt 5.5s ease-in-out infinite;
          animation-delay: 1.1s;
        }
        @media (max-width: 1023px) {
          .services-note:not(.services-note--alt) {
            animation-name: servicesNoteFloatMobile;
          }
          @keyframes servicesNoteFloatMobile {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-5px) rotate(-2deg); }
          }
        }

        /* Entrance uses opacity only — never transform — so it can't fight hover */
        .service-card-shell {
          animation: serviceFadeIn 0.5s ease-out both;
        }

        .service-card-face {
          transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg);
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            background-color 0.25s ease;
        }

        .service-card-shell:hover .service-card-face {
          transform: translate3d(0, -8px, 0) rotateX(3deg) rotateY(-5deg);
          border-color: rgba(232, 115, 74, 0.45);
          box-shadow:
            0 18px 36px -20px rgba(232, 115, 74, 0.35),
            0 10px 24px -18px rgba(15, 23, 42, 0.35);
          z-index: 2;
        }

        .service-card-shell:hover .service-card-face.is-open {
          transform: translate3d(0, -5px, 0) rotateX(2deg) rotateY(-3deg);
        }

        .service-card-shine-bar {
          position: absolute;
          top: 0;
          left: -45%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            105deg,
            transparent 0%,
            rgba(255, 255, 255, 0.16) 45%,
            transparent 100%
          );
          transform: skewX(-18deg) translate3d(0, 0, 0);
          opacity: 0;
        }

        .service-card-shell:hover .service-card-shine-bar {
          opacity: 1;
          animation: serviceShine 0.65s ease-out;
        }

        .service-item-in {
          animation: serviceItemIn 0.22s ease-out both;
        }

        @keyframes serviceFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes serviceShine {
          from { transform: skewX(-18deg) translate3d(0, 0, 0); }
          to { transform: skewX(-18deg) translate3d(340%, 0, 0); }
        }

        @keyframes serviceItemIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (hover: none) {
          .service-card-shell:hover .service-card-face,
          .service-card-shell:hover .service-card-face.is-open {
            transform: none;
            box-shadow: none;
          }
          .service-card-shell:hover .service-card-shine-bar {
            animation: none;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .services-note,
          .services-note--alt {
            animation: none !important;
          }
          .service-card-shell,
          .service-item-in {
            animation: none !important;
          }
          .service-card-face {
            transition: border-color 0.2s ease, background-color 0.2s ease !important;
            transform: none !important;
          }
          .service-card-shell:hover .service-card-face,
          .service-card-shell:hover .service-card-face.is-open {
            transform: none !important;
          }
          .service-card-shell:hover .service-card-shine-bar {
            animation: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>
    </section>
  );
};
