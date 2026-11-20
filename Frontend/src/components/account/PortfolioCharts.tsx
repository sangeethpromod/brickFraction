"use client";
import { useState } from "react";
import { Section } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { PerformanceChart } from "@/components/organisms/PerformanceChart";
import { type Account } from "@/lib/account";
import { holdingValue, money, monthLabel } from "@/lib/portfolio";

const SHADES = ["bg-bronze", "bg-charcoal", "bg-grey/50", "bg-bronze/40", "bg-charcoal/40"];

export function PortfolioCharts({ a }: { a: Account }) {
  const m = (n: number) => money(n, a.assetCurrency);
  const [by, setBy] = useState<"Property" | "City">("Property");
  const slices = Object.entries(a.holdings.reduce<Record<string, number>>((acc, h) => { const k = by === "Property" ? h.name : h.city; acc[k] = (acc[k] ?? 0) + holdingValue(h); return acc; }, {})).sort((x, y) => y[1] - x[1]);
  const total = slices.reduce((s, [, v]) => s + v, 0) || 1;
  const monthly = a.rentHistory.map((r) => ({ month: r.month, v: Object.values(r.byProperty).reduce((s, x) => s + x, 0) }));
  const max = Math.max(...monthly.map((x) => x.v), 1);
  const cities = new Set(a.holdings.map((h) => h.city)).size > 1;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <figure className="rounded-sm border border-line bg-surface p-5">
        <figcaption className="mb-4 text-xs text-grey">Monthly rent income (asset currency, net)</figcaption>
        {monthly.length === 0 ? <p className="text-sm text-grey">No rent received yet.</p> : (
          <div className="flex h-44 items-end gap-2 sm:gap-4">
            {monthly.map((x) => (
              <div key={x.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center" title={`${monthLabel(x.month)}: ${m(x.v)}`}>
                <span className="mb-1 truncate text-[10px] text-grey tabular-nums">{m(x.v)}</span>
                <div className="rounded-t-sm bg-bronze" style={{ height: `${(x.v / max) * 80}%` }} />
                <span className="mt-2 text-[11px] text-grey">{monthLabel(x.month)}</span>
              </div>
            ))}
          </div>
        )}
      </figure>
      <figure className="rounded-sm border border-line bg-surface p-5">
        <figcaption className="mb-4 flex items-center justify-between text-xs text-grey">Allocation by value (NAV){cities && <TimeRangeSelector<"Property" | "City"> value={by} onChange={setBy} options={["Property", "City"]} label="Group by" />}</figcaption>
        <div className="flex h-3 overflow-hidden rounded-sm" role="img" aria-label="Allocation">
          {slices.map(([k, v], i) => <div key={k} className={SHADES[i % SHADES.length]} style={{ width: `${(v / total) * 100}%` }} />)}
        </div>
        <ul className="mt-4 flex flex-col gap-2 text-sm tabular-nums">
          {slices.map(([k, v], i) => <li key={k} className="flex justify-between gap-2"><span className="flex items-center gap-2"><span className={`size-2.5 rounded-sm ${SHADES[i % SHADES.length]}`} />{k}</span><span>{m(v)} <span className="text-grey">· {((v / total) * 100).toFixed(0)}%</span></span></li>)}
        </ul>
      </figure>
    </div>
  );
}
export function ChartsSection({ a }: { a: Account }) { return <Section id="charts" title="Income & allocation"><PortfolioCharts a={a} /></Section>; }
// Client wrapper: the formatter is a function, which a server page can't pass to a client chart.
export function ValueChart({ a }: { a: Account }) { return <PerformanceChart history={a.history} fmt={(n, d = 0) => money(n, a.assetCurrency, d)} title="Value over time" />; }
