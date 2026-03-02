import { clients } from "../data/mock";
import { Handshake } from "lucide-react";

export const BrandsSection = () => {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">
            Trusted by Growing Brands
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Some of the businesses we've helped grow their digital presence
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {clients.map((client, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-6 py-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-coral/20 hover:shadow-md transition-all duration-300 group"
            >
              <Handshake className="h-5 w-5 text-slate-300 group-hover:text-coral transition-colors duration-300 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-500 group-hover:text-navy transition-colors duration-300 whitespace-nowrap">
                {client}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-coral/5 border border-coral/10">
            <span className="text-sm font-semibold text-coral whitespace-nowrap">
              & more...
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
