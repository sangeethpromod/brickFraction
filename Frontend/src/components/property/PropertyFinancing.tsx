import { MetricCard } from "@/components/molecules/MetricCard";
import { Section, Unavailable } from "@/components/molecules/Section";
import { money, shortDate } from "@/lib/portfolio";
import { dscr, ltvPct, runwayMonths, type PropertyDetail } from "@/lib/property";

export function PropertyReserves({ p }: { p: PropertyDetail }) {
  const m = (n: number) => money(n, p.currency);
  const r = p.reserves, bal = p.valuation.reserves, run = runwayMonths(p);
  return (
    <Section id="res" title="Reserves">
      {!r ? <Unavailable what="Reserve data" /> : (
        <div className="grid gap-4 rounded-sm border border-line bg-surface p-5 lg:grid-cols-2">
          <div>
            <dl className="grid grid-cols-3 gap-4 tabular-nums">
              <MetricCard size="sm" label="Balance" value={m(bal)} />
              <MetricCard size="sm" label={`Target (${r.targetMonths} months)`} value={m(r.target)} />
              <MetricCard size="sm" label="Funded" value={`${Math.round((bal / r.target) * 100)}%`} />
            </dl>
            <div className="mt-4 h-1 rounded-full bg-line" role="progressbar" aria-label="Reserve funded" aria-valuenow={Math.round((bal / r.target) * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-bronze" style={{ width: `${Math.min((bal / r.target) * 100, 100)}%` }} /></div>
            {run != null && <p className="mt-3 text-xs text-grey">Covers about {run.toFixed(1)} months of debt service and fixed costs with no rent.</p>}
          </div>
          <div>
            <h3 className="mb-2 text-xs text-grey">Inflows and outflows</h3>
            {r.log.length === 0 ? <p className="text-sm text-grey">No movements yet.</p> : (
              <ul className="divide-y divide-line text-sm tabular-nums">
                {r.log.map((l) => <li key={l.date + l.label} className="flex justify-between py-2"><span>{l.label} <span className="text-xs text-grey">{shortDate(l.date)}</span></span><span className={l.amount < 0 ? "text-loss" : "text-gain"}>{l.amount < 0 ? "−" : "+"}{m(Math.abs(l.amount))}</span></li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

export function PropertyDebt({ p }: { p: PropertyDetail }) {
  const d = p.debt, ratio = dscr(p);
  return (
    <Section id="debt" title="Debt">
      {!d ? <p className="rounded-sm border border-line bg-surface p-5 text-sm text-grey">This property carries no debt.</p> : (
        <div className="rounded-sm border border-line bg-surface p-5">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 tabular-nums sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard size="sm" label="Lender" value={d.lender} />
            <MetricCard size="sm" label="Principal" value={money(p.valuation.debt, p.currency)} />
            <MetricCard size="sm" label="Rate" value={`${d.ratePct}%`} />
            <MetricCard size="sm" label="Maturity" value={shortDate(d.maturity)} />
            <MetricCard size="sm" label={`LTV (max ${d.ltvCovenantPct}%)`} value={<span className={ltvPct(p) > d.ltvCovenantPct ? "text-loss" : ""}>{ltvPct(p).toFixed(1)}%</span>} />
            <MetricCard size="sm" label={`DSCR (min ${d.dscrCovenant})`} value={ratio == null ? "—" : <span className={ratio < d.dscrCovenant ? "text-loss" : ""}>{ratio.toFixed(2)}×</span>} />
          </dl>
          <p className="mt-4 text-sm tabular-nums"><span className="text-grey">Monthly debt service:</span> {money(d.monthlyService, p.currency)}</p>
          <p className="mt-2 text-xs text-grey"><span className="font-medium text-charcoal">On covenant breach:</span> {d.onBreach}</p>
          {d.refinanced.length > 0 && <ul className="mt-3 text-xs text-grey">{d.refinanced.map((f) => <li key={f.date}>◆ {shortDate(f.date)}: {f.note}</li>)}</ul>}
        </div>
      )}
    </Section>
  );
}
