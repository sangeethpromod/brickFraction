import { AlertTriangle } from "lucide-react";
import { Section } from "@/components/molecules/Section";
import { money, shortDate } from "@/lib/portfolio";
import { equity, isStale, navPerUnit, type PropertyDetail } from "@/lib/property";

export function PropertyValuation({ p }: { p: PropertyDetail }) {
  const m = (n: number, d = 0) => money(n, p.currency, d);
  const v = p.valuation, isNew = p.status === "new-offering", nav = navPerUnit(p);
  const rows: [string, string, string?][] = [
    ["Appraised value", m(v.appraisedValue)],
    ["− Debt", m(v.debt)],
    ["+ Cash reserves", m(v.reserves)],
    ["− Other liabilities", m(v.liabilities)],
    ["= Equity value", m(equity(v)), "font-medium border-t border-line"],
    [`÷ ${p.unitsTotal.toLocaleString("en-IN")} units`, `${m(nav, 2)} per unit`, "font-medium"],
  ];
  const vals = p.appraisals.map((a) => a.value), lo = Math.min(...vals), span = Math.max(...vals) - lo || 1;
  const pts = p.appraisals.map((a, i) => `${p.appraisals.length > 1 ? (i / (p.appraisals.length - 1)) * 100 : 50},${90 - ((a.value - lo) / span) * 80}`).join(" ");
  const trade = p.lastTradePrice;
  return (
    <Section id="val" title={isNew ? "Price & underwriting valuation" : "Price & valuation"}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-line bg-surface p-5">
          <h3 className="mb-3 text-xs text-grey">How the unit price is built</h3>
          <dl className="text-sm tabular-nums">
            {rows.map(([k, val, cls]) => <div key={k} className={`flex justify-between py-2 ${cls ?? ""}`}><dt className="text-grey">{k}</dt><dd>{val}</dd></div>)}
          </dl>
        </div>
        <div className="rounded-sm border border-line bg-surface p-5">
          <h3 className="mb-3 text-xs text-grey">Offering price vs NAV vs last trade</h3>
          <dl className="grid grid-cols-3 gap-3 text-sm tabular-nums">
            <div><dt className="text-xs text-grey">Offering price</dt><dd className="text-lg">{m(p.offeringPrice, 2)}</dd></div>
            <div><dt className="text-xs text-grey">Current NAV</dt><dd className="text-lg">{isNew ? "None yet" : m(nav, 2)}</dd></div>
            <div><dt className="text-xs text-grey">Last trade</dt><dd className="text-lg">{trade ? m(trade, 2) : "No trades"}</dd></div>
          </dl>
          {trade && !isNew && <p className="mt-3 text-xs text-grey">Last trade is {Math.abs((trade / nav - 1) * 100).toFixed(1)}% {trade >= nav ? "above (premium to)" : "below (discount to)"} NAV. The secondary market can differ from NAV.</p>}
          {isNew && <p className="mt-3 text-xs text-grey">Price is fixed at the offering price until the first post-close valuation.</p>}
        </div>
      </div>
      <div className="rounded-sm border border-line bg-surface p-5">
        <div className="flex items-center justify-between"><h3 className="text-xs text-grey">Appraisal history</h3>
          {isStale(p) && <span className="flex items-center gap-1 text-xs text-loss"><AlertTriangle size={13} strokeWidth={1.5} aria-hidden="true" />Stale: older than {p.staleAfterMonths} months</span>}
        </div>
        {p.appraisals.length > 1 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-3 h-24 w-full" role="img" aria-label="Appraised value over time">
            <polyline points={pts} fill="none" stroke="#191a19" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <table className="mt-3 w-full text-left text-sm tabular-nums">
          <thead className="text-xs text-grey"><tr><th scope="col" className="py-1 font-medium">Date</th><th scope="col" className="py-1 font-medium">Source</th><th scope="col" className="py-1 text-right font-medium">Appraised value</th></tr></thead>
          <tbody>{[...p.appraisals].reverse().map((a) => <tr key={a.date} className="border-t border-line"><td className="py-2">{shortDate(a.date)}</td><td className="py-2 text-grey">{a.source}</td><td className="py-2 text-right">{m(a.value)}</td></tr>)}</tbody>
        </table>
        {p.appraisals.length > 1 && <p className="mt-2 text-xs text-grey">A valuation rise lifts NAV and shows as unrealised gain only; rent is unaffected.</p>}
      </div>
    </Section>
  );
}
