import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-x-clip">
      <div className="absolute inset-0 bg-navy" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(232,115,74,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-10 right-10 w-64 h-64 bg-coral/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-coral/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-coral/30 bg-coral/10 text-coral text-sm font-semibold mb-8">
          Next step
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
          Tell us what you need.
          <br />
          We&apos;ll show you the plan.
        </h2>
        <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
          No fluff pitch. A clear scope, timeline and budget — so you know
          exactly what you&apos;re paying for before we start.
        </p>
        <Button
          onClick={() => scrollTo("#contact")}
          className="bg-coral hover:bg-coral-dark text-white font-semibold px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-coral/30 hover:-translate-y-1"
        >
          Book a call
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};
