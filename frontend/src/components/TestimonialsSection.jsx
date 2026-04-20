import { testimonials } from "../data/mock";
import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  return (
    <section
      id="testimonials"
      className="py-24 lg:py-32 bg-white dark:bg-slate-900 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-4 leading-tight">
            What Our Clients Say
          </h2>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-slate-50/80 dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 hover:border-coral/20 transition-all duration-300 hover:shadow-lg hover:shadow-coral/5 relative"
            >
              <Quote className="h-8 w-8 text-coral/20 mb-4" />
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-600/60">
                <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center text-coral font-bold text-sm">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-bold text-navy dark:text-white text-sm">{t.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
