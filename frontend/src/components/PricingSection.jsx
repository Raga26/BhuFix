import { pricingPackages } from "../data/mock";
import { Check, X, ArrowRight, Crown, Flame } from "lucide-react";
import { Button } from "./ui/button";

export const PricingSection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/20 to-transparent" />
      <div className="absolute -top-40 right-0 w-80 h-80 bg-coral/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-0 w-80 h-80 bg-sky-50 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Our Packages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy mt-4 mb-6 leading-tight">
            Choose Your Growth Plan
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Transparent pricing with no hidden costs. Pick the package that fits
            your business goals and watch your brand grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {pricingPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
                pkg.highlighted
                  ? "bg-navy text-white shadow-2xl shadow-navy/20 scale-[1.02] md:scale-105 z-10"
                  : "bg-white border border-slate-200 hover:border-coral/30 hover:shadow-xl hover:shadow-coral/5"
              }`}
            >
              {/* Badge */}
              {pkg.badge && (
                <div
                  className={`absolute top-0 right-0 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1.5 ${
                    pkg.highlighted
                      ? "bg-coral text-white"
                      : "bg-coral/10 text-coral"
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

              <div className="p-8 lg:p-10">
                {/* Package name */}
                <h3
                  className={`text-xl font-bold mb-3 ${
                    pkg.highlighted ? "text-coral" : "text-navy"
                  }`}
                >
                  {pkg.name}
                </h3>

                {/* Description */}
                <p
                  className={`text-sm leading-relaxed mb-8 ${
                    pkg.highlighted ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {pkg.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      {feature.included ? (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            pkg.highlighted
                              ? "bg-coral"
                              : "bg-coral/10"
                          }`}
                        >
                          <Check
                            className={`h-3 w-3 ${
                              pkg.highlighted ? "text-white" : "text-coral"
                            }`}
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            pkg.highlighted
                              ? "bg-white/10"
                              : "bg-slate-100"
                          }`}
                        >
                          <X
                            className={`h-3 w-3 ${
                              pkg.highlighted
                                ? "text-white/30"
                                : "text-slate-300"
                            }`}
                          />
                        </div>
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? pkg.highlighted
                              ? "text-white"
                              : "text-navy"
                            : pkg.highlighted
                            ? "text-white/30"
                            : "text-slate-400 line-through"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => scrollTo("#contact")}
                  className={`w-full py-5 rounded-full font-semibold text-base transition-all duration-300 hover:-translate-y-0.5 ${
                    pkg.highlighted
                      ? "bg-coral hover:bg-coral-dark text-white hover:shadow-lg hover:shadow-coral/30"
                      : "bg-navy/5 hover:bg-coral text-navy hover:text-white"
                  }`}
                >
                  Contact for Pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-slate-400 text-sm mt-10">
          Custom packages available on request. Get in touch to discuss pricing tailored to your business needs.
        </p>
      </div>
    </section>
  );
};
