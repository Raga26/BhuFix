import { useState } from "react";
import { projects } from "../data/mock";
import { ExternalLink } from "lucide-react";

export const ProjectsSection = () => {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <section
      id="projects"
      className="py-24 lg:py-32 bg-slate-50/50 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            Our Portfolio
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy mt-4 mb-6 leading-tight">
            Our Projects
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Explore our portfolio of successful projects across various
            industries.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4]"
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <img
                src={project.image}
                alt={project.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* Overlay */}
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                  hoveredId === project.id
                    ? "bg-gradient-to-t from-navy/90 via-navy/50 to-navy/10"
                    : "bg-gradient-to-t from-navy/70 via-navy/20 to-transparent"
                }`}
              />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-lg font-bold text-white mb-2">
                  {project.title}
                </h3>
                <p
                  className={`text-white/70 text-sm leading-relaxed transition-all duration-500 overflow-hidden ${
                    hoveredId === project.id
                      ? "opacity-100 max-h-20 mb-3"
                      : "opacity-0 max-h-0 mb-0"
                  }`}
                >
                  {project.description}
                </p>
                <span
                  className={`inline-flex items-center gap-2 text-coral text-sm font-semibold transition-all duration-500 ${
                    hoveredId === project.id
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                >
                  View Project <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
