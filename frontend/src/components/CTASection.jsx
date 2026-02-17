import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const CTASection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Dark navy background */}
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/20 text-coral text-sm font-semibold mb-8">
          <Sparkles className="h-4 w-4" />
          Ready to Transform?
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
          Let's Build Your Brand's
          <br />
          Success Story!
        </h2>
        <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
          Partner with Bhufix and experience the transformative impact of expert
          digital marketing on your business growth.
        </p>
        <Button
          onClick={() => scrollTo("#contact")}
          className="bg-coral hover:bg-coral-dark text-white font-semibold px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-coral/30 hover:-translate-y-1"
        >
          Ready to Grow Your Business?
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};
