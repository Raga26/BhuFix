import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Instagram,
  MapPin,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clientStories } from "../data/mock";

const pad = (n) => String(n).padStart(2, "0");

const StickyNote = ({
  children,
  tone = "yellow",
  rotate = "-2deg",
  className = "",
  tape = true,
  delay = "0s",
}) => {
  const tones = {
    yellow: "bg-[#FFF3C4] dark:bg-amber-200/90 text-navy",
    coral: "bg-coral/15 dark:bg-coral/20 text-navy dark:text-white",
    white:
      "bg-white dark:bg-slate-100 text-navy border border-dashed border-coral/35",
    mint: "bg-[#D8F3E2] dark:bg-emerald-200/80 text-navy",
  };

  return (
    <div
      className={`story-note-float pointer-events-none select-none ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden
    >
      <aside
        className={`relative px-4 py-3.5 shadow-lg shadow-slate-200/50 dark:shadow-black/25 ${tones[tone]}`}
        style={{ transform: `rotate(${rotate})` }}
      >
        {tape && (
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-white/45 dark:bg-white/55 rotate-1 shadow-sm" />
        )}
        {children}
      </aside>
    </div>
  );
};

/**
 * 9:16 reel — video mounts while the card is active so play() keeps the user gesture.
 * Switching clients pauses + unloads the previous reel.
 * Clients with `videos[]` can flip between multiple reels for the same brand.
 */
const ReelPlayer = ({ client, isActive }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const reels =
    Array.isArray(client.videos) && client.videos.length > 0
      ? client.videos
      : [{ src: client.video, poster: client.poster, label: "Reel" }];

  const activeReel = reels[Math.min(reelIndex, reels.length - 1)] || reels[0];
  const hasMultipleReels = reels.length > 1;

  useEffect(() => {
    setReelIndex(0);
    setIsPlaying(false);
  }, [client.id]);

  useEffect(() => {
    if (isActive) return;
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    setIsPlaying(false);
  }, [isActive]);

  useEffect(() => {
    setIsPlaying(false);
    const v = videoRef.current;
    if (!v || !isActive) return;
    // Keep muted autoplay when switching reels on the same card
    const tryPlay = async () => {
      try {
        v.muted = isMuted;
        await v.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    };
    // Only auto-continue if user already started watching this card
    if (!v.paused || v.currentTime > 0) {
      tryPlay();
    }
  }, [reelIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!isActive) return;

      const v = videoRef.current;
      if (!v) return;

      if (v.paused) {
        try {
          v.muted = isMuted;
          await v.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      } else {
        v.pause();
        setIsPlaying(false);
      }
    },
    [isActive, isMuted]
  );

  const selectReel = useCallback(
    (index, e) => {
      e?.stopPropagation?.();
      if (!isActive || index === reelIndex) return;
      setReelIndex(index);
    },
    [isActive, reelIndex]
  );

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[320px] mx-auto lg:mx-0">
      <div
        className={`relative aspect-[9/16] rounded-[1.75rem] overflow-hidden bg-navy shadow-2xl shadow-navy/25 ring-1 ring-black/5 transition-transform duration-500 ease-out ${
          isActive ? "scale-100" : "scale-[0.96]"
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #1B2A4A 0%, #0F1729 55%, #2A1A14 100%)",
          }}
          aria-hidden
        />

        {activeReel.poster && (
          <img
            src={activeReel.poster}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPlaying ? "opacity-0" : "opacity-100"
            }`}
            loading="lazy"
            draggable={false}
          />
        )}

        {isActive && (
          <video
            key={activeReel.src}
            ref={videoRef}
            src={activeReel.src}
            poster={activeReel.poster || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted={isMuted}
            preload="metadata"
            loop
            onPlaying={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            aria-label={`${client.name} ${activeReel.label || "reel"}`}
          />
        )}

        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            isPlaying
              ? "opacity-0"
              : "bg-gradient-to-t from-navy/50 via-transparent to-navy/10"
          }`}
        />

        {!isPlaying && (
          <div className="absolute inset-x-0 bottom-0 p-5 pointer-events-none">
            <div className="flex items-end gap-3">
              {client.logo && (
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-white/95 shadow-md">
                  <img
                    src={client.logo}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 drop-shadow">
                  {hasMultipleReels
                    ? `Reel ${reelIndex + 1} of ${reels.length}`
                    : "Reel"}
                </span>
                <p className="text-white text-sm font-semibold mt-1 leading-snug drop-shadow">
                  {client.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {isActive ? (
          <button
            type="button"
            data-reel-play
            onPointerDown={(e) => e.stopPropagation()}
            onClick={togglePlay}
            className="absolute inset-0 z-20 flex items-center justify-center group/play focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-inset"
            aria-label={isPlaying ? "Pause reel" : "Play reel"}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-navy shadow-lg transition-all duration-300 group-hover/play:scale-105 group-hover/play:bg-coral group-hover/play:text-white ${
                isPlaying
                  ? "opacity-0 group-hover/play:opacity-100 scale-90"
                  : "opacity-100"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
              )}
            </span>
          </button>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            aria-hidden
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-navy shadow-lg opacity-80">
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </span>
          </div>
        )}

        {isActive && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((m) => {
                const next = !m;
                if (videoRef.current) videoRef.current.muted = next;
                return next;
              });
            }}
            className="absolute bottom-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/70"
            aria-label={isMuted ? "Unmute reel" : "Mute reel"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        )}

        {hasMultipleReels && isActive && (
          <div
            className="absolute top-4 inset-x-0 z-30 flex items-center justify-center gap-2 px-4"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {reels.map((reel, i) => (
              <button
                key={`${reel.src}-${i}`}
                type="button"
                onClick={(e) => selectReel(i, e)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === reelIndex
                    ? "w-7 bg-white"
                    : "w-1.5 bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Show ${reel.label || `reel ${i + 1}`}`}
                aria-pressed={i === reelIndex}
              />
            ))}
          </div>
        )}
      </div>

      {hasMultipleReels && isActive && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {reels.map((reel, i) => (
            <button
              key={`label-${reel.src}-${i}`}
              type="button"
              onClick={(e) => selectReel(i, e)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ${
                i === reelIndex
                  ? "bg-coral text-white"
                  : "bg-slate-100 text-slate-500 hover:text-navy dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
              aria-pressed={i === reelIndex}
            >
              {reel.label || `Reel ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <a
        href={client.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-coral transition-colors duration-300"
      >
        <Instagram className="h-4 w-4" />
        View on Instagram
        <span aria-hidden className="text-xs">
          ↗
        </span>
      </a>
    </div>
  );
};

const ClientInfo = ({ client, index, total }) => {
  const categoryLine =
    client.categories?.length > 0
      ? client.categories.join(" · ")
      : client.industry;

  return (
    <div className="flex flex-col min-w-0 pt-2 lg:pt-0">
      <div className="flex items-center justify-between gap-4 mb-5">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-coral">
          <span className="h-px w-6 bg-coral/60" aria-hidden />
          Client Feature
          <span className="font-hand text-sm normal-case tracking-normal text-coral/70 -rotate-2">
            pinned
          </span>
        </span>
        <span className="text-xs font-bold tabular-nums text-slate-400 dark:text-slate-500 lg:hidden">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>

      <div className="flex items-start gap-4">
        {client.logo && (
          <div className="mt-1 h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:h-16 sm:w-16">
            <img
              src={client.logo}
              alt={`${client.name} logo`}
              className="h-full w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold text-navy dark:text-white leading-tight tracking-tight">
            {client.name}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-coral shrink-0" />
              {client.location}
            </span>
            <span
              className="hidden sm:inline text-slate-300 dark:text-slate-600"
              aria-hidden
            >
              ·
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {categoryLine}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-baseline gap-2 mb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            About the Business
          </h4>
          <span className="font-hand text-sm text-coral/70 rotate-1 hidden sm:inline">
            the short version
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed max-w-xl">
          {client.description}
        </p>
      </div>

      <div className="mt-7">
        <div className="flex items-baseline gap-2 mb-3">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Services with BhuFix
          </h4>
          <span className="font-hand text-sm text-coral/70 -rotate-1 hidden sm:inline">
            what we did
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.services.map((service) => (
            <span
              key={service}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-navy dark:text-white bg-coral/10 border border-coral/15 dark:bg-coral/15 dark:border-coral/20"
            >
              {service}
            </span>
          ))}
        </div>
      </div>

      {/*
        Review block: when isPlaceholderReview is true this is DEMO copy only.
        Replace review/reviewer and set isPlaceholderReview: false before publishing.
        Intentionally no stars / “verified” chrome while placeholder.
      */}
      <blockquote className="mt-8 relative max-w-xl">
        <div
          className={`rounded-2xl border px-6 py-5 ${
            client.isPlaceholderReview
              ? "border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/50"
              : "border-coral/20 bg-coral/[0.04] dark:bg-coral/10"
          }`}
        >
          <p className="text-navy dark:text-white text-[15px] sm:text-base leading-relaxed font-medium">
            <span className="text-coral text-2xl leading-none font-serif mr-1">
              “
            </span>
            {client.review}
            <span className="text-coral text-2xl leading-none font-serif ml-0.5">
              ”
            </span>
          </p>
          <footer className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            — {client.reviewer}
          </footer>
        </div>
      </blockquote>
    </div>
  );
};

export const TestimonialsSection = () => {
  const scrollerRef = useRef(null);
  const slideRefs = useRef([]);
  const [selected, setSelected] = useState(0);
  const total = clientStories.length;
  const canPrev = selected > 0;
  const canNext = selected < total - 1;

  const nearestIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const mid = slide.offsetLeft + slide.clientWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }, []);

  const goTo = useCallback(
    (index, behavior = "smooth") => {
      const next = Math.max(0, Math.min(total - 1, index));
      const el = slideRefs.current[next];
      const scroller = scrollerRef.current;
      if (!el || !scroller) {
        setSelected(next);
        return;
      }
      const left =
        el.offsetLeft - (scroller.clientWidth - el.clientWidth) / 2;
      scroller.scrollTo({ left, behavior });
      setSelected(next);
    },
    [total]
  );

  // Keep selected index in sync with native touch / trackpad scroll
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    let ticking = false;
    let snapTimer;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setSelected((prev) => {
          const best = nearestIndex();
          return prev === best ? prev : best;
        });
      });
      // Soft snap after the finger/trackpad settles (skip if already centered)
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        const best = nearestIndex();
        const el = slideRefs.current[best];
        const node = scrollerRef.current;
        if (!el || !node) return;
        const target =
          el.offsetLeft - (node.clientWidth - el.clientWidth) / 2;
        if (Math.abs(node.scrollLeft - target) < 6) {
          setSelected(best);
          return;
        }
        goTo(best, "smooth");
      }, 140);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.clearTimeout(snapTimer);
    };
  }, [goTo, nearestIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const section = document.getElementById("testimonials");
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > 80;
      if (!inView) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") goTo(selected - 1);
      else goTo(selected + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, selected]);

  // Initial center + keep active slide centered on resize
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const centerSlide = (index, behavior = "auto") => {
      const el = slideRefs.current[index];
      if (!el) return;
      const left =
        el.offsetLeft - (scroller.clientWidth - el.clientWidth) / 2;
      scroller.scrollTo({ left, behavior });
    };

    requestAnimationFrame(() => centerSlide(0));

    const ro = new ResizeObserver(() => {
      centerSlide(nearestIndex());
    });
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [nearestIndex]);

  const activeClient = clientStories[selected];

  return (
    <section
      id="testimonials"
      className="py-24 lg:py-32 relative overflow-x-clip scroll-mt-24"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #FFF7F3 42%, #ffffff 100%)",
      }}
    >
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/25 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(27,42,74,0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* One light section note — kept away from the carousel so it can’t clip */}
      <StickyNote
        tone="yellow"
        rotate="-5deg"
        delay="0s"
        className="absolute top-20 left-4 sm:left-8 lg:left-12 z-[5] hidden lg:block w-[132px]"
      >
        <p className="font-hand text-lg leading-tight">
          real clients.
          <br />
          <span className="text-coral-dark">real reels.</span>
        </p>
      </StickyNote>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16 relative">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
              Client Stories
            </span>
            <span className="font-hand text-lg text-coral/80 -rotate-2 select-none hidden sm:inline">
              scrapbook edition
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy dark:text-white mt-2 leading-tight">
            Work That Speaks.
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mt-4">
            Real businesses. Real content. Built to be seen.
          </p>
          <p className="font-hand text-xl text-coral mt-3 -rotate-1 select-none">
            tap the arrows to meet the brands →
          </p>
        </div>
      </div>

      {/* Carousel + big side controls (always beside the cards) */}
      <div className="relative z-10">
        <button
          type="button"
          onClick={() => goTo(selected - 1)}
          disabled={!canPrev}
          aria-label="Previous client"
          className="story-nav-btn absolute left-2 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-coral text-white shadow-lg shadow-coral/35 hover:bg-coral-dark hover:scale-105 transition-all duration-300 disabled:opacity-25 disabled:pointer-events-none disabled:hover:scale-100"
        >
          <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => goTo(selected + 1)}
          disabled={!canNext}
          aria-label="Next client"
          className="story-nav-btn absolute right-2 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-30 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-coral text-white shadow-lg shadow-coral/35 hover:bg-coral-dark hover:scale-105 transition-all duration-300 disabled:opacity-25 disabled:pointer-events-none disabled:hover:scale-100"
        >
          <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-hide px-[12%] sm:px-[14%] lg:px-[12%] pt-12 pb-6 snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {clientStories.map((client, index) => {
            const isActive = index === selected;
            return (
              <div
                key={client.id}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className="min-w-0 shrink-0 grow-0 snap-center w-[90%] sm:w-[84%] lg:w-[78%] xl:w-[72%]"
              >
                <article
                  className={`relative rounded-[2rem] border transition-all duration-500 ease-out ${
                    isActive
                      ? "bg-white/90 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-700 shadow-xl shadow-navy/5 opacity-100"
                      : "bg-white/50 dark:bg-slate-900/40 border-transparent opacity-45 scale-[0.985]"
                  }`}
                >
                  {/* Sticky on the card corner — not on the reel */}
                  {isActive && (
                    <StickyNote
                      tone="yellow"
                      rotate="3deg"
                      delay="0.1s"
                      className="absolute -top-5 right-4 sm:right-6 lg:right-8 z-20 w-[108px] sm:w-[118px]"
                    >
                      <p className="font-hand text-base sm:text-lg leading-tight">
                        {client.industry.toLowerCase()}
                        <br />
                        <span className="text-coral-dark text-sm sm:text-[15px]">
                          love this one
                        </span>
                      </p>
                    </StickyNote>
                  )}
                  <div className="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-8 lg:gap-12 xl:gap-16 p-6 sm:p-8 lg:p-10 xl:p-12 items-start">
                    <div className="relative mx-auto w-full max-w-[320px]">
                      <ReelPlayer client={client} isActive={isActive} />
                    </div>
                    <div
                      className={`transition-all duration-500 ease-out ${
                        isActive
                          ? "opacity-100 translate-y-0"
                          : "opacity-70 translate-y-1"
                      }`}
                    >
                      <ClientInfo
                        client={client}
                        index={index}
                        total={total}
                      />
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-[10%] sm:w-[12%] bg-gradient-to-r from-[#FFF7F3] via-[#FFF7F3]/85 to-transparent dark:from-slate-950 dark:via-slate-950/85" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[10%] sm:w-[12%] bg-gradient-to-l from-[#FFF7F3] via-[#FFF7F3]/85 to-transparent dark:from-slate-950 dark:via-slate-950/85" />
      </div>

      {/* Big, obvious prev / next under the card */}
      <div className="relative z-10 mx-auto mt-6 max-w-3xl px-6 lg:px-8">
        <div className="flex items-stretch gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => goTo(selected - 1)}
            disabled={!canPrev}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3 py-3.5 text-left transition-all duration-300 hover:border-coral hover:shadow-md disabled:pointer-events-none disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-coral"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-navy transition-colors group-hover:bg-coral group-hover:text-white dark:bg-slate-800 dark:text-white">
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Previous
              </span>
              <span className="flex items-center gap-2 min-w-0">
                {canPrev && clientStories[selected - 1].logo && (
                  <img
                    src={clientStories[selected - 1].logo}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                  />
                )}
                <span className="block truncate text-sm font-semibold text-navy dark:text-white">
                  {canPrev ? clientStories[selected - 1].name : "—"}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => goTo(selected + 1)}
            disabled={!canNext}
            className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-2xl border-2 border-coral/40 bg-coral px-3 py-3.5 text-right text-white shadow-md shadow-coral/25 transition-all duration-300 hover:bg-coral-dark hover:shadow-lg disabled:pointer-events-none disabled:opacity-35"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/75">
                Next story
              </span>
              <span className="flex items-center justify-end gap-2 min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {canNext ? clientStories[selected + 1].name : "—"}
                </span>
                {canNext && clientStories[selected + 1].logo && (
                  <img
                    src={clientStories[selected + 1].logo}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover border border-white/30"
                  />
                )}
              </span>
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {clientStories.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show ${c.name}`}
                aria-current={i === selected ? "true" : undefined}
                className={`overflow-hidden rounded-full border-2 transition-all duration-300 ${
                  i === selected
                    ? "h-10 w-10 border-coral shadow-md shadow-coral/25 scale-110"
                    : "h-8 w-8 border-slate-200 opacity-60 hover:opacity-100 hover:border-coral/50 dark:border-slate-600"
                }`}
              >
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-navy dark:bg-slate-800 dark:text-white">
                    {c.name.slice(0, 1)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-center font-hand text-xl text-slate-400 dark:text-slate-500 select-none">
            <span className="tabular-nums text-sm font-bold text-navy dark:text-white not-italic font-sans mr-2">
              {pad(selected + 1)}/{pad(total)}
            </span>
            currently starring:{" "}
            <span className="text-coral">{activeClient?.name}</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes storyNoteFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .story-note-float {
          animation: storyNoteFloat 5.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .story-note-float { animation: none; }
        }
      `}</style>
    </section>
  );
};
