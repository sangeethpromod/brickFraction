import { ChevronDown, Info } from "lucide-react";
import Link from "next/link";
import { Delta } from "@/components/molecules/Delta";
import { MetricCard } from "@/components/molecules/MetricCard";
import { TimeRangeSelector } from "@/components/molecules/TimeRangeSelector";
import { linkCls } from "@/components/molecules/Section";
import { money, pct, totals, type Fmt, type Portfolio } from "@/lib/portfolio";

type Props = { p: Portfolio; fmt: Fmt; display: string; onDisplay: (c: string) => void };

const RETURN_DEF = "Total return = (estimated value − acquisition cost + rental income) ÷ acquisition cost. Includes rent; excludes FX. Unrealised gain is valuation change only.";

export function PortfolioOverview({ p, fmt, display, onDisplay }: Props) {
  const t = totals(p);
  const currencies = [p.assetCurrency, ...Object.keys(p.fx).filter((c) => c !== p.assetCurrency)];
  const fx = display === p.assetCurrency ? null : p.fx[display];
  const pendingRent = p.distributions.filter((d) => d.status === "pending").reduce((s, d) => s + d.yourShare, 0);
  return (
    <section aria-labelledby="pv" className="rounded-sm border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="pv" className="text-[13px] font-medium tracking-[0.08em] text-grey uppercase">Portfolio value <span className="font-normal normal-case tracking-normal">· estimated, latest published NAV</span></h2>
          <p className="mt-3 font-serif text-[clamp(40px,6vw,64px)] leading-none tracking-[-0.02em] tabular-nums">{fmt(t.value)}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-grey">
            <span title={RETURN_DEF} className="inline-flex cursor-help items-center gap-1"><Info size={13} strokeWidth={1.5} aria-hidden="true" />Total return incl. rent {pct(t.returnPct)}</span>
            <span className="sr-only">{RETURN_DEF}</span>
          </p>
        </div>
        <div className="scale-90 origin-top-right"><TimeRangeSelector value={display} onChange={onDisplay} options={currencies} label="Display currency" /></div>
      </div>

      <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-3 sm:divide-x sm:divide-line [&>div]:sm:pl-6 [&>div:first-child]:sm:pl-0">
        <MetricCard label="Total invested" value={fmt(t.invested)} note="Acquisition cost" />
        <MetricCard label="Unrealised gain" value={<Delta text={fmt(Math.abs(t.gain))} pct={t.gainPct} />} note="Valuation change, not yet sold" />
        <MetricCard label="Lifetime rental income" value={fmt(t.rent)} note="Net rent attributed to your Shares" />
      </dl>

      <details className="group mt-6 border-t border-line pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-grey hover:text-charcoal focus-visible:outline-2 focus-visible:outline-bronze">
          Portfolio details <ChevronDown size={16} strokeWidth={1.5} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard size="sm" label="Properties" value={p.holdings.length} />
          <MetricCard size="sm" label="Shares held" value={t.shares.toLocaleString("en-IN")} />
          <MetricCard size="sm" label="Pending rent" value={fmt(pendingRent)} note="Deposited, not yet claimable" />
          <MetricCard size="sm" label={`Asset valuation (${p.assetCurrency})`} value={money(t.value, p.assetCurrency)} />
          <MetricCard
            size="sm"
            label="FX impact"
            value={fx == null ? "None" : fx.impact == null ? "Unavailable" : `${fx.impact >= 0 ? "+" : "−"}${money(Math.abs(fx.impact), display)}`}
            note={fx ? `1 ${p.assetCurrency} = ${fx.rate} ${display}` : "Display = asset currency"}
          />
          <MetricCard
            size="sm"
            label="Cash available (tUSD)"
            value={p.tusdBalance == null ? "Unavailable" : money(p.tusdBalance, "USD")}
            note={<Link href="/investor/wallet" className={linkCls}>Open wallet</Link>}
          />
        </dl>
      </details>
    </section>
  );
}
