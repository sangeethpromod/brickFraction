import Link from "next/link";
import { AccountBanner } from "@/components/account/AccountBanner";
import { HoldingsTable } from "@/components/account/HoldingsTable";
import { ChartsSection, ValueChart } from "@/components/account/PortfolioCharts";
import { PortfolioSummary } from "@/components/account/PortfolioSummary";
import { PortfolioTx } from "@/components/account/PortfolioTx";
import { OrdersSection, RentDistributions } from "@/components/account/RentAndOrders";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Unavailable, linkCls } from "@/components/molecules/Section";
import { getAccount } from "@/lib/account";

export async function PortfolioPage({ demo }: { demo?: string }) {
  const res = await getAccount(demo);
  if (res.status !== "ok") return <div className="mx-auto max-w-6xl"><PageHeader title="Portfolio" /><Unavailable what="Portfolio" hint="the portfolio API isn't available yet." /></div>;
  const a = res.data;
  const names = Object.fromEntries(a.holdings.map((h) => [h.id, h.name]));
  const hasHoldings = a.holdings.length > 0;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 motion-safe:animate-rise">
      <div className="flex flex-col gap-4">
        <PageHeader title="Portfolio" description="How your holdings are performing. Money movement lives in your Wallet." />
        <AccountBanner status={a.wallet.allowlist} />
      </div>
      {hasHoldings ? (
        <>
          <PortfolioSummary a={a} />
          <HoldingsTable a={a} />
          <ValueChart a={a} />
          <ChartsSection a={a} />
          <RentDistributions a={a} />
          <OrdersSection a={a} />
        </>
      ) : (
        <div className="rounded-sm border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-serif text-2xl">No holdings yet</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-sm text-grey">Your tUSD balance is still available in your Wallet. Browse properties to make your first investment.</p>
          <p className="mt-4 flex justify-center gap-6"><Link href="/investor/marketplace" className={linkCls}>Browse properties</Link><Link href="/investor/wallet" className={linkCls}>Open wallet</Link></p>
        </div>
      )}
      <PortfolioTx txs={a.txs} names={names} explorerBase={a.wallet.explorerBase} />
    </div>
  );
}
