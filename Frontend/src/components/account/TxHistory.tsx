"use client";
import { CircleCheck, CircleX, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { ActionButton } from "@/components/account/ActionButton";
import { Section, Unavailable } from "@/components/molecules/Section";
import { TX_LABEL, tusd, txCsv, type Tx, type TxType } from "@/lib/account";
import { shortDate } from "@/lib/portfolio";

const input = "h-9 rounded-sm border border-line bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-bronze";

export const Hash = ({ hash, base }: { hash: string; base: string | null }) => {
  const short = `${hash.slice(0, 8)}…${hash.slice(-4)}`;
  return base ? <a href={`${base}/tx/${hash}`} className="font-mono text-xs text-bronze underline underline-offset-4">{short}</a> : <span className="font-mono text-xs text-grey" title={hash}>{short}</span>;
};

export function StatusCell({ t }: { t: Tx }) {
  if (t.status === "pending") return <span className="inline-flex items-center gap-1 text-xs text-grey"><Loader2 size={14} strokeWidth={1.5} className="motion-safe:animate-spin" aria-hidden="true" />Pending</span>;
  if (t.status === "failed") return <span className="inline-flex items-center gap-1 text-xs text-loss"><CircleX size={14} strokeWidth={1.5} aria-hidden="true" />Failed</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-gain"><CircleCheck size={14} strokeWidth={1.5} aria-hidden="true" />Confirmed</span>;
}

export function downloadCsv(txs: Tx[], name: string) {
  const url = URL.createObjectURL(new Blob([txCsv(txs)], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

export function TxHistory({ txs, explorerBase, blocked }: { txs: Tx[]; explorerBase: string | null; blocked: string | null }) {
  const [type, setType] = useState<TxType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const shown = txs.filter((t) => (type === "all" || t.type === type) && (!from || t.at.slice(0, 10) >= from) && (!to || t.at.slice(0, 10) <= to));
  return (
    <Section
      id="hist"
      title="Transaction history"
      aside={<button type="button" onClick={() => downloadCsv(shown, "wallet-transactions.csv")} disabled={!shown.length} className="inline-flex h-8 cursor-pointer items-center gap-2 text-sm font-medium underline decoration-bronze underline-offset-4 hover:text-bronze disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-bronze"><Download size={14} strokeWidth={1.5} aria-hidden="true" />Export CSV</button>}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-grey">Type
          <select value={type} onChange={(e) => setType(e.target.value as TxType | "all")} className={input}>
            <option value="all">All</option>
            {(Object.keys(TX_LABEL) as TxType[]).map((k) => <option key={k} value={k}>{TX_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-grey">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} /></label>
        <label className="flex items-center gap-2 text-grey">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} /></label>
      </div>
      {shown.length === 0 ? <Unavailable what="Matching transactions" hint="adjust the filters." /> : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[820px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey"><tr className="border-b border-line">{["Date", "Type", "Counterparty", "Amount", "Fee", "Status", "Tx hash"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i === 3 || i === 4 ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{shortDate(t.at)}</td>
                  <td className="px-4 py-3"><span className="font-medium">{TX_LABEL[t.type]}</span><span className="block text-xs text-grey">{t.label}</span>
                    {t.note && <span className="block text-xs text-grey">{t.note}</span>}
                    {t.failReason && <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-loss">{t.failReason}<ActionButton label="Retry" reason={blocked} small /></span>}
                  </td>
                  <td className="px-4 py-3 text-grey">{t.counterparty ?? "—"}</td>
                  <td className={`px-4 py-3 text-right ${t.status === "failed" ? "text-grey line-through" : t.amount < 0 ? "" : t.amount > 0 ? "text-gain" : ""}`}>{t.amount === 0 ? "—" : `${t.amount > 0 ? "+" : "−"}${tusd(Math.abs(t.amount))}`}</td>
                  <td className="px-4 py-3 text-right">{t.fee ? tusd(t.fee) : "—"}</td>
                  <td className="px-4 py-3"><StatusCell t={t} /></td>
                  <td className="px-4 py-3"><Hash hash={t.hash} base={explorerBase} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
