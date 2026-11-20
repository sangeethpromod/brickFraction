import { AlertTriangle, MapPin } from "lucide-react";
import { money } from "@/lib/portfolio";
import { isStale, ltvPct, navPerUnit, type PropertyDetail } from "@/lib/property";

const STATUS = { "new-offering": "New offering", operating: "Operating", resale: "Resale only", "wind-up": "Wind-up" } as const;

export function PropertyHeader({ p }: { p: PropertyDetail }) {
  const m = (n: number, d = 0) => money(n, p.currency, d);
  const isNew = p.status === "new-offering";
  const price = isNew ? p.offeringPrice : (p.lastTradePrice ?? navPerUnit(p));
  const available = isNew ? p.unitsTotal - p.unitsSold : p.market.listings.reduce((s, l) => s + l.units, 0);
  const value = p.yours ? p.yours.units * navPerUnit(p) : 0;
  const gain = p.yours ? value - p.yours.cost : 0;
  return (
    <header className="rounded-sm border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.08em] uppercase">
        <span className="rounded-sm bg-charcoal px-2.5 py-1 text-ivory">{STATUS[p.status]}</span>
        <span className="rounded-sm border border-line px-2.5 py-1 text-grey">Simulated · testnet</span>
        <span className="text-grey">{p.propertyType}</span>
      </div>
      <h1 className="mt-4 font-serif text-4xl leading-[1.1] tracking-[-0.01em]">{p.name}</h1>
      <p className="mt-2 flex items-center gap-1 text-sm text-grey"><MapPin size={14} strokeWidth={1.5} aria-hidden="true" />{p.address}</p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
        <dl className="flex flex-wrap gap-x-10 gap-y-4 tabular-nums">
          <div><dt className="text-xs text-grey">{isNew ? "Offering price / unit" : p.lastTradePrice ? "Last trade / unit" : "NAV / unit"}</dt><dd className="text-2xl font-medium">{m(price, 2)}</dd></div>
          <div><dt className="text-xs text-grey">{isNew ? "Units remaining" : "Units listed for sale"}</dt><dd className="text-2xl font-medium">{available.toLocaleString("en-IN")}</dd></div>
          {p.yours && (
            <div>
              <dt className="text-xs text-grey">Your holding</dt>
              <dd className="text-2xl font-medium">{p.yours.units.toLocaleString("en-IN")} units</dd>
              {!isNew && <dd className={`text-xs ${gain >= 0 ? "text-gain" : "text-loss"}`}>{m(value)} · unrealised {gain >= 0 ? "+" : "−"}{m(Math.abs(gain))}</dd>}
            </div>
          )}
        </dl>
        <div>
          {/* Trading flow not built; disabled rather than pretending. */}
          <button type="button" disabled title="Trading isn't connected yet" className="h-11 rounded-sm bg-charcoal px-6 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-40">
            {isNew ? "Buy units" : "Trade"}
          </button>
          <p className="mt-1 text-xs text-grey">Not connected yet. Price, fees and availability are confirmed before any order.</p>
        </div>
      </div>
    </header>
  );
}

// Warnings that change how every number below should be read.
export function PropertyAlerts({ p }: { p: PropertyDetail }) {
  const latest = p.rent[p.rent.length - 1];
  const items: string[] = [];
  if (p.yours && p.yours.restrictedUnits > 0) items.push(`${p.yours.restrictedUnits.toLocaleString("en-IN")} of your units are restricted (frozen wallet or recovery). They cannot be traded or claimed until released.`);
  if (p.debt && ltvPct(p) > p.debt.ltvCovenantPct) items.push(`Loan-to-value is ${ltvPct(p).toFixed(0)}% against a ${p.debt.ltvCovenantPct}% covenant. ${p.debt.onBreach}`);
  else if (p.distributionsPaused) items.push("Distributions are paused.");
  if (latest?.status === "due") items.push("Rent due, not received for the latest month. The distribution is delayed, not skipped.");
  if (latest?.status === "vacant") items.push("The property is vacant: no distribution this month. Reserves cover costs.");
  if (isStale(p)) items.push(`The last appraisal is older than ${p.staleAfterMonths} months. NAV may not reflect the current market.`);
  if (p.windUp) items.push(`The property is being wound up. Units are redeemable for tUSD${p.windUp.finalDistribution != null ? ` with a final distribution of ${money(p.windUp.finalDistribution, p.currency)}` : ""}.`);
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t) => (
        <li key={t} role="alert" className="flex gap-3 rounded-sm border border-loss/30 bg-loss/5 px-4 py-3 text-sm">
          <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-loss" aria-hidden="true" />{t}
        </li>
      ))}
    </ul>
  );
}
