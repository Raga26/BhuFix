import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { navLinks } from "../data/mock";
import { Menu, X, ArrowRight, Sun, Moon, LayoutDashboard, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const ThemeToggle = ({ theme, toggleTheme }) => (
  <button
    onClick={toggleTheme}
    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    className="relative flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-0.5 w-14 h-7 transition-colors duration-300 flex-shrink-0"
  >
    <span
      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-md flex items-center justify-center transition-all duration-300 ${
        theme === "dark" ? "left-[30px]" : "left-0.5"
      }`}
    >
      {theme === "dark" ? (
        <Moon className="h-3.5 w-3.5 text-blue-300" />
      ) : (
        <Sun className="h-3.5 w-3.5 text-amber-500" />
      )}
    </span>
    <Sun className="h-3 w-3 text-slate-400 dark:text-slate-500 ml-1.5 flex-shrink-0" />
    <Moon className="h-3 w-3 text-slate-400 dark:text-slate-500 ml-auto mr-1.5 flex-shrink-0" />
  </button>
);

export const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // After navigating home with a hash, scroll to that section
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2.5 group"
        >
          <span className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">
            Bhu<span className="text-coral">Fix</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href.startsWith("#") ? `/${link.href}` : link.href}
              onClick={(e) => {
                e.preventDefault();
                goHomeSection(link.href);
              }}
              className="relative text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-coral dark:hover:text-coral transition-colors duration-300 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-coral after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            type="button"
            onClick={() => navigate("/clockin")}
            className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5"
          >
            <Clock className="h-4 w-4" />
            ClockIN
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5"
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
              Dashboard
              <LayoutDashboard className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <Button
                onClick={() => goHomeSection("#contact")}
                className="flex items-center gap-2 bg-navy hover:bg-navy/90 dark:bg-white/10 dark:hover:bg-white/20 text-white font-semibold px-6 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                Get a Quote
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-navy dark:text-white hover:text-coral transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-500 ${
          mobileOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700 px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href.startsWith("#") ? `/${link.href}` : link.href}
              onClick={(e) => {
                e.preventDefault();
                goHomeSection(link.href);
              }}
              className="block py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-coral dark:hover:text-coral transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => { setMobileOpen(false); navigate("/clockin"); }}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold py-2.5 rounded-full"
          >
            <Clock className="h-4 w-4" />
            ClockIN
          </button>
          <Button
            onClick={() => goHomeSection("#contact")}
            className="w-full mt-2 bg-coral hover:bg-coral-dark text-white font-semibold rounded-full"
          >
            Get a Quote
          </Button>
          {user ? (
            <button
              type="button"
              onClick={() => { setMobileOpen(false); navigate("/dashboard"); }}
              className="w-full mt-2 flex items-center justify-center gap-2 border border-coral text-coral font-semibold py-2.5 rounded-full transition-all duration-300 hover:bg-coral/10"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMobileOpen(false); navigate("/login"); }}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-navy text-white font-semibold py-2.5 rounded-full"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
