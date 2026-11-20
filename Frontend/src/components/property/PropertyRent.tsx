"use client";
import { useState } from "react";
import { MetricCard } from "@/components/molecules/MetricCard";
import { Section } from "@/components/molecules/Section";
import { money, monthLabel, shortDate } from "@/lib/portfolio";
import { distributable, grossYieldPct, netYieldPct, opex, type PropertyDetail, type RentMonth } from "@/lib/property";

const pctOrDash = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);

export function PropertyRent({ p }: { p: PropertyDetail }) {
  const m = (n: number, d = 0) => money(n, p.currency, d);
  const [sel, setSel] = useState(Math.max(p.rent.length - 1, 0));
  const o = p.offering;
  if (!p.rent.length)
    return (
      <Section id="rent" title="Rent">
        <div className="rounded-sm border border-line bg-surface p-5 text-sm">
          <p className="font-medium">No rent history yet</p>
          {o && <p className="mt-2 text-grey tabular-nums">Projected, not actual: about {m(o.projectedMonthlyRent)} gross rent per month, {o.projectedNetYieldPct}% net yield. Projections are estimates and are not guaranteed.</p>}
          {p.unsoldRentGoesTo && <p className="mt-2 text-grey">Rent attributable to unsold units goes to the {p.unsoldRentGoesTo === "issuer" ? "issuer" : "property reserves"}.</p>}
        </div>
      </Section>
    );

  const max = Math.max(...p.rent.map(distributable), 1);
  const r: RentMonth = p.rent[sel];
  const dist = distributable(r);
  const lines: [string, number, boolean?][] = [
    ["Gross rent", r.gross], ["Vacancy loss", -r.vacancyLoss], ["Property tax", -r.tax], ["Insurance", -r.insurance], ["Maintenance", -r.maintenance], ["Management", -r.management],
    ...(r.special ? [[r.special.label, -r.special.amount] as [string, number]] : []),
    ["Debt service", -r.debtService], ["Reserve top-up", -r.reserveTopUp], ["Platform fee", -r.platformFee],
  ];
  return (
    <Section id="rent" title="Rent & distributions">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-sm border border-line bg-surface p-5 sm:grid-cols-4">
        <MetricCard size="sm" label="Occupancy" value={p.occupancy ?? "Not reported"} />
        <MetricCard size="sm" label="Gross yield" value={pctOrDash(grossYieldPct(p))} note="Gross rent ÷ appraised value" />
        <MetricCard size="sm" label="Net yield" value={pctOrDash(netYieldPct(p))} note="Distributable ÷ equity value" />
        <MetricCard size="sm" label="Distributions" value={p.distributionsPaused ? "Paused" : "Active"} />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <figure className="rounded-sm border border-line bg-surface p-5">
          <figcaption className="mb-4 text-xs text-grey">Monthly distributable rent (select a month)</figcaption>
          <div className="flex h-40 items-end gap-2">
            {p.rent.map((x, i) => {
              const d = distributable(x), refi = p.debt?.refinanced.some((f) => f.date.slice(0, 7) === x.month);
              return (
                <button key={x.month} type="button" onClick={() => setSel(i)} aria-pressed={i === sel} aria-label={`${monthLabel(x.month)}: ${d > 0 ? m(d) : "no distribution"}`} className="flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end text-center focus-visible:outline-2 focus-visible:outline-bronze">
                  <span className="mb-1 truncate text-[10px] text-grey tabular-nums">{d > 0 ? m(d) : x.status === "due" ? "Due" : "None"}</span>
                  {d > 0 ? <div className={`rounded-t-sm ${i === sel ? "bg-bronze" : "bg-charcoal/70"}`} style={{ height: `${(d / max) * 75}%` }} /> : <div className="h-px bg-line" />}
                  <span className="mt-2 text-[11px] text-grey">{monthLabel(x.month)}{refi ? " ◆" : ""}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-grey">{p.debt?.refinanced.length ? "◆ debt refinanced. " : ""}Zero-rent months show “None”; unpaid rent shows “Due”.</p>
        </figure>

        <div className="rounded-sm border border-line bg-surface p-5">
          <h3 className="mb-3 text-xs text-grey">Distribution waterfall · {monthLabel(r.month)}</h3>
          {r.status !== "paid" ? (
            <p className="text-sm">{r.status === "due" ? "Rent due, not received. The distribution is delayed, not skipped." : "No distribution: the property was vacant."}</p>
          ) : (
            <dl className="text-sm tabular-nums">
              {lines.filter(([, v]) => v !== 0).map(([k, v]) => <div key={k} className="flex justify-between py-1"><dt className="text-grey">{k}</dt><dd>{v < 0 ? "−" : ""}{m(Math.abs(v))}</dd></div>)}
              <div className="mt-1 flex justify-between border-t border-line py-2 font-medium"><dt>Distributable</dt><dd>{m(dist)}</dd></div>
              <div className="flex justify-between"><dt className="text-grey">Per unit ({p.unitsTotal.toLocaleString("en-IN")} units)</dt><dd>{m(dist / p.unitsTotal, 2)}</dd></div>
              <p className="mt-2 text-xs text-grey">Operating costs total {m(opex(r))}.</p>
            </dl>
          )}
        </div>
      </div>

      {p.leases.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey"><tr className="border-b border-line">{["Tenant", "Term", "Expiry", "Monthly rent"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i === 3 ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>{p.leases.map((l) => <tr key={l.tenant} className="border-b border-line last:border-0"><td className="px-4 py-3">{l.tenant}</td><td className="px-4 py-3">{l.term}</td><td className="px-4 py-3">{shortDate(l.expiry)}</td><td className="px-4 py-3 text-right">{m(l.monthlyRent)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      <div className="rounded-sm border border-line bg-surface p-5 text-sm">
        {p.claim && (
          <dl className="mb-3 grid grid-cols-3 gap-4 tabular-nums">
            <MetricCard size="sm" label="Claimed (you)" value={m(p.claim.claimed)} />
            <MetricCard size="sm" label="Unclaimed (you)" value={m(p.claim.unclaimed)} />
            <MetricCard size="sm" label="Claim expiry" value={p.claim.expiresAt ? shortDate(p.claim.expiresAt) : "No expiry"} />
          </dl>
        )}
        {p.claim && <p className="text-xs text-grey">{p.claim.onExpiry}</p>}
        <p className="mt-1 text-xs text-grey">{p.recordDateNote}</p>
        {p.unsoldRentGoesTo && <p className="mt-1 text-xs text-grey">Rent for unsold units goes to the {p.unsoldRentGoesTo === "issuer" ? "issuer" : "property reserves"}.</p>}
      </div>
    </Section>
  );
}
