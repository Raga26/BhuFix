import { navLinks, contactInfo } from "../data/mock";
import { ArrowRight, Heart } from "lucide-react";

const socialLinks = [
  { label: "Fb", href: "#" },
  { label: "Tw", href: "#" },
  { label: "Ig", href: "#" },
  { label: "Li", href: "#" },
  { label: "Yt", href: "#" },
];

const serviceLinks = [
  "Video Production",
  "Web Development",
  "Social Media",
  "Content Writing",
  "SEO Services",
  "Marketing Automation",
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-navy text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#home" className="text-2xl font-extrabold">
              Bhu<span className="text-coral">fix</span>
            </a>
            <p className="text-white/50 text-sm leading-relaxed mt-4 max-w-xs">
              Your growth partner in digital marketing. We craft strategies that
              transform businesses into beloved brands.
            </p>
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-coral flex items-center justify-center transition-all duration-300 hover:-translate-y-1 text-sm font-bold text-white/60 hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(link.href);
                    }}
                    className="text-white/50 hover:text-coral text-sm transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">
              Services
            </h4>
            <ul className="space-y-3">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo("#services");
                    }}
                    className="text-white/50 hover:text-coral text-sm transition-colors duration-300"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-6">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="text-white/50 text-sm">{contactInfo.phone}</li>
              <li className="text-white/50 text-sm">{contactInfo.email}</li>
              <li className="text-white/50 text-sm leading-relaxed">
                {contactInfo.address}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © {currentYear} Bhufix Digital Marketing Agency. All rights
            reserved.
          </p>
          <p className="text-white/40 text-sm flex items-center gap-1">
            Crafted with{" "}
            <Heart className="h-3 w-3 text-coral fill-coral" /> by Bhufix
          </p>
        </div>
      </div>
    </footer>
  );
};
