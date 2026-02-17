import { brands } from "../data/mock";

export const BrandsSection = () => {
  const allBrands = [...brands, ...brands, ...brands];

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-10">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-navy">
          Brands We Worked With
        </h2>
      </div>

      {/* Marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex animate-bh-marquee">
          {allBrands.map((brand, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-4 px-8 py-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-coral/20 hover:shadow-md transition-all duration-300"
            >
              <span className="text-base font-bold text-slate-400 hover:text-coral transition-colors duration-300 whitespace-nowrap">
                {brand}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
