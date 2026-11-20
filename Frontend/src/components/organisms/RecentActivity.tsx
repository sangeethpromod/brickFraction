import { ArrowDownLeft, ArrowUpRight, Banknote, CircleCheck, CircleX, ClipboardList, Clock, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Section, Unavailable, linkCls } from "@/components/molecules/Section";
import type { Activity, Fmt } from "@/lib/portfolio";

const STATUS = { confirmed: { cls: "text-gain", Icon: CircleCheck }, pending: { cls: "text-grey", Icon: Clock }, failed: { cls: "text-loss", Icon: CircleX } } as const;
const KIND: Record<Activity["kind"], LucideIcon> = { purchase: ArrowDownLeft, sale: ArrowUpRight, rent: Banknote, nav: TrendingUp, wallet: Wallet, subscription: ClipboardList };

export function RecentActivity({ items, fmt }: { items: Activity[]; fmt: Fmt }) {
  return (
    <Section id="act" title="Recent activity" aside={<Link href="/investor/transactions" className={linkCls}>View all</Link>}>
      {items.length === 0 ? (
        <Unavailable what="Activity" hint="no transactions yet." />
      ) : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              {(() => { const K = KIND[a.kind]; return <K size={18} strokeWidth={1.5} className="shrink-0 text-grey" aria-hidden="true" />; })()}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.label}{a.token && <span className="ml-2 text-xs font-normal text-bronze">{a.token}</span>}</p>
                <p className="text-xs text-grey">
                  <time dateTime={a.at}>{new Date(a.at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                  <span className="ml-2 font-mono">{a.ref}</span>
                </p>
              </div>
              <p className="flex items-center gap-4 tabular-nums">
                {a.amount != null && <span>{fmt(a.amount)}</span>}
                <span className={`inline-flex items-center gap-1 text-xs font-medium capitalize ${STATUS[a.status].cls}`}>{(() => { const S = STATUS[a.status].Icon; return <S size={14} strokeWidth={1.5} aria-hidden="true" />; })()}{a.status}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
