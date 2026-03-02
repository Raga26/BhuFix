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

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-20 w-full">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 text-coral text-sm font-semibold mb-8 animate-bh-fadeUp">
            <Sparkles className="h-4 w-4" />
            <span>Your Growth Partner in Digital Marketing</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-navy leading-[1.08] tracking-tight mb-6 animate-bh-fadeUp anim-delay-1">
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
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed animate-bh-fadeUp anim-delay-2">
            At Bhufix, we help businesses grow into strong digital brands. We
            combine creativity, strategy, and smart marketing to reach the right
            audience and deliver real results.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-16 animate-bh-fadeUp anim-delay-3">
            <Button
              onClick={() => scrollTo("#services")}
              className="bg-coral hover:bg-coral-dark text-white font-semibold px-8 py-6 text-base rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-coral/25 hover:-translate-y-1"
            >
              Our Services
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => scrollTo("#contact")}
              className="border-2 border-slate-200 text-navy font-semibold px-8 py-6 text-base rounded-full hover:border-coral hover:text-coral transition-all duration-300 hover:-translate-y-1 bg-transparent"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Contact Us
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 animate-bh-fadeUp anim-delay-4">
            {stats.map((stat, i) => (
              <div key={i} className="group">
                <div className="text-3xl sm:text-4xl font-extrabold text-navy group-hover:text-coral transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400 font-medium mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
