import { ExternalLink } from "lucide-react";
import { MetricCard } from "@/components/molecules/MetricCard";
import { Section } from "@/components/molecules/Section";
import { ActionButton } from "@/components/account/ActionButton";
import { blockReason } from "@/components/account/AccountBanner";
import { CopyButton } from "@/components/account/CopyButton";
import { claimable, isFuture, tusd, type Account } from "@/lib/account";
import { shortDate } from "@/lib/portfolio";

const ALLOW = { pending: ["Pending approval", "text-bronze"], approved: ["Approved", "text-gain"], frozen: ["Frozen", "text-loss"] } as const;

export function WalletStatus({ a }: { a: Account }) {
  const w = a.wallet, [label, cls] = ALLOW[w.allowlist];
  return (
    <Section id="acct" title="Account & status">
      <div className="rounded-sm border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.08em] uppercase">
          <span className="rounded-sm bg-charcoal px-2.5 py-1 text-ivory">Custodial wallet · managed by the app</span>
          <span className="rounded-sm border border-line px-2.5 py-1 text-grey">{w.network}</span>
          <span className="rounded-sm border border-line px-2.5 py-1 text-grey">Simulated · testnet</span>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <dt className="text-xs text-grey">Wallet address</dt>
            <dd className="flex items-center gap-1 font-mono text-sm break-all">
              {w.address}
              <CopyButton value={w.address} label="Copy wallet address" />
              {w.explorerBase && <a href={`${w.explorerBase}/address/${w.address}`} aria-label="View on block explorer" className="flex size-8 items-center justify-center text-grey hover:text-charcoal"><ExternalLink size={16} strokeWidth={1.5} /></a>}
            </dd>
            {!w.explorerBase && <p className="text-xs text-grey">No block explorer is configured for this network.</p>}
          </div>
          <MetricCard size="sm" label="Allowlist status" value={<span className={cls}>{label}</span>} note="Only allowlisted wallets can hold property tokens." />
        </dl>
        <div className="mt-4"><ActionButton label="Connect your own wallet" reason="Optional and not available yet. Tokens can only move between verified wallets." small /></div>
      </div>
    </Section>
  );
}

export function WalletBalances({ a }: { a: Account }) {
  const name = (id: string) => a.holdings.find((h) => h.id === id);
  const claim = claimable(a);
  return (
    <Section id="bal" title="Balances">
      <dl className="grid grid-cols-2 gap-6 rounded-sm border border-line bg-surface p-5 sm:grid-cols-3">
        <MetricCard label="tUSD available" value={tusd(a.wallet.tusdAvailable)} note="Confirmed and spendable" />
        <MetricCard label="tUSD locked" value={tusd(a.wallet.tusdLocked)} note="Open buy orders and offering escrow" />
        <MetricCard label="Claimable rent" value={<span className={claim > 0 ? "text-bronze" : ""}>{tusd(claim)}</span>} note="Not yet in your balance until claimed" />
      </dl>
      {a.tokens.length === 0 ? <p className="rounded-sm border border-dashed border-line bg-surface px-4 py-6 text-sm text-grey">No property tokens yet. Your tUSD balance above is still available.</p> : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
            <thead className="text-xs text-grey"><tr className="border-b border-line">{["Property token", "Total units", "Locked in sell listings", "Restricted"].map((c, i) => <th key={c} scope="col" className={`px-4 py-3 font-medium ${i ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
            <tbody>
              {a.tokens.map((t) => (
                <tr key={t.propertyId} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{name(t.propertyId)?.name ?? t.propertyId} <span className="text-xs text-bronze">{name(t.propertyId)?.token}</span></td>
                  <td className="px-4 py-3 text-right">{t.units.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">{t.lockedInListings ? t.lockedInListings.toLocaleString("en-IN") : "—"}</td>
                  <td className={`px-4 py-3 text-right ${t.restricted ? "text-loss" : ""}`}>{t.restricted ? t.restricted.toLocaleString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-grey">Pending transactions are not counted in any balance until confirmed, so nothing is double-counted. Units in a sell listing are locked here but still count toward portfolio value.</p>
    </Section>
  );
}

export function WalletActions({ a }: { a: Account }) {
  const block = blockReason(a.wallet.allowlist), f = a.wallet.faucet, claim = claimable(a);
  const cooling = f.nextAt && isFuture(f.nextAt);
  return (
    <Section id="act" title="Actions">
      <div className="flex flex-wrap items-start gap-3 rounded-sm border border-line bg-surface p-5">
        <ActionButton label="Get test funds" reason={block ?? (cooling ? `Available again ${shortDate(f.nextAt!)}` : null)} primary />
        <ActionButton label="Deposit" reason={block} />
        <ActionButton label="Withdraw" reason={block} />
        <ActionButton label={claim > 0 ? `Claim all rent (${tusd(claim)})` : "Claim all rent"} reason={block ?? (claim > 0 ? null : "Nothing to claim")} primary />
      </div>
      <p className="text-xs text-grey">Test funds: up to {tusd(f.limit)} every {f.cooldownHours} hours. Withdrawals can only go to other verified wallets, because tokens can&apos;t leave the allowlist.</p>
    </Section>
  );
}

export function WalletSecurity({ a }: { a: Account }) {
  return (
    <Section id="sec" title="Security & info">
      <div className="grid gap-4 rounded-sm border border-line bg-surface p-5 text-sm lg:grid-cols-2">
        <div>
          {a.wallet.gasSponsored && <p><strong className="font-medium">Gas is sponsored by the app.</strong> You never pay network fees.</p>}
          <p className="mt-2 text-grey">{a.security.keyCustody}</p>
        </div>
        <div>
          <h3 className="mb-2 text-xs text-grey">Recent activity</h3>
          <ul className="flex flex-col gap-1 text-grey">{a.security.recentActivity.map((r) => <li key={r.at} className="flex justify-between gap-2"><span>{r.text}</span><time dateTime={r.at} className="text-xs">{shortDate(r.at)}</time></li>)}</ul>
        </div>
      </div>
    </Section>
  );
}
