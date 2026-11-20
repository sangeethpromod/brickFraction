import { MetricCard } from "@/components/molecules/MetricCard";
import { Section } from "@/components/molecules/Section";
import { money, shortDate } from "@/lib/portfolio";
import type { PropertyDetail } from "@/lib/property";

export function PropertyOwnership({ p }: { p: PropertyDetail }) {
  const m = (n: number, d = 0) => money(n, p.currency, d);
  const o = p.offering, remaining = p.unitsTotal - p.unitsSold;
  return (
    <Section id="own" title={o ? "Offering" : "Ownership & market"}>
      {o && (
        <div className="rounded-sm border border-line bg-surface p-5">
          <div className="h-1.5 rounded-full bg-line" role="progressbar" aria-label="Funding progress" aria-valuenow={o.fundedPct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-bronze" style={{ width: `${o.fundedPct}%` }} /></div>
          <p className="mt-2 text-sm tabular-nums">{o.fundedPct}% funded · closes {shortDate(o.closesAt)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard size="sm" label="Minimum raise" value={m(o.minRaise)} />
            <MetricCard size="sm" label="If minimum not met" value={o.refundIfNotMet ? "Refunded" : "Not refundable"} />
            <MetricCard size="sm" label="Lock-up" value={o.lockupMonths ? `${o.lockupMonths} months` : "None"} />
            <MetricCard size="sm" label="Price (fixed)" value={m(p.offeringPrice, 2)} />
          </dl>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-sm border border-line bg-surface p-5 tabular-nums sm:grid-cols-5">
        <MetricCard size="sm" label="Total units" value={p.unitsTotal.toLocaleString("en-IN")} />
        <MetricCard size="sm" label="Sold" value={p.unitsSold.toLocaleString("en-IN")} />
        <MetricCard size="sm" label={remaining ? "Held by issuer" : "Remaining"} value={remaining.toLocaleString("en-IN")} />
        <MetricCard size="sm" label="Holders" value={p.holderCount} />
        <MetricCard size="sm" label="Largest holder" value={p.topHolderPct == null ? "—" : `${p.topHolderPct}%`} note={p.holderCapPct ? `Cap ${p.holderCapPct}% per holder` : "No holder cap"} />
      </dl>
      {p.status !== "new-offering" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-sm border border-line bg-surface p-5 text-sm tabular-nums">
            <h3 className="mb-2 text-xs text-grey">Open listings</h3>
            {p.market.listings.length === 0 ? <p className="text-grey">No open listings.</p> : p.market.listings.map((l, i) => <p key={i} className="flex justify-between py-1"><span>{l.units.toLocaleString("en-IN")} units</span><span>{m(l.price, 2)} / unit</span></p>)}
          </div>
          <div className="rounded-sm border border-line bg-surface p-5 text-sm tabular-nums">
            <h3 className="mb-2 text-xs text-grey">Recent trades</h3>
            {p.market.trades.length === 0 ? <p className="text-grey">No trades yet.</p> : p.market.trades.map((t) => <p key={t.date} className="flex justify-between py-1"><span>{shortDate(t.date)} · {t.units.toLocaleString("en-IN")} units</span><span>{m(t.price, 2)}</span></p>)}
          </div>
        </div>
      )}
    </Section>
  );
}
