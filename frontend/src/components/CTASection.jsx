import { Button } from "./ui/button";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { contactInfo } from "../data/mock";

export const CTASection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const whatsappHref = `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, "")}`;

  return (
    <section className="py-28 lg:py-36 relative overflow-x-clip">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #0F1729 0%, #1B2A4A 48%, #162038 100%)",
        }}
      />

      {/* Soft spotlights */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(232,115,74,0.18) 0%, transparent 62%), radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,255,255,0.05) 0%, transparent 55%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.85) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 45%, black 20%, transparent 75%)",
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(232,115,74,0.5), transparent)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        }}
      />

      <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-coral/[0.1] blur-3xl pointer-events-none cta-blob" />
      <div
        className="absolute -right-20 top-1/3 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl pointer-events-none cta-blob"
        style={{ animationDelay: "1.2s" }}
      />

      {/* Handwritten sticky — kept inside section, not clipped */}
      <aside
        className="cta-note pointer-events-none absolute top-10 left-4 sm:left-10 lg:left-16 z-[5] hidden sm:block w-[148px] rotate-[-5deg]"
        aria-hidden
      >
        <div className="relative bg-[#FFF3C4] text-navy px-4 py-3.5 shadow-lg shadow-black/20">
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-white/50 rotate-1 shadow-sm" />
          <p className="font-hand text-lg leading-tight">
            free consult.
            <br />
            <span className="text-coral-dark">no awkward pitch.</span>
          </p>
        </div>
      </aside>

      <p
        className="pointer-events-none absolute top-14 right-6 sm:right-12 lg:right-20 z-[5] hidden md:block font-hand text-2xl text-coral/80 rotate-[4deg] select-none"
        aria-hidden
      >
        this is the part →
      </p>

      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <span className="h-px w-8 bg-coral/50" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-coral">
            Next step
          </span>
          <span className="h-px w-8 bg-coral/50" aria-hidden />
        </div>

        <p className="font-hand text-xl text-coral mb-4 -rotate-1 select-none">
          star of the show
        </p>

        <h2 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold text-white leading-[1.15] tracking-tight mb-5">
          Tell us what you need.
          <br />
          We&apos;ll show you the{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-coral">plan.</span>
            <span
              className="absolute bottom-1 left-0 w-full h-2.5 bg-coral/25 rounded-sm -z-0"
              aria-hidden
            />
          </span>
        </h2>

        <p className="text-white/60 text-base sm:text-lg leading-relaxed mb-8 max-w-xl mx-auto">
          No fluff pitch. A clear scope, timeline and budget — so you know
          exactly what you&apos;re paying for before we start.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm text-white/50">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-coral" />
            Clear scope
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
            Timeline + budget
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
            Usually reply in 1 day
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Button
            onClick={() => scrollTo("#contact")}
            className="group w-full sm:w-auto bg-coral hover:bg-coral-dark text-white font-bold px-10 py-6 text-base sm:text-lg rounded-full transition-all duration-300 hover:shadow-[0_16px_40px_-12px_rgba(232,115,74,0.55)] hover:-translate-y-0.5"
          >
            Book a call
            <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-7 py-3.5 text-sm sm:text-base font-semibold text-emerald-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300 hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp us
          </a>
        </div>

        <p className="mt-5 font-hand text-lg text-coral/90 select-none">
          no spam. just a real reply.
        </p>
      </div>

      <style>{`
        @keyframes ctaBlob {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(-12px); opacity: 1; }
        }
        @keyframes ctaNoteFloat {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-7px) rotate(-5deg); }
        }
        .cta-blob {
          animation: ctaBlob 10s ease-in-out infinite;
        }
        .cta-note {
          animation: ctaNoteFloat 5.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cta-blob,
          .cta-note {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};
