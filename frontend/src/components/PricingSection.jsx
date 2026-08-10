import { pricingPackages } from "../data/mock";
import { ArrowRight, Check, Crown, Flame, Zap } from "lucide-react";
import { Button } from "./ui/button";

const planPerks = {
  1: [
    "Consistent social presence",
    "Brand-ready creatives",
    "Weekly progress check-ins",
    "Perfect if you’re just starting",
  ],
  2: [
    "Full social media management",
    "Paid ads that chase leads",
    "Strategy + creative + reporting",
    "Best balance of speed & results",
  ],
  3: [
    "Everything in Growth, plus more",
    "Aggressive lead generation",
    "Priority support & planning",
    "Built to outpace competitors",
  ],
};

const ctaCopy = {
  1: "Start with Spark",
  2: "Get Growth Accelerator",
  3: "Go Dominator",
};

export const PricingSection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="pricing"
      className="py-24 lg:py-32 relative overflow-x-clip scroll-mt-24"
      style={{
        background:
          "linear-gradient(180deg, #fff 0%, #FFF7F3 40%, #F8FAFC 100%)",
      }}
    >
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-navy-dark pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/25 to-transparent" />
      <div className="absolute -top-40 right-0 w-80 h-80 bg-coral/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-80 h-80 bg-sky-100/60 dark:bg-sky-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Sticky notes — beside the header on large screens */}
        <aside
          className="pricing-note pointer-events-none absolute left-4 xl:left-8 top-8 z-[5] hidden lg:block w-[148px]"
          aria-hidden
        >
          <div className="relative bg-[#FFF3C4] dark:bg-amber-200/95 text-navy px-3.5 py-3 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-11 h-3 bg-white/55 rotate-1 shadow-sm" />
            <p className="font-hand text-lg leading-tight">
              no surprise
              <br />
              invoices.
              <br />
              <span className="text-coral-dark">we scope first.</span>
            </p>
          </div>
        </aside>

        <aside
          className="pricing-note pricing-note--alt pointer-events-none absolute right-4 xl:right-8 top-16 z-[5] hidden lg:block w-[140px]"
          aria-hidden
        >
          <div className="relative bg-[#FFE8D6] dark:bg-orange-200/95 text-navy px-3.5 py-3 shadow-lg shadow-slate-200/70 dark:shadow-black/30">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-11 h-3 bg-white/55 -rotate-1 shadow-sm" />
            <p className="font-hand text-lg leading-tight">
              unsure?
              <br />
              <span className="text-coral-dark">talk to us first →</span>
            </p>
          </div>
        </aside>

        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Our Packages
            </span>
            <span className="font-hand text-lg text-coral/80 rotate-[-2deg] select-none hidden sm:inline">
              pick your pace →
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-2 mb-5 leading-tight">
            Choose Your{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral">Growth Plan</span>
              <span
                className="absolute bottom-1 left-0 w-full h-3 bg-coral/15 rounded-sm -z-0"
                aria-hidden
              />
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
            Transparent pricing. No hidden fees. Clear next steps — so you can
            stop guessing and start growing.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-coral">
            <Zap className="h-4 w-4" />
            Spots for new retainers are limited each month
          </p>

          {/* Compact note under intro on smaller screens */}
          <aside
            className="pricing-note mx-auto mt-6 w-[210px] lg:hidden"
            aria-hidden
          >
            <div className="relative bg-[#FFF3C4] dark:bg-amber-200/95 text-navy px-4 py-3 shadow-md">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-white/55 rotate-1 shadow-sm" />
              <p className="font-hand text-lg leading-tight">
                no surprise invoices —{" "}
                <span className="text-coral-dark">we scope first.</span>
              </p>
            </div>
          </aside>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch pt-4">
          {pricingPackages.map((pkg, index) => {
            const perks = planPerks[pkg.id] || [];
            const highlighted = pkg.highlighted;

            return (
              <div
                key={pkg.id}
                className="pricing-card-shell h-full"
                style={{
                  perspective: "1100px",
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <article
                  className={`pricing-card-face relative flex flex-col h-full rounded-3xl border p-7 lg:p-8 ${
                    highlighted
                      ? "pricing-card-face--hot border-coral bg-navy text-white shadow-xl shadow-coral/20 md:-translate-y-2 z-10"
                      : "border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/80"
                  }`}
                >
                  {pkg.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md ${
                        highlighted
                          ? "bg-coral text-white"
                          : "bg-navy text-white dark:bg-coral"
                      }`}
                    >
                      {pkg.badge === "Most Popular" ? (
                        <Flame className="h-3 w-3" />
                      ) : (
                        <Crown className="h-3 w-3" />
                      )}
                      {pkg.badge}
                    </div>
                  )}

                  {highlighted && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 0%, rgba(232,115,74,0.35), transparent 55%)",
                      }}
                      aria-hidden
                    />
                  )}

                  <div className="relative flex flex-col flex-1">
                    <h3
                      className={`text-xl font-extrabold mb-2 ${
                        highlighted ? "text-coral" : "text-navy dark:text-white"
                      }`}
                    >
                      {pkg.name}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed mb-6 min-h-[44px] ${
                        highlighted
                          ? "text-white/70"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {pkg.description}
                    </p>

                    <ul className="space-y-2.5 mb-8">
                      {perks.map((perk) => (
                        <li
                          key={perk}
                          className="flex items-start gap-2.5 text-sm"
                        >
                          <span
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              highlighted
                                ? "bg-coral/25 text-coral"
                                : "bg-coral/10 text-coral"
                            }`}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span
                            className={
                              highlighted
                                ? "text-white/85"
                                : "text-slate-600 dark:text-slate-300"
                            }
                          >
                            {perk}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      <Button
                        onClick={() => scrollTo("#contact")}
                        className={`pricing-cta w-full py-6 rounded-full font-bold text-base transition-all duration-300 ${
                          highlighted
                            ? "bg-coral hover:bg-coral-dark text-white shadow-lg shadow-coral/30 hover:shadow-xl hover:shadow-coral/40"
                            : "bg-navy hover:bg-coral text-white dark:bg-white dark:text-navy dark:hover:bg-coral dark:hover:text-white"
                        }`}
                      >
                        {ctaCopy[pkg.id] || "Get started"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      {highlighted && (
                        <p className="mt-3 text-center font-hand text-lg text-coral">
                          most teams pick this one →
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-slate-500 dark:text-slate-400">
          <span>No lock-in scare tactics</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">
            •
          </span>
          <span>Custom packages on request</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">
            •
          </span>
          <button
            type="button"
            onClick={() => scrollTo("#contact")}
            className="font-semibold text-coral hover:text-coral-dark underline underline-offset-4"
          >
            Talk to us first — it’s free
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pricingNoteFloat {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-6px) rotate(-6deg); }
        }
        @keyframes pricingNoteFloatAlt {
          0%, 100% { transform: translateY(0) rotate(5deg); }
          50% { transform: translateY(-6px) rotate(5deg); }
        }
        .pricing-note {
          animation: pricingNoteFloat 5.5s ease-in-out infinite;
        }
        .pricing-note--alt {
          animation: pricingNoteFloatAlt 5.5s ease-in-out infinite;
          animation-delay: 1.1s;
        }
        @media (max-width: 1023px) {
          .pricing-note:not(.pricing-note--alt) {
            animation-name: pricingNoteFloatMobile;
          }
          @keyframes pricingNoteFloatMobile {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-5px) rotate(-2deg); }
          }
        }

        .pricing-card-shell {
          animation: pricingFadeIn 0.55s ease-out both;
        }

        .pricing-card-face {
          transform: translate3d(0, 0, 0) rotateX(0) rotateY(0);
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.3s ease,
            border-color 0.25s ease;
        }

        .pricing-card-shell:hover .pricing-card-face {
          transform: translate3d(0, -10px, 0) rotateX(3deg) rotateY(-5deg);
          box-shadow:
            0 22px 40px -22px rgba(232, 115, 74, 0.35),
            0 12px 28px -18px rgba(15, 23, 42, 0.28);
          z-index: 2;
        }

        .pricing-card-shell:hover .pricing-card-face--hot {
          transform: translate3d(0, -14px, 0) rotateX(3deg) rotateY(-5deg);
        }

        .pricing-cta:hover {
          transform: translateY(-2px);
        }

        @keyframes pricingFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (hover: none) {
          .pricing-card-shell:hover .pricing-card-face,
          .pricing-card-shell:hover .pricing-card-face--hot {
            transform: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pricing-note,
          .pricing-note--alt {
            animation: none !important;
          }
          .pricing-card-shell {
            animation: none !important;
          }
          .pricing-card-face {
            transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
            transform: none !important;
          }
          .pricing-card-shell:hover .pricing-card-face,
          .pricing-card-shell:hover .pricing-card-face--hot {
            transform: none !important;
          }
          .pricing-cta:hover {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};
