import { Button } from "./ui/button";
import { ArrowRight, Award, Users, Target } from "lucide-react";

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=600&h=500&fit=crop&q=80";

const features = [
  { icon: Award, label: "Creative Strategy", desc: "Smart marketing" },
  { icon: Users, label: "Dedicated Team", desc: "Passionate experts" },
  { icon: Target, label: "Results Driven", desc: "Measurable impact" },
];

export const AboutSection = () => {
  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="about" className="py-24 lg:py-32 bg-white dark:bg-slate-900 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-coral/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Text Column */}
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Who We Are
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-4 mb-6 leading-tight">
              Your Trusted Digital Marketing Partner
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-4">
              At Bhufix, we are dedicated to providing top-notch digital marketing
              solutions that help businesses thrive in the online world. Our team
              specializes in SEO, social media management, content creation, video
              production, and more — ensuring that your brand reaches its full
              potential.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-4">
              Founded in 2023, Bhufix has quickly established itself as a trusted
              partner for businesses looking to enhance their digital presence. We
              pride ourselves on our innovative strategies, personalized approach,
              and commitment to delivering measurable results.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
              Our mission is to empower businesses of all sizes to succeed in the
              digital landscape through effective marketing strategies and
              cutting-edge technology. We believe in building long-term relationships
              with our clients based on trust, transparency, and mutual success.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              {features.map((item, i) => (
                <div key={i} className="group flex flex-col items-start">
                  <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center mb-3 group-hover:bg-coral transition-all duration-300">
                    <item.icon className="h-5 w-5 text-coral group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="text-sm font-bold text-navy dark:text-white">{item.label}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => scrollTo("#services")}
              className="bg-coral hover:bg-coral-dark text-white font-semibold px-8 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
            >
              Explore Our Services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Image Column */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <img
                src={ABOUT_IMAGE}
                alt="Bhufix digital marketing team"
                className="w-full h-[500px] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/20 to-transparent" />
            </div>
            {/* Floating stats card */}
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 p-5 border border-slate-100 dark:border-slate-700">
              <div className="text-3xl font-extrabold text-coral">2+</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
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
