"use client";
import { Download } from "lucide-react";
import { Hash, StatusCell, downloadCsv } from "@/components/account/TxHistory";
import { Section } from "@/components/molecules/Section";
import { tusd, TX_LABEL, type Tx } from "@/lib/account";
import { shortDate } from "@/lib/portfolio";

// Per-property trades with cost basis and realised gain (tUSD). PDF export is not built; CSV covers reporting for now.
export function PortfolioTx({ txs, names, explorerBase }: { txs: Tx[]; names: Record<string, string>; explorerBase: string | null }) {
  const trades = txs.filter((t) => t.type === "buy" || t.type === "sell");
  const realised = trades.reduce((s, t) => s + (t.status === "confirmed" ? (t.realisedGain ?? 0) : 0), 0);
  return (
    <Section id="tx" title="Purchases & sales" aside={<button type="button" onClick={() => downloadCsv(trades, "portfolio-trades.csv")} disabled={!trades.length} className="inline-flex h-8 cursor-pointer items-center gap-2 text-sm font-medium underline decoration-bronze underline-offset-4 hover:text-bronze disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-bronze"><Download size={14} strokeWidth={1.5} aria-hidden="true" />Export CSV</button>}>
      {trades.length === 0 ? <p className="rounded-sm border border-dashed border-line bg-surface px-4 py-6 text-sm text-grey">No purchases or sales yet.</p> : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[820px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey"><tr className="border-b border-line">{["Date", "Property", "Type", "Units", "Amount", "Cost basis", "Realised gain", "Status", "Tx"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i > 2 && i < 7 ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{shortDate(t.at)}</td>
                  <td className="px-4 py-3">{(t.propertyId && names[t.propertyId]) ?? t.token}</td>
                  <td className="px-4 py-3">{TX_LABEL[t.type]}</td>
                  <td className="px-4 py-3 text-right">{t.units?.toLocaleString("en-IN") ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{tusd(Math.abs(t.amount))}</td>
                  <td className="px-4 py-3 text-right">{t.costBasis != null ? tusd(t.costBasis) : "—"}</td>
                  <td className={`px-4 py-3 text-right ${(t.realisedGain ?? 0) < 0 ? "text-loss" : "text-gain"}`}>{t.realisedGain != null ? `${t.realisedGain >= 0 ? "+" : "−"}${tusd(Math.abs(t.realisedGain))}` : "—"}</td>
                  <td className="px-4 py-3"><StatusCell t={t} /></td>
                  <td className="px-4 py-3"><Hash hash={t.hash} base={explorerBase} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-grey">Realised gain on confirmed sales: <span className="tabular-nums">{tusd(realised)}</span>. Purchases show no realised gain until sold.</p>
    </Section>
  );
}
