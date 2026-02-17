import { useRef, useState } from "react";
import { caseStudies } from "../data/mock";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";

export const CaseStudies = () => {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanLeft(scrollLeft > 10);
      setCanRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === "left" ? -420 : 420,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 500);
    }
  };

  return (
    <section id="case-studies" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Case Studies
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy mt-4 leading-tight">
              Milestone of Successful
              <br />
              Results
            </h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => scroll("left")}
              disabled={!canLeft}
              className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-coral hover:text-coral transition-all duration-300 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canRight}
              className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-coral hover:text-coral transition-all duration-300 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-6 px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {caseStudies.map((study) => (
            <div
              key={study.id}
              className="flex-shrink-0 w-[330px] sm:w-[400px] snap-start group"
            >
              <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-100 hover:border-coral/20 transition-all duration-500 hover:shadow-xl hover:shadow-coral/5">
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={study.image}
                    alt={study.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-navy">
                    {study.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-navy mb-2 group-hover:text-coral transition-colors duration-300">
                    {study.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">
                    {study.description}
                  </p>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    {Object.entries(study.metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-coral" />
                        <span className="text-sm font-bold text-navy">
                          {value}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {key}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
