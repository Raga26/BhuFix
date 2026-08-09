import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { navLinks } from "../data/mock";
import { Menu, X, ArrowRight, Sun, Moon, LayoutGrid } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#home");
  const [progress, setProgress] = useState(0);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);

      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0);

      if (location.pathname === "/") {
        let current = "#home";
        for (const link of navLinks) {
          if (!link.href.startsWith("#")) continue;
          const el = document.querySelector(link.href);
          if (el && el.getBoundingClientRect().top <= 140) current = link.href;
        }
        setActiveSection(current);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const hash = location.hash || sessionStorage.getItem("bhufix_scroll_to");
    if (!hash) return;
    sessionStorage.removeItem("bhufix_scroll_to");
    const id = hash.startsWith("#") ? hash : `#${hash}`;
    requestAnimationFrame(() => {
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  }, [location.pathname, location.hash]);

  const goHomeSection = (href) => {
    setMobileOpen(false);
    if (location.pathname === "/") {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    sessionStorage.setItem("bhufix_scroll_to", href);
    navigate({ pathname: "/", hash: href.replace(/^#/, "") });
  };

  const goHome = () => {
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/85 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/5 py-2.5"
          : "bg-transparent border-b border-transparent py-4"
      }`}
    >
      <div
        className="absolute top-0 left-0 h-[2px] bg-coral transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%`, opacity: scrolled ? 1 : 0 }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <button type="button" onClick={goHome} className="shrink-0 group">
          <span className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">
            Bhu<span className="text-coral">Fix</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-md px-1.5 py-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === "/" && activeSection === link.href;
            return (
              <a
                key={link.label}
                href={link.href.startsWith("#") ? `/${link.href}` : link.href}
                onClick={(e) => {
                  e.preventDefault();
                  goHomeSection(link.href);
                }}
                className={`relative px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 ${
                  isActive
                    ? "text-coral bg-coral/10"
                    : "text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.06]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-coral/40 hover:text-coral transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-4 py-2 rounded-full text-sm transition-all duration-300 hover:shadow-md hover:shadow-coral/25"
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
              Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-navy dark:text-slate-100 border border-slate-200 dark:border-white/10 hover:border-coral/40 hover:text-coral transition-colors"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Dashboard
              </button>
              <Button
                onClick={() => goHomeSection("#contact")}
                className="inline-flex items-center gap-1.5 bg-coral hover:bg-coral-dark text-white font-semibold px-4 py-2 rounded-full text-sm transition-all duration-300 hover:shadow-md hover:shadow-coral/25"
              >
                Get a Quote
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-navy dark:text-white"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-navy dark:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-4 mt-2 mb-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-3 py-2 shadow-xl shadow-black/5">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href.startsWith("#") ? `/${link.href}` : link.href}
              onClick={(e) => {
                e.preventDefault();
                goHomeSection(link.href);
              }}
              className={`block px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                location.pathname === "/" && activeSection === link.href
                  ? "text-coral bg-coral/10"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              {link.label}
            </a>
          ))}
          <div className="grid grid-cols-2 gap-2 p-2 mt-1">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate(user ? "/dashboard" : "/login");
              }}
              className="flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 text-navy dark:text-white font-semibold py-2.5 rounded-full text-sm"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <Button
              onClick={() => goHomeSection("#contact")}
              className="bg-coral hover:bg-coral-dark text-white font-semibold rounded-full text-sm"
            >
              Get a Quote
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
