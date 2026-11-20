import { MetricCard } from "@/components/molecules/MetricCard";
import { ActionButton } from "@/components/account/ActionButton";
import { blockReason } from "@/components/account/AccountBanner";
import { claimable, tusd, type Account } from "@/lib/account";
import { holdingValue, money, pct, totals } from "@/lib/portfolio";

export function PortfolioSummary({ a }: { a: Account }) {
  const m = (n: number) => money(n, a.assetCurrency);
  const t = totals(a);
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
  const rent12 = a.rentHistory.filter((r) => Date.parse(`${r.month}-01`) >= cutoff.getTime()).reduce((s, r) => s + Object.values(r.byProperty).reduce((x, v) => x + v, 0), 0);
  const live = a.holdings.filter((h) => h.status !== "funding");
  const liveValue = live.reduce((s, h) => s + holdingValue(h), 0);
  const annualRent = live.reduce((s, h) => s + (h.monthlyNetRent ?? 0) * 12, 0);
  const claim = claimable(a), block = blockReason(a.wallet.allowlist);
  return (
    <section aria-labelledby="sum" className="rounded-sm border border-line bg-surface p-6 sm:p-8">
      <h2 id="sum" className="text-[13px] font-medium tracking-[0.08em] text-grey uppercase">Portfolio value <span className="font-normal normal-case tracking-normal">· units × current NAV</span></h2>
      <p className="mt-3 font-serif text-[clamp(40px,6vw,56px)] leading-none tracking-[-0.02em] tabular-nums">{m(t.value)}</p>
      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-6 lg:grid-cols-4">
        <MetricCard label="Total invested" value={m(t.invested)} note="Acquisition cost incl. subscriptions" />
        <MetricCard label="Unrealised gain / loss" value={<span className={t.gain >= 0 ? "text-gain" : "text-loss"}>{t.gain >= 0 ? "+" : "−"}{m(Math.abs(t.gain))}</span>} note={`${pct(t.gainPct)} vs invested`} />
        <MetricCard label="Rent earned" value={m(t.rent)} note={`All time · ${m(rent12)} in the last 12 months`} />
        <MetricCard label="Blended yield" value={liveValue ? `${((annualRent / liveValue) * 100).toFixed(1)}%` : "—"} note="Annualised net rent ÷ value, operating properties" />
      </dl>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div><p className="text-xs text-grey">Claimable rent now</p><p className={`text-xl font-medium tabular-nums ${claim > 0 ? "text-bronze" : ""}`}>{tusd(claim)}</p></div>
        <ActionButton label="Claim rent" reason={block ?? (claim > 0 ? null : "Nothing to claim")} primary />
      </div>
    </section>
  );
}
