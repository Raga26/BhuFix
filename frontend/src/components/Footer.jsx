import { navLinks, contactInfo } from "../data/mock";
import {
  ArrowRight,
  Heart,
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Twitter,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "./ui/button";

const socialLinks = [
  {
    label: "Instagram",
    icon: Instagram,
    href: "https://www.instagram.com/bhufix?igsh=YTZmd3lwZm15dHJj",
  },
  // Keep inactive platforms non-navigating until real URLs exist (bare "#" jumps to top)
  { label: "Facebook", icon: Facebook, href: null },
  { label: "Twitter", icon: Twitter, href: null },
  { label: "LinkedIn", icon: Linkedin, href: null },
  { label: "YouTube", icon: Youtube, href: null },
];

const serviceLinks = [
  "Media Production",
  "Personal Branding",
  "Digital Marketing",
  "Podcast Production",
  "Website Development",
  "Content, Copywriting & SEO",
  "Automation & Systems",
  "Brand & Creative Design",
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden text-white bg-gradient-to-b from-navy via-navy to-navy-dark dark:from-slate-950 dark:via-slate-950 dark:to-black">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute -top-24 left-1/4 w-80 h-80 bg-coral/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-10">
        {/* ROI strip */}
        <div className="mb-14 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm px-6 py-7 sm:px-8 sm:py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-coral" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                Ready when you are
              </span>
              <span className="font-hand text-lg text-coral/90 rotate-[-2deg] select-none">
                let’s grow →
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Marketing that{" "}
              <span className="text-coral">shows its work</span> — not just
              pretty reports.
            </h3>
            <p className="mt-2 text-white/55 text-sm sm:text-base leading-relaxed">
              Strategy, creative, ads, and a live dashboard. Clear ROI talk —
              before you spend a rupee more.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              onClick={() => scrollTo("#contact")}
              className="bg-coral hover:bg-coral-dark text-white font-bold rounded-full px-7 py-6 shadow-lg shadow-coral/25 hover:-translate-y-0.5 transition-all"
            >
              Book a free consult
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="font-hand text-xl text-coral text-center sm:text-left">
              no pitch deck energy
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-14">
          {/* Brand */}
          <div className="lg:col-span-4">
            <button
              type="button"
              onClick={() => scrollTo("#home")}
              className="inline-flex items-center gap-2.5"
            >
              <span className="text-2xl font-extrabold tracking-tight">
                Bhu<span className="text-coral">Fix</span>
              </span>
            </button>
            <p className="text-white/55 text-sm leading-relaxed mt-4 max-w-sm">
              Your growth partner in digital marketing. We help brands look
              sharper, sound clearer, and turn attention into enquiries.
            </p>

            <aside className="mt-5 inline-block max-w-[240px] rotate-[-1.5deg] bg-[#FFF3C4] text-navy px-4 py-3 shadow-md">
              <p className="font-hand text-lg leading-snug">
                Local roots. Digital reach.
                <br />
                <span className="text-coral-dark">Your ROI story.</span>
              </p>
            </aside>

            <div className="flex flex-wrap gap-2.5 mt-6">
              {socialLinks.map((social) =>
                social.href ? (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-coral hover:border-coral flex items-center justify-center transition-all duration-300 hover:-translate-y-1 text-white/70 hover:text-white"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ) : (
                  <span
                    key={social.label}
                    aria-label={`${social.label} (coming soon)`}
                    title="Coming soon"
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/35 cursor-default"
                  >
                    <social.icon className="h-4 w-4" />
                  </span>
                )
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-[0.18em] text-white/90 mb-5">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(link.href);
                    }}
                    className="text-white/50 hover:text-coral text-sm transition-colors duration-300 inline-flex items-center gap-1.5 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-coral" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-3">
            <div className="flex items-baseline gap-2 mb-5">
              <h4 className="font-bold text-xs uppercase tracking-[0.18em] text-white/90">
                Services
              </h4>
              <span className="font-hand text-sm text-coral/80">all in-house</span>
            </div>
            <ul className="space-y-2.5">
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
          <div className="lg:col-span-3">
            <div className="flex items-baseline gap-2 mb-5">
              <h4 className="font-bold text-xs uppercase tracking-[0.18em] text-white/90">
                Contact
              </h4>
              <span className="font-hand text-sm text-coral/80">say hi</span>
            </div>
            <ul className="space-y-4">
              <li>
                <a
                  href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
                  className="group flex items-start gap-3 text-sm text-white/55 hover:text-coral transition-colors"
                >
                  <Phone className="h-4 w-4 mt-0.5 text-coral shrink-0" />
                  <span>{contactInfo.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="group flex items-start gap-3 text-sm text-white/55 hover:text-coral transition-colors"
                >
                  <Mail className="h-4 w-4 mt-0.5 text-coral shrink-0" />
                  <span>{contactInfo.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/55 leading-relaxed">
                <MapPin className="h-4 w-4 mt-0.5 text-coral shrink-0" />
                <span>{contactInfo.address}</span>
              </li>
            </ul>

            <a
              href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              WhatsApp us
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm text-center sm:text-left">
            © {currentYear} Bhufix Digital Marketing Agency. All rights
            reserved.
          </p>
          <p className="text-white/40 text-sm flex items-center gap-1.5">
            Crafted with
            <Heart className="h-3 w-3 text-coral fill-coral" />
            in Udumalpet
            <span className="font-hand text-base text-coral/80 ml-1">
              — for brands that mean it
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};
