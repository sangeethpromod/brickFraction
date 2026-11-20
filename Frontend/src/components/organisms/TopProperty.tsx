import Link from "next/link";
import { MetricCard } from "@/components/molecules/MetricCard";
import { ownershipPct, yieldPct, type Fmt, type Holding } from "@/lib/portfolio";

export const propertyHref = (id: string) => `/investor/marketplace/${id}`;

// Editorial feature card: photograph with the name set on it, metrics on a quiet surface below. Whole card is one link.
export function TopProperty({ property: p, fmt }: { property: Holding; fmt: Fmt }) {
  const y = yieldPct(p);
  return (
    <Link
      href={propertyHref(p.id)}
      className="group block overflow-hidden rounded-sm border border-line bg-surface transition-colors duration-200 hover:border-bronze focus-visible:outline-2 focus-visible:outline-bronze"
    >
      <div className="relative flex aspect-[16/10] items-end bg-charcoal bg-cover bg-center p-6 text-ivory transition-transform duration-500" style={{ backgroundImage: `linear-gradient(to top, rgba(23,25,24,0.8), rgba(23,25,24,0) 60%)${p.image ? `, url(${p.image})` : ""}` }}>
        <span className="absolute top-4 left-4 rounded-sm bg-charcoal/60 px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase backdrop-blur-sm">Top earner</span>
        <div>
          <h3 className="font-serif text-3xl leading-tight">{p.name}</h3>
          <p className="mt-1 text-sm text-ivory/80">{p.city} · {p.unit}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-6">
        <MetricCard label="Monthly net income" value={p.monthlyNetRent == null ? "Unavailable" : fmt(p.monthlyNetRent)} />
        <MetricCard label="Annualised yield" value={y == null ? "Unavailable" : `${y.toFixed(1)}%`} />
        <MetricCard label="You own" value={`${ownershipPct(p).toFixed(1)}%`} />
        <MetricCard label="Occupancy" value={p.occupancy ?? "Not reported"} />
      </dl>
    </Link>
  );
}
