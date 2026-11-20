"use client";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Section, Unavailable, linkCls } from "@/components/molecules/Section";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { propertyHref } from "@/components/organisms/TopProperty";
import { holdingValue, ownershipPct, pct, type Fmt, type Holding } from "@/lib/portfolio";

type View = "Cards" | "Table";

function figures(h: Holding, fmt: Fmt) {
  const value = holdingValue(h), gain = value - h.acquisitionCost;
  return {
    value: fmt(value), cost: fmt(h.acquisitionCost), nav: fmt(h.navPerShare, 2), rent: fmt(h.rentEarned),
    gain: `${gain >= 0 ? "+" : "−"}${fmt(Math.abs(gain))} (${pct((gain / h.acquisitionCost) * 100)})`, up: gain >= 0,
    own: `${ownershipPct(h).toFixed(2)}%`, shares: `${h.sharesOwned.toLocaleString("en-IN")} / ${h.sharesIssued.toLocaleString("en-IN")}`,
  };
}

export function PropertyInvestments({ holdings, fmt }: { holdings: Holding[]; fmt: Fmt }) {
  const [view, setView] = useState<View>("Cards");
  return (
    <Section id="inv" title="My property investments" aside={<TimeRangeSelector<View> value={view} onChange={setView} options={["Cards", "Table"]} label="View" />}>
      {holdings.length === 0 ? (
        <Unavailable what="Property holdings" hint="you don't own any Shares yet." />
      ) : view === "Cards" ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {holdings.map((h) => {
            const f = figures(h, fmt);
            return (
              <li key={h.id} className="flex flex-col rounded-sm border border-line bg-surface p-5">
                <Link href={propertyHref(h.id)} className="font-serif text-xl leading-tight hover:text-bronze focus-visible:outline-2 focus-visible:outline-bronze">{h.name}</Link>
                <p className="mt-1 text-xs text-grey">{h.city}</p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm tabular-nums">
                  <div><dt className="text-xs text-grey">Current value</dt><dd className="text-lg font-medium">{f.value}</dd></div>
                  <div><dt className="text-xs text-grey">Ownership</dt><dd className="text-lg">{f.own}</dd></div>
                  <div><dt className="text-xs text-grey">Unrealised</dt><dd className={f.up ? "text-gain" : "text-loss"}>{f.gain}</dd></div>
                  <div><dt className="text-xs text-grey">Rent earned</dt><dd>{f.rent}</dd></div>
                </dl>
                <details className="group mt-4 border-t border-line pt-3 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-grey hover:text-charcoal focus-visible:outline-2 focus-visible:outline-bronze">
                    More details <ChevronDown size={14} strokeWidth={1.5} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 tabular-nums">
                    <div><dt className="text-xs text-grey">Token</dt><dd className="text-bronze">{h.token}</dd></div>
                    <div><dt className="text-xs text-grey">Unit</dt><dd>{h.unit}</dd></div>
                    <div><dt className="text-xs text-grey">Shares (of issued)</dt><dd>{f.shares}</dd></div>
                    <div><dt className="text-xs text-grey">Acquisition cost</dt><dd>{f.cost}</dd></div>
                    <div><dt className="text-xs text-grey">Latest NAV / Share</dt><dd>{f.nav}</dd></div>
                  </dl>
                </details>
                <div className="mt-auto flex items-center gap-4 pt-4">
                  <Link href={propertyHref(h.id)} className={linkCls}>View details</Link>
                  {h.canSell && <Link href={`${propertyHref(h.id)}?action=sell`} className={`${linkCls} inline-flex items-center gap-1`}><ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />Sell shares</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey">
              <tr className="border-b border-line">
                {["Property", "Token", "Shares (of issued)", "Own", "Cost", "NAV / Share", "Value", "Unrealised", "Rent earned"].map((c, i) => (
                  <th key={c} scope="col" className={`px-4 py-3 font-medium ${i > 1 ? "text-right" : ""}`}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const f = figures(h, fmt);
                return (
                  <tr key={h.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3"><Link href={propertyHref(h.id)} className="font-medium hover:text-bronze focus-visible:outline-2 focus-visible:outline-bronze">{h.name}</Link><span className="block text-xs text-grey">{h.unit} · {h.city}</span></td>
                    <td className="px-4 py-3 text-bronze">{h.token}</td>
                    <td className="px-4 py-3 text-right">{f.shares}</td>
                    <td className="px-4 py-3 text-right">{f.own}</td>
                    <td className="px-4 py-3 text-right">{f.cost}</td>
                    <td className="px-4 py-3 text-right">{f.nav}</td>
                    <td className="px-4 py-3 text-right font-medium">{f.value}</td>
                    <td className={`px-4 py-3 text-right ${f.up ? "text-gain" : "text-loss"}`}>{f.gain}</td>
                    <td className="px-4 py-3 text-right">{f.rent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
