// Wallet (money & chain layer) + Portfolio (investment layer) contract. Backend has no routes yet, so the loader returns
// "unavailable" unless NEXT_PUBLIC_DEMO_DATA=1. Money-movement amounts (tUSD) are settlement currency; holdings use assetCurrency.
import type { Holding, HistoryPoint, RentMonth } from "./portfolio";

export type Allowlist = "pending" | "approved" | "frozen";
export type TxType = "mint" | "buy" | "sell" | "rent-claim" | "test-funds" | "transfer" | "refund" | "recovery";
export type Tx = {
  id: string; at: string; type: TxType; label: string; propertyId: string | null; token: string | null; units: number | null;
  amount: number; counterparty: string | null; fee: number; status: "pending" | "confirmed" | "failed"; hash: string;
  failReason?: string; note?: string; costBasis?: number; realisedGain?: number; // tUSD; sells only
};
export type RentLine = {
  id: string; propertyId: string; month: string; unitsAtRecord: number; recordDate: string; amount: number; // tUSD
  status: "claimable" | "claimed" | "expired" | "held"; expiresAt: string | null; reducedReason: string | null;
};
export type Order = { id: string; kind: "sell-listing" | "buy-order" | "subscription"; propertyId: string; units: number; price: number; status: string; at: string };
export type Account = {
  investor: { name: string };
  assetCurrency: string;
  wallet: {
    address: string; network: string; allowlist: Allowlist; explorerBase: string | null; gasSponsored: boolean;
    tusdAvailable: number; tusdLocked: number; faucet: { limit: number; cooldownHours: number; nextAt: string | null };
  };
  tokens: { propertyId: string; units: number; lockedInListings: number; restricted: number }[];
  holdings: Holding[];
  history: HistoryPoint[];
  rentHistory: RentMonth[]; // asset currency, per property
  rentLines: RentLine[];
  orders: Order[];
  txs: Tx[];
  security: { recentActivity: { at: string; text: string }[]; keyCustody: string };
};
export type AccountResult = { status: "ok"; data: Account } | { status: "unavailable" };
export type DemoState = "pending" | "frozen" | "empty";

export async function getAccount(demoState?: string): Promise<AccountResult> {
  if (process.env.NEXT_PUBLIC_DEMO_DATA !== "1") return { status: "unavailable" }; // TODO: GET /v1/investor/account
  const { demoAccount } = await import("./demo-account");
  return { status: "ok", data: demoAccount(demoState as DemoState | undefined) };
}

export const tusd = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tUSD`;
export const claimable = (a: Account) => a.rentLines.filter((l) => l.status === "claimable").reduce((s, l) => s + l.amount, 0);
export const TX_LABEL: Record<TxType, string> = { mint: "Mint", buy: "Buy", sell: "Sell", "rent-claim": "Rent claim", "test-funds": "Test funds", transfer: "Transfer", refund: "Refund", recovery: "Recovery" };

/** CSV with quoted fields; amounts are tUSD. */
export function txCsv(txs: Tx[]): string {
  const q = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Date", "Type", "Description", "Token", "Units", "Amount (tUSD)", "Counterparty", "Fee (tUSD)", "Status", "Tx hash", "Cost basis (tUSD)", "Realised gain (tUSD)"];
  return [head, ...txs.map((t) => [t.at, TX_LABEL[t.type], t.label, t.token, t.units, t.amount, t.counterparty, t.fee, t.status, t.hash, t.costBasis, t.realisedGain])]
    .map((r) => r.map(q).join(",")).join("\n");
}
export const isFuture = (iso: string) => Date.parse(iso) > Date.now();
