import { PageHeader } from "@/components/molecules/PageHeader";
import { Unavailable } from "@/components/molecules/Section";
import { Marketplace } from "@/components/templates/Marketplace";
import { getMarketplace } from "@/lib/property";

export async function MarketplacePage() {
  const res = await getMarketplace();
  return res.status === "ok" ? <Marketplace offerings={res.offerings} currency={res.currency} /> : (
    <div className="mx-auto max-w-6xl"><PageHeader title="Marketplace" /><Unavailable what="Marketplace listings" hint="the marketplace API isn't available yet." /></div>
  );
}
