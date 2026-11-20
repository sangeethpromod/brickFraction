import { MapPin } from "lucide-react";
import Link from "next/link";
import { PropertyImage } from "@/components/molecules/PropertyImage";
import { shortDate, type Fmt, type Offering } from "@/lib/portfolio";

export const marketHref = (id: string) => `/investor/marketplace/${id}`;

export function OfferingCard({ o, fmt }: { o: Offering; fmt: Fmt }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-sm border border-line bg-surface">
      <PropertyImage src={o.image} alt={o.name} className="h-40 shrink-0" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl leading-tight">{o.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-grey"><MapPin size={12} strokeWidth={1.5} aria-hidden="true" />{o.city}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm tabular-nums">
          <div><dt className="text-xs text-grey">Price / Share</dt><dd>{fmt(o.pricePerShare, 2)}</dd></div>
          <div><dt className="text-xs text-grey">Minimum</dt><dd>{fmt(o.minInvestment)}</dd></div>
          <div><dt className="text-xs text-grey">{o.kind === "primary" ? "Target yield" : "Hist. yield"}</dt><dd>{o.yieldPct == null ? "Not published" : `${o.yieldPct.toFixed(1)}%`}</dd></div>
        </dl>
        {/* Fixed-height slot keeps primary and resale cards the same height. */}
        <div className="mt-4 h-9">
          {o.kind === "primary" && o.fundedPct != null && (
            <>
              <div className="h-1 rounded-full bg-line" role="progressbar" aria-valuenow={o.fundedPct} aria-valuemin={0} aria-valuemax={100} aria-label="Funding progress">
                <div className="h-full rounded-full bg-bronze" style={{ width: `${Math.min(o.fundedPct, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-grey">{o.fundedPct}% funded{o.closesAt ? ` · closes ${shortDate(o.closesAt)}` : ""}</p>
            </>
          )}
          {o.kind === "resale" && <p className="text-xs text-grey">Secondary-market listing from an existing holder.</p>}
        </div>
        <Link
          href={marketHref(o.id)}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-sm bg-charcoal px-4 text-sm font-medium text-ivory transition-colors duration-200 hover:bg-bronze focus-visible:outline-2 focus-visible:outline-bronze"
        >
          {o.kind === "primary" ? "View investment" : "View listing"}
        </Link>
      </div>
    </li>
  );
}
