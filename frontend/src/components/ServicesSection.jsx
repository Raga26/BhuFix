import { services } from "../data/mock";
import { Video, Monitor, Share2, PenTool, Search, Zap, ArrowRight } from "lucide-react";

const iconMap = { Video, Monitor, Share2, PenTool, Search, Zap };

export const ServicesSection = () => {
  return (
    <section id="services" className="py-24 lg:py-32 bg-slate-50/50 dark:bg-slate-900/80 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Services We Offer
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-4 mb-6 leading-tight">
            Expert Digital Marketing Services
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
            We connect the dots that create and shape your brand — a roadmap to
            digital success through integrated marketing services.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = iconMap[service.icon];
            return (
              <div
                key={service.id}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 hover:border-coral/20 dark:hover:border-coral/30 transition-all duration-500 hover:shadow-xl hover:shadow-coral/5 hover:-translate-y-2 cursor-pointer"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-coral/10 flex items-center justify-center mb-6 group-hover:bg-coral transition-all duration-500">
                  {Icon && (
                    <Icon className="h-6 w-6 text-coral group-hover:text-white transition-colors duration-500" />
                  )}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-navy dark:text-white mb-3 group-hover:text-coral dark:group-hover:text-coral transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  {service.shortDesc}
                </p>

                {/* Read more */}
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-coral opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </span>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-[3px] bg-coral rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
