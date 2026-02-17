import { useState, useEffect } from "react";
import { navLinks } from "../data/mock";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); scrollTo("#home"); }}
          className="flex items-center gap-1 group"
        >
          <span className="text-2xl font-extrabold tracking-tight text-navy">
            Bhu<span className="text-coral">fix</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="relative text-[13px] font-semibold uppercase tracking-wider text-slate-500 hover:text-coral transition-colors duration-300 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-coral after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Button
          onClick={() => scrollTo("#contact")}
          className="hidden lg:flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-6 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5"
        >
          Get a Quote
          <ArrowRight className="h-4 w-4" />
        </Button>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-navy hover:text-coral transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="block py-3 text-sm font-semibold text-slate-600 hover:text-coral transition-colors border-b border-slate-50 last:border-0"
            >
              {link.label}
            </a>
          ))}
          <Button
            onClick={() => scrollTo("#contact")}
            className="w-full mt-4 bg-coral hover:bg-coral-dark text-white font-semibold rounded-full"
          >
            Get a Quote
          </Button>
        </div>
      </div>
    </header>
  );
};
