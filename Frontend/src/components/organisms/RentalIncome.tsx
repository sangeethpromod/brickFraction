import { MetricCard } from "@/components/molecules/MetricCard";
import { Section, Unavailable } from "@/components/molecules/Section";
import { monthLabel, type Distribution, type Fmt, type Holding, type RentMonth } from "@/lib/portfolio";

const SHADES = ["bg-bronze", "bg-charcoal", "bg-grey/50", "bg-bronze/40"]; // property series, in holding order
const STATUS: Record<Distribution["status"], { label: string; cls: string }> = {
  claimed: { label: "Claimed", cls: "text-gain" },
  claimable: { label: "Available", cls: "text-bronze" },
  pending: { label: "Pending", cls: "text-grey" },
};

type Props = { holdings: Holding[]; history: RentMonth[]; distributions: Distribution[]; fmt: Fmt; lifetime: number };

export function RentalIncome({ holdings, history, distributions, fmt, lifetime }: Props) {
  const monthTotal = (m: RentMonth) => Object.values(m.byProperty).reduce((s, v) => s + v, 0);
  const max = Math.max(...history.map(monthTotal), 1);
  const sum = (s: Distribution["status"]) => distributions.filter((d) => d.status === s).reduce((a, d) => a + d.yourShare, 0);
  const period = distributions[0]?.period;
  const byProp = holdings.map((h, i) => ({ h, shade: SHADES[i % SHADES.length], total: history.reduce((s, m) => s + (m.byProperty[h.id] ?? 0), 0) }));
  const claimable = sum("claimable");

  return (
    <Section id="rent" title="Rental income & distributions">
      <div className="grid gap-6 rounded-sm border border-line bg-surface p-5 sm:grid-cols-3 sm:items-start">
        <MetricCard label="Lifetime rental income" value={fmt(lifetime)} note="Rent received to date" />
        <div>
          <MetricCard label="Available to claim" value={<span className={claimable > 0 ? "text-bronze" : ""}>{fmt(claimable)}</span>} note={period ? `Distribution for ${monthLabel(period)}` : undefined} />
          {claimable > 0 && (
            <>
              {/* Claim needs the rent-per-share accumulator claim endpoint; disabled until it exists. */}
              <button type="button" disabled title="Claim API not available yet" className="mt-3 h-9 rounded-sm bg-charcoal px-4 text-sm font-medium text-ivory disabled:cursor-not-allowed disabled:opacity-40">Claim rent</button>
              <p className="mt-1 text-xs text-grey">Claiming isn&apos;t connected yet.</p>
            </>
          )}
        </div>
        <MetricCard label="Pending distributions" value={fmt(sum("pending"))} note="Deposited, not yet claimable" />
      </div>

      {history.length === 0 ? (
        <Unavailable what="Rental income history" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <figure className="rounded-sm border border-line bg-surface p-5">
            <figcaption className="mb-4 text-xs text-grey">Distribution history · monthly rent (your share, net)</figcaption>
            <div className="flex h-44 items-end gap-2 sm:gap-4">
              {history.map((m) => (
                <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center" title={`${monthLabel(m.month)}: ${fmt(monthTotal(m))}`}>
                  <span className="mb-1 truncate text-[10px] text-grey tabular-nums">{fmt(monthTotal(m))}</span>
                  <div className="flex flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: `${(monthTotal(m) / max) * 80}%` }}>
                    {holdings.map((h, i) => (
                      <div key={h.id} className={SHADES[i % SHADES.length]} style={{ flexGrow: m.byProperty[h.id] ?? 0 }} />
                    ))}
                  </div>
                  <span className="mt-2 text-[11px] text-grey">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          </figure>

          <div className="rounded-sm border border-line bg-surface p-5">
            <p className="mb-4 text-xs text-grey">Contribution to income, {monthLabel(history[0].month)} – {monthLabel(history[history.length - 1].month)}</p>
            <ul className="flex flex-col gap-4">
              {byProp.map(({ h, shade, total }) => (
                <li key={h.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2"><span className={`size-2.5 rounded-sm ${shade}`} />{h.name}</span>
                    <span className="tabular-nums">{fmt(total)} <span className="text-grey">· {((total / (history.reduce((s, m) => s + monthTotal(m), 0) || 1)) * 100).toFixed(0)}%</span></span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-sm border border-line bg-surface">
        {distributions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-grey">No distributions for the current period.</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey">
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 font-medium">Property</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Net rent</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Your share</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.propertyId} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{holdings.find((h) => h.id === d.propertyId)?.name ?? d.propertyId}</td>
                  <td className="px-4 py-3 text-right">{fmt(d.netRent)}</td>
                  <td className="px-4 py-3 text-right">{fmt(d.yourShare)}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-line px-4 py-3 text-xs text-grey">Only rent that has been deposited and marked claimable can be claimed.</p>
      </div>
    </Section>
  );
}
