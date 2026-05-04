import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { navLinks } from "../data/mock";
import { Menu, X, ArrowRight, Sun, Moon, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import BhufixLogo from "./BhufixLogo";

const ThemeToggle = ({ theme, toggleTheme }) => (
  <button
    onClick={toggleTheme}
    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    className="relative flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-0.5 w-14 h-7 transition-colors duration-300 flex-shrink-0"
  >
    {/* Sliding knob */}
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
    {/* Static background icons */}
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
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.3)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); scrollTo("#home"); }}
          className="flex items-center gap-2.5 group"
        >
          <BhufixLogo size={36} />
          <span className="text-2xl font-extrabold tracking-tight text-navy dark:text-white">
            Bhu<span className="text-coral">Fix</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="relative text-[13px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-coral dark:hover:text-coral transition-colors duration-300 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-coral after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          {user ? (
            <button
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
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/25 hover:-translate-y-0.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <Button
                onClick={() => scrollTo("#contact")}
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
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700 px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href); }}
              className="block py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-coral dark:hover:text-coral transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
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
          {user ? (
            <button
              onClick={() => { setMobileOpen(false); navigate("/dashboard"); }}
              className="w-full mt-2 flex items-center justify-center gap-2 border border-coral text-coral font-semibold py-2.5 rounded-full transition-all duration-300 hover:bg-coral/10"
            >
              <span className="w-6 h-6 rounded-full bg-coral/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase() ?? "U"}
              </span>
              Go to Dashboard
              <LayoutDashboard className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => { setMobileOpen(false); navigate("/login"); }}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-coral text-white font-semibold py-2.5 rounded-full transition-all duration-300 hover:bg-coral-dark"
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
