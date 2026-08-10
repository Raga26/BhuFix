import { clientStories } from "../data/mock";

const brands = clientStories.map((c) => ({
  id: c.id,
  name: c.name,
  industry: c.industry,
  place: c.location.split(",")[0],
  logo: c.logo,
}));

const BrandChip = ({ brand }) => (
  <div className="group flex items-center gap-4 px-1">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-sm transition-all duration-300 group-hover:border-coral/40 group-hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
      {brand.logo ? (
        <img
          src={brand.logo}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <span className="text-xs font-bold tracking-wide text-navy dark:text-white">
          {brand.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
    <div className="min-w-0">
      <p className="whitespace-nowrap text-[15px] font-semibold text-navy transition-colors duration-300 group-hover:text-coral dark:text-white">
        {brand.name}
      </p>
      <p className="mt-0.5 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
        {brand.industry}
        <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
        {brand.place}
      </p>
    </div>
  </div>
);

export const BrandsSection = () => {
  // Tripled to match animate-bh-marquee (-33.333% loop)
  const loop = [...brands, ...brands, ...brands];

  return (
    <section
      className="relative overflow-hidden py-16 lg:py-20"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #FFF9F6 50%, #ffffff 100%)",
      }}
    >
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-coral/20 to-transparent" />

      <div className="relative z-10 mx-auto mb-10 max-w-7xl px-6 text-center lg:mb-12 lg:px-8">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
          Partners
        </span>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight text-navy dark:text-white sm:text-3xl">
          Trusted by growing brands
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Local businesses we help look sharper, sound clearer, and show up
          online with confidence.
        </p>
      </div>

      {/* Marquee */}
      <div className="relative z-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#FFF9F6] to-transparent dark:from-slate-950 sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#FFF9F6] to-transparent dark:from-slate-950 sm:w-28" />

        <div className="group flex overflow-hidden motion-reduce:overflow-x-auto">
          <div className="flex min-w-max animate-bh-marquee items-center gap-10 py-2 pr-10 motion-reduce:animate-none group-hover:[animation-play-state:paused] sm:gap-14">
            {loop.map((brand, i) => (
              <div key={`${brand.id}-${i}`} className="flex items-center gap-10 sm:gap-14">
                <BrandChip brand={brand} />
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral/35"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-8 text-center text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500">
        Jewellery · Events · Fitness · Beauty
        <span className="mx-2 text-coral/50">&amp;</span>
        more
      </p>
    </section>
  );
};
