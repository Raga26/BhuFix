import { Button } from "./ui/button";
import { ArrowRight, Award, Users, Target } from "lucide-react";

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1582005450386-52b25f82d9bb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxkaWdpdGFsJTIwbWFya2V0aW5nJTIwdGVhbXxlbnwwfHx8fDE3NzEzNDI0MTB8MA&ixlib=rb-4.1.0&q=85&w=600&h=500&fit=crop";

const features = [
  { icon: Award, label: "Award Winning", desc: "Recognized excellence" },
  { icon: Users, label: "Expert Team", desc: "50+ professionals" },
  { icon: Target, label: "Results Driven", desc: "Data-backed strategy" },
];

export const AboutSection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="about" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-coral/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Text Column */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              About Us
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy mt-4 mb-6 leading-tight">
              Most Trusted Digital Marketing Agency
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              We are a dynamic Digital Marketing Agency dedicated to partnering
              with you for digital growth. Our creativity and expertise drive
              innovative solutions to elevate your online presence and achieve
              your goals. From video production and web development to SEO,
              social media, and marketing automation — we maximize your brand's
              visibility.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              {features.map((item, i) => (
                <div key={i} className="group flex flex-col items-start">
                  <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center mb-3 group-hover:bg-coral transition-all duration-300">
                    <item.icon className="h-5 w-5 text-coral group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-sm font-bold text-navy">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => scrollTo("#services")}
              className="bg-coral hover:bg-coral-dark text-white font-semibold px-8 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
            >
              Learn More
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Image Column */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50">
              <img
                src={ABOUT_IMAGE}
                alt="Bhufix team collaboration"
                className="w-full h-[500px] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/20 to-transparent" />
            </div>
            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl shadow-slate-200/60 p-5 border border-slate-100">
              <div className="text-3xl font-extrabold text-coral">8+</div>
              <div className="text-sm font-medium text-slate-500">
                Years of
                <br />
                Excellence
              </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-coral/10 rounded-full -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};
