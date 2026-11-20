import Link from "next/link";
import { Section } from "@/components/molecules/Section";
import { ActionButton } from "@/components/account/ActionButton";
import { blockReason } from "@/components/account/AccountBanner";
import { propertyHref } from "@/components/organisms/TopProperty";
import { tusd, type Account, type RentLine } from "@/lib/account";
import { money, monthLabel, shortDate } from "@/lib/portfolio";

const STATUS: Record<RentLine["status"], [string, string]> = { claimable: ["Claimable", "text-bronze"], claimed: ["Claimed", "text-gain"], expired: ["Expired", "text-loss"], held: ["Held back", "text-loss"] };
const days = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));

export function RentDistributions({ a }: { a: Account }) {
  const name = (id: string) => a.holdings.find((h) => h.id === id);
  return (
    <Section id="rent" title="Rent & distributions">
      {a.rentLines.length === 0 ? <p className="rounded-sm border border-dashed border-line bg-surface px-4 py-6 text-sm text-grey">No distributions yet.</p> : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey"><tr className="border-b border-line">{["Month", "Property", "Held at record date", "Amount", "Status"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i === 3 ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>
              {a.rentLines.map((l) => {
                const [label, cls] = STATUS[l.status], h = name(l.propertyId);
                return (
                  <tr key={l.id} className="border-b border-line align-top last:border-0">
                    <td className="px-4 py-3">{monthLabel(l.month)}</td>
                    <td className="px-4 py-3"><Link href={`${propertyHref(l.propertyId)}#rent`} className="hover:text-bronze focus-visible:outline-2 focus-visible:outline-bronze">{h?.name ?? l.propertyId}</Link>
                      {l.reducedReason && <span className="block text-xs text-grey">{l.reducedReason} <Link href={`${propertyHref(l.propertyId)}#rent`} className="text-bronze underline underline-offset-4">See waterfall</Link></span>}
                    </td>
                    <td className="px-4 py-3">{l.unitsAtRecord.toLocaleString("en-IN")} units<span className="block text-xs text-grey">You held these on {shortDate(l.recordDate)}{h && h.sharesOwned !== l.unitsAtRecord ? "; your holding has changed since" : ""}</span></td>
                    <td className="px-4 py-3 text-right">{tusd(l.amount)}</td>
                    <td className={`px-4 py-3 font-medium ${cls}`}>{label}{l.status === "claimable" && l.expiresAt && <span className="block text-xs font-normal text-grey">Expires in {days(l.expiresAt)} days; then returns to the property&apos;s reserves</span>}</td>
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

export function OrdersSection({ a }: { a: Account }) {
  const block = blockReason(a.wallet.allowlist);
  const name = (id: string) => a.holdings.find((h) => h.id === id)?.name ?? id;
  const groups: [Account["orders"][number]["kind"], string][] = [["sell-listing", "Open sell listings"], ["buy-order", "Open buy orders"], ["subscription", "Pending offering subscriptions"]];
  return (
    <Section id="orders" title="Orders & listings">
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(([kind, title]) => {
          const rows = a.orders.filter((o) => o.kind === kind);
          return (
            <div key={kind} className="rounded-sm border border-line bg-surface p-5 text-sm">
              <h3 className="mb-3 text-xs text-grey">{title}</h3>
              {rows.length === 0 ? <p className="text-grey">None.</p> : (
                <ul className="flex flex-col gap-4">
                  {rows.map((o) => (
                    <li key={o.id} className="tabular-nums">
                      <p className="font-medium">{name(o.propertyId)}</p>
                      <p className="text-xs text-grey">{o.units.toLocaleString("en-IN")} units @ {money(o.price, a.assetCurrency, 2)} · {o.status}</p>
                      <div className="mt-2"><ActionButton label={kind === "subscription" ? "Withdraw subscription" : "Cancel"} reason={block} small /></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
