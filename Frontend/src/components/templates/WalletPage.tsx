import { AccountBanner, blockReason } from "@/components/account/AccountBanner";
import { TxHistory } from "@/components/account/TxHistory";
import { WalletActions, WalletBalances, WalletSecurity, WalletStatus } from "@/components/account/WalletSections";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Unavailable } from "@/components/molecules/Section";
import { getAccount } from "@/lib/account";

export async function WalletPage({ demo }: { demo?: string }) {
  const res = await getAccount(demo);
  if (res.status !== "ok") return <div className="mx-auto max-w-6xl"><PageHeader title="Wallet" /><Unavailable what="Wallet" hint="the wallet API isn't available yet." /></div>;
  const a = res.data;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 motion-safe:animate-rise">
      <div className="flex flex-col gap-4">
        <PageHeader title="Wallet" description="What you hold and can move: tUSD, property tokens and claimable rent." />
        <AccountBanner status={a.wallet.allowlist} />
      </div>
      <WalletStatus a={a} />
      <WalletBalances a={a} />
      <WalletActions a={a} />
      <TxHistory txs={a.txs} explorerBase={a.wallet.explorerBase} blocked={blockReason(a.wallet.allowlist)} />
      <WalletSecurity a={a} />
    </div>
  );
}
