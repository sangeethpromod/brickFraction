import Link from "next/link";
import { Section } from "@/components/molecules/Section";
import { propertyHref } from "@/components/organisms/TopProperty";
import { tusd, type Account } from "@/lib/account";
import { holdingValue, money, monthLabel, ownershipPct, pct } from "@/lib/portfolio";

const STATUS = { operating: ["Operating", "text-gain"], funding: ["Funding", "text-bronze"], paused: ["Paused", "text-loss"] } as const;

export function HoldingsTable({ a }: { a: Account }) {
  const m = (n: number, d = 0) => money(n, a.assetCurrency, d);
  return (
    <Section id="hold" title="Holdings">
      <div className="overflow-x-auto rounded-sm border border-line bg-surface">
        <table className="w-full min-w-[1040px] text-left text-sm tabular-nums">
          <thead className="text-xs text-grey">
            <tr className="border-b border-line">{["Property", "Units", "Own", "Avg buy", "Price / unit (NAV)", "Value", "Gain / loss", "Rent earned", "Last distribution", "Status"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i > 0 && i < 8 ? "text-right" : ""}`}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {a.holdings.map((h) => {
              const funding = h.status === "funding", value = holdingValue(h), gain = value - h.acquisitionCost;
              const last = a.rentLines.find((l) => l.propertyId === h.id && (l.status === "claimed" || l.status === "claimable"));
              const [label, cls] = STATUS[h.status ?? "operating"];
              return (
                <tr key={h.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3"><Link href={propertyHref(h.id)} className="font-medium hover:text-bronze focus-visible:outline-2 focus-visible:outline-bronze">{h.name}</Link><span className="block text-xs text-grey">{h.token} · {h.city}</span></td>
                  <td className="px-4 py-3 text-right">{h.sharesOwned.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">{ownershipPct(h).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">{m(h.acquisitionCost / h.sharesOwned, 2)}</td>
                  <td className="px-4 py-3 text-right">{m(h.navPerShare, 2)}{h.marketPrice != null && !funding && <span className="block text-xs text-grey">Market {m(h.marketPrice, 2)}</span>}</td>
                  <td className="px-4 py-3 text-right font-medium">{m(value)}{funding && <span className="block text-xs font-normal text-grey">Subscription amount</span>}</td>
                  <td className={`px-4 py-3 text-right ${gain >= 0 ? "text-gain" : "text-loss"}`}>{funding ? <span className="text-grey">—</span> : <>{gain >= 0 ? "+" : "−"}{m(Math.abs(gain))}<span className="block text-xs">{pct((gain / h.acquisitionCost) * 100)}</span>{gain < 0 && <span className="block text-xs">Valuation below cost</span>}</>}</td>
                  <td className="px-4 py-3 text-right">{funding ? <span className="text-grey">No rent yet</span> : m(h.rentEarned)}</td>
                  <td className="px-4 py-3 text-right">{last ? <>{tusd(last.amount)}<span className="block text-xs text-grey">{monthLabel(last.month)}</span></> : "—"}</td>
                  <td className={`px-4 py-3 font-medium ${cls}`}>{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-grey">Holdings are valued at NAV. A marketplace price that differs from NAV is shown for reference and is never used to value your holdings. Rent is paid in tUSD.</p>
    </Section>
  );
}
