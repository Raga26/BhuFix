import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowRight,
  Clapperboard,
  UserRound,
  Megaphone,
  Mic,
  Globe,
  PenLine,
  Workflow,
  Palette,
  HeartHandshake,
  Sparkles,
  MessageCircle,
  Check,
} from "lucide-react";

const storyBeats = [
  {
    id: "why",
    label: "Why Bhufix",
    title: "A partner who actually shows up",
    body: "We’re a small, sharp team in Udumalpet that treats every brand like it’s our own. No agency fog. No vanishing after kickoff. Just clear plans, honest updates, and work you can feel proud to share.",
    note: "real humans. real replies.",
  },
  {
    id: "how",
    label: "How we work",
    title: "Strategy first. Then the pretty stuff.",
    body: "We start with your goals, audience, and offer — then build the mix that moves the needle: media, branding, marketing, podcasts, websites, content, automation, and design. Every piece connects. Nothing is random.",
    note: "less guesswork, more growth",
  },
  {
    id: "promise",
    label: "Our promise",
    title: "Results you can point to",
    body: "Since 2023 we’ve helped local brands look bigger, sound clearer, and grow online with measurable momentum. You’ll always know what we’re doing, why it matters, and what’s next — including a live dashboard when you’re ready.",
    note: "trust > buzzwords",
  },
];

const needCards = [
  {
    id: "media",
    icon: Clapperboard,
    label: "Media that looks premium",
    tag: "video & photo",
    hook: "Your brand deserves more than phone clips and stock music.",
    detail:
      "We shoot, edit, and finish videos and photos that make your business look like it belongs on a bigger stage — reels, brand films, product films, motion graphics.",
  },
  {
    id: "personal",
    icon: UserRound,
    label: "A personal brand people trust",
    tag: "founders",
    hook: "People buy from people they recognise.",
    detail:
      "Founder and creator branding — strategy, content, LinkedIn, and short-form — so your name carries weight before the first meeting.",
  },
  {
    id: "marketing",
    icon: Megaphone,
    label: "Marketing that brings enquiries",
    tag: "ads & social",
    hook: "Stop chasing vanity metrics. Start chasing sales.",
    detail:
      "Social strategy, content, and paid ads aimed at leads and revenue — with plain-language reporting so you see what your budget did.",
  },
  {
    id: "podcast",
    icon: Mic,
    label: "A podcast that sounds pro",
    tag: "audio / video",
    hook: "From mic setup to published episode — handled end to end.",
    detail:
      "Recording, editing, clips, thumbnails, and distribution. You show up and talk. We make it publish-ready.",
  },
  {
    id: "web",
    icon: Globe,
    label: "A website that converts",
    tag: "web",
    hook: "Pretty isn’t enough. Your site should sell while you sleep.",
    detail:
      "Fast, SEO-ready business sites, landing pages, portfolios, and e-commerce — built to turn visitors into enquiries.",
  },
  {
    id: "content",
    icon: PenLine,
    label: "Words that rank and convert",
    tag: "copy & SEO",
    hook: "Clear copy beats clever fluff every time.",
    detail:
      "Content writing, copywriting, blogs, scripts, and SEO — so people find you, understand you, and take the next step.",
  },
  {
    id: "automation",
    icon: Workflow,
    label: "Systems that follow up for you",
    tag: "automation",
    hook: "Stop letting warm leads go cold in your inbox.",
    detail:
      "WhatsApp, email, CRM workflows, chatbots, and custom tools that handle the repetitive work — so your team stays on the high-value stuff.",
  },
  {
    id: "design",
    icon: Palette,
    label: "A look that’s unmistakably yours",
    tag: "brand design",
    hook: "One brand. Everywhere. No more mismatched posts.",
    detail:
      "Identity, logos, creatives, thumbnails, and guidelines — so every post, ad, and page feels like the same confident brand.",
  },
];

const trustStats = [
  { value: 2, suffix: "+", label: "Years building brands" },
  { value: 15, suffix: "+", label: "Projects delivered" },
  { value: 100, suffix: "%", label: "Client satisfaction" },
  { value: 10, suffix: "+", label: "Happy clients" },
];

function useCountUp(target, active, duration = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return count;
}

function StatItem({ value, suffix, label, active }) {
  const count = useCountUp(value, active);
  return (
    <div className="text-center sm:text-left">
      <div className="text-3xl sm:text-4xl font-extrabold text-coral tracking-tight">
        {count}
        {suffix}
      </div>
      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
        {label}
      </div>
    </div>
  );
}

export const AboutSection = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeBeat, setActiveBeat] = useState("why");
  const [activeNeed, setActiveNeed] = useState(needCards[0].id);
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef(null);

  const beat = storyBeats.find((b) => b.id === activeBeat) || storyBeats[0];
  const need = needCards.find((n) => n.id === activeNeed) || needCards[0];
  const NeedIcon = need.icon;

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsActive(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollTo = (href) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="about"
      className="py-24 lg:py-32 relative overflow-x-clip scroll-mt-24"
      style={{
        background: isDark
          ? "linear-gradient(165deg, #020617 0%, #0f172a 40%, #1B2A4A 100%)"
          : "linear-gradient(165deg, #fff 0%, #FFF7F3 42%, #F8FAFC 72%, #fff 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: isDark ? 0.05 : 0.035,
          backgroundImage: `radial-gradient(circle, ${
            isDark ? "rgba(255,255,255,0.7)" : "#1B2A4A"
          } 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-coral/10 rounded-full blur-3xl pointer-events-none animate-bh-float" />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none animate-bh-float-slow"
        style={{
          background: isDark
            ? "rgba(56, 189, 248, 0.06)"
            : "rgba(186, 230, 253, 0.35)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Who We Are
            </span>
            <span className="font-hand text-xl text-coral/80 -rotate-2 select-none">
              ← the good stuff starts here
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white leading-[1.15] tracking-tight">
            We’re the crew that makes{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-coral">growth</span>
              <span
                className="absolute bottom-1 left-0 w-full h-3 bg-coral/15 rounded-sm -z-0"
                aria-hidden
              />
            </span>{" "}
            feel friendly.
          </h2>

          <p className="mt-5 text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Bhufix helps businesses show up online with clarity — through{" "}
            <span className="text-navy dark:text-white font-semibold">
              media, personal branding, digital marketing, podcasts, websites,
              content &amp; SEO, automation, and design
            </span>
            . Founded in 2023. Built for brands that want results without the
            jargon.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-16 lg:mb-20">
          <div className="lg:col-span-7">
            <div
              className="flex flex-wrap gap-2 mb-6"
              role="tablist"
              aria-label="About Bhufix"
            >
              {storyBeats.map((item) => {
                const selected = activeBeat === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveBeat(item.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${
                      selected
                        ? "bg-coral text-white border-coral shadow-md shadow-coral/20 scale-[1.02]"
                        : "bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-coral/40 hover:text-coral"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div
              key={beat.id}
              role="tabpanel"
              className="relative rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm p-6 sm:p-8 shadow-sm about-panel-in"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-coral/10 flex items-center justify-center shrink-0">
                  {beat.id === "why" && (
                    <HeartHandshake className="h-5 w-5 text-coral" />
                  )}
                  {beat.id === "how" && (
                    <Sparkles className="h-5 w-5 text-coral" />
                  )}
                  {beat.id === "promise" && (
                    <MessageCircle className="h-5 w-5 text-coral" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-navy dark:text-white leading-snug">
                    {beat.title}
                  </h3>
                  <p className="font-hand text-lg text-coral mt-1 -rotate-1">
                    {beat.note}
                  </p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
                {beat.body}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex flex-col justify-start gap-4 sm:gap-5 lg:-mt-16 xl:-mt-20">
            <div className="about-note-float ml-0 sm:ml-4" style={{ animationDelay: "0s" }}>
              <aside className="relative max-w-xs rotate-[-2.5deg] bg-[#FFF3C4] dark:bg-amber-200/90 text-navy p-5 shadow-lg shadow-slate-200/60 dark:shadow-black/30">
                <p className="font-hand text-2xl leading-snug">
                  “We explain everything like a friend — not a pitch deck.”
                </p>
                <span className="block mt-3 font-hand text-lg text-coral-dark">
                  — the Bhufix way
                </span>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/40 dark:bg-white/50 rotate-1 shadow-sm" />
              </aside>
            </div>

            <div
              className="about-note-float ml-auto mr-2 sm:mr-8"
              style={{ animationDelay: "0.4s" }}
            >
              <aside className="relative max-w-[240px] rotate-[3deg] bg-white dark:bg-slate-100 text-navy p-4 border border-dashed border-coral/40 shadow-md">
                <p className="font-hand text-xl leading-snug">
                  Tip: tap the chips ←
                  <br />
                  <span className="text-coral">They’re interactive!</span>
                </p>
              </aside>
            </div>

            <div
              className="about-note-float ml-6 sm:ml-10"
              style={{ animationDelay: "0.8s" }}
            >
              <aside className="relative max-w-[220px] rotate-[-1deg] bg-coral/10 dark:bg-coral/15 p-4">
                <p className="font-hand text-xl leading-snug text-navy dark:text-white">
                  Local roots.
                  <br />
                  Digital reach.
                  <br />
                  <span className="text-coral font-semibold">Your win.</span>
                </p>
              </aside>
            </div>
          </div>
        </div>

        <div className="mb-14 lg:mb-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white">
                What’s your next move?
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-xl">
                Pick what you need help with — we’ll show you how Bhufix shows
                up for it.
              </p>
            </div>
            <span className="font-hand text-xl text-coral rotate-2 select-none hidden sm:block">
              star of the show ↓
            </span>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-5 flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-hide">
              {needCards.map((item, index) => {
                const selected = activeNeed === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNeed(item.id)}
                    className={`group grid grid-cols-[auto_auto_minmax(0,1fr)_1.75rem] items-center gap-x-3 text-left w-full min-h-[68px] px-3.5 py-3 rounded-2xl border transition-colors duration-200 ${
                      selected
                        ? "bg-coral text-white border-coral shadow-md shadow-coral/20"
                        : "bg-white/80 dark:bg-slate-800/55 border-slate-200 dark:border-slate-600/70 text-slate-700 dark:text-slate-100 hover:border-coral/45 hover:bg-coral/[0.07]"
                    }`}
                  >
                    <span
                      className={`w-7 text-center text-[11px] font-bold tracking-wide tabular-nums ${
                        selected ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 ${
                        selected
                          ? "bg-white/20 text-white"
                          : "bg-coral/10 text-coral group-hover:bg-coral group-hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex flex-col justify-center gap-0.5">
                      <span
                        className={`font-hand text-[15px] leading-none ${
                          selected ? "text-white/90" : "text-coral"
                        }`}
                      >
                        {item.tag}
                      </span>
                      <span className="font-semibold text-sm sm:text-[15px] leading-snug break-words">
                        {item.label}
                      </span>
                    </span>

                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center justify-self-end transition-colors duration-200 ${
                        selected
                          ? "bg-white text-coral"
                          : "bg-transparent text-slate-300 dark:text-slate-600 group-hover:text-coral"
                      }`}
                      aria-hidden
                    >
                      {selected ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7">
              <div
                key={need.id}
                className="h-full min-h-[280px] rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6 sm:p-8 flex flex-col justify-between about-panel-in relative overflow-hidden"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-coral/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="inline-flex items-center gap-2 mb-4">
                    <span className="w-11 h-11 rounded-2xl bg-coral/10 flex items-center justify-center">
                      <NeedIcon className="h-5 w-5 text-coral" />
                    </span>
                    <span className="font-hand text-xl text-coral">
                      you picked this
                    </span>
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white leading-tight mb-3">
                    {need.hook}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
                    {need.detail}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => scrollTo("#contact")}
                    className="bg-coral hover:bg-coral-dark text-white font-semibold px-7 py-5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-coral/20 hover:-translate-y-0.5"
                  >
                    Let’s talk about this
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => scrollTo("#services")}
                    className="text-sm font-semibold text-navy dark:text-white underline underline-offset-4 decoration-coral/50 hover:decoration-coral transition-colors"
                  >
                    See all eight services
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={statsRef}
          className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm px-6 py-8 sm:px-10 sm:py-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
            <p className="text-navy dark:text-white font-extrabold text-lg sm:text-xl max-w-md leading-snug">
              Numbers don’t brag — they just quietly prove we’re in this with
              you.
            </p>
            <p className="font-hand text-2xl text-coral -rotate-1">
              founded 2023 · still obsessed with your wins
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {trustStats.map((stat) => (
              <StatItem key={stat.label} {...stat} active={statsActive} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aboutPanelIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aboutNoteFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .about-panel-in {
          animation: aboutPanelIn 0.45s ease-out both;
        }
        .about-note-float {
          animation: aboutNoteFloat 5.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .about-panel-in,
          .about-note-float {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
};
