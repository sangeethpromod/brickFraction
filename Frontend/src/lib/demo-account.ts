// DEMO FIXTURE (NEXT_PUBLIC_DEMO_DATA=1 only). Built on DEMO_PORTFOLIO so both pages agree with the dashboard.
// tUSD amounts = INR × 0.0119 (the fixture FX rate). `?demo=pending|frozen|empty` on the pages shows those states.
import type { Account, DemoState, RentLine, Tx } from "./account";
import { MONTHS, POOL, DEMO_PORTFOLIO as P } from "./demo-portfolio";

const FX = 0.0119;
const tu = (inr: number) => Math.round(inr * FX * 100) / 100;
const own = Object.fromEntries(P.holdings.map((h) => [h.id, h]));
const rent = (id: string, mi: number) => tu((POOL[id][Math.min(mi, POOL[id].length - 1)] * own[id].sharesOwned) / own[id].sharesIssued);
const line = (id: string, month: string, mi: number, status: RentLine["status"], extra: Partial<RentLine> = {}): RentLine => ({
  id: `${id}-${month}`, propertyId: id, month, unitsAtRecord: own[id].sharesOwned, recordDate: `${month}-01`, amount: rent(id, mi),
  status, expiresAt: null, reducedReason: null, ...extra,
});
const i = (m: string) => MONTHS.indexOf(m);

const rentLines: RentLine[] = [
  line("plm", "2026-11", 5, "claimable", { expiresAt: "2027-02-28" }),
  line("hbr", "2026-11", 5, "held", { amount: 0, reducedReason: "Held back: rent due, not received, and loan-to-value is above its covenant." }),
  line("sky", "2026-11", 5, "claimed"),
  line("plm", "2026-10", i("2026-10"), "claimed"), line("sky", "2026-10", i("2026-10"), "claimed"), line("hbr", "2026-10", i("2026-10"), "claimed"),
  line("plm", "2026-09", i("2026-09"), "claimed"), line("sky", "2026-09", i("2026-09"), "claimed"),
  line("hbr", "2026-09", i("2026-09"), "claimed", { reducedReason: "Reduced: higher maintenance costs that month." }),
  line("plm", "2026-07", i("2026-07"), "claimed", { reducedReason: "Reduced: ₹18,000 roof repair (special expense)." }),
];

const hx = (n: string) => `0x${n}${"a1b2c3d4e5f6".repeat(6)}`.slice(0, 66);
const txs: Tx[] = [
  { id: "t6", at: "2026-11-17T10:20:00Z", type: "buy", label: "Subscribed to Cedar Residences offering", propertyId: "cedar", token: "CDR-502", units: 100, amount: -535.5, counterparty: "Offering escrow", fee: 0.54, status: "pending", hash: hx("6f") },
  { id: "t1", at: "2026-11-15T09:42:00Z", type: "rent-claim", label: "Claimed rent, Skyline Towers", propertyId: "sky", token: "SKY-1204", units: null, amount: rent("sky", 5), counterparty: "Rent distributor", fee: 0, status: "confirmed", hash: hx("1a") },
  { id: "t2", at: "2026-11-12T12:00:00Z", type: "test-funds", label: "Test funds (faucet)", propertyId: null, token: "tUSD", units: null, amount: 500, counterparty: "Faucet", fee: 0, status: "confirmed", hash: hx("2b") },
  { id: "t7", at: "2026-11-09T16:30:00Z", type: "buy", label: "Buy Palm Villas units", propertyId: "plm", token: "PLM-07", units: 250, amount: -3570, counterparty: "Order book", fee: 0, status: "failed", hash: hx("7c"), failReason: "Price moved above your limit before execution. No funds were taken." },
  { id: "t3", at: "2026-11-02T14:05:00Z", type: "buy", label: "Bought Harbour Lofts units", propertyId: "hbr", token: "HBR-3B", units: 500, amount: -tu(450000), counterparty: "Offering escrow", fee: 5.36, status: "confirmed", hash: hx("3d") },
  { id: "t4", at: "2026-10-30T11:15:00Z", type: "sell", label: "Sold Skyline Towers units", propertyId: "sky", token: "SKY-1204", units: 100, amount: 648.55, counterparty: "0x9a1c…e2f0", fee: 0.65, status: "confirmed", hash: hx("4e"), costBasis: 595, realisedGain: 53.55 },
  { id: "t5", at: "2026-10-20T08:00:00Z", type: "mint", label: "tUSD minted", propertyId: null, token: "tUSD", units: null, amount: 1250, counterparty: "Platform treasury", fee: 0, status: "confirmed", hash: hx("5f") },
  { id: "t8", at: "2026-09-12T09:00:00Z", type: "refund", label: "Refund: Marina Court offering did not fill", propertyId: null, token: "tUSD", units: null, amount: 420, counterparty: "Offering escrow", fee: 0, status: "confirmed", hash: hx("8a"), note: "Minimum raise not met; tUSD returned in full." },
  { id: "t9", at: "2026-09-01T13:40:00Z", type: "transfer", label: "Withdrawal to verified wallet", propertyId: null, token: "tUSD", units: null, amount: -200, counterparty: "0x77d4…12ab (verified)", fee: 0, status: "confirmed", hash: hx("9b") },
  { id: "t10", at: "2026-08-18T10:00:00Z", type: "recovery", label: "Units moved out: court-ordered recovery", propertyId: null, token: "PRL-02", units: 200, amount: 0, counterparty: "Court-appointed receiver", fee: 0, status: "confirmed", hash: hx("10"), note: "Court order ref. DEMO-2026-117 (simulated)." },
];

const base: Account = {
  investor: P.investor, assetCurrency: P.assetCurrency,
  wallet: {
    address: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", network: "Local (Anvil)", allowlist: "approved", explorerBase: null, gasSponsored: true,
    tusdAvailable: 1250, tusdLocked: 1927.8, faucet: { limit: 1000, cooldownHours: 24, nextAt: null },
  },
  tokens: P.holdings.map((h) => ({ propertyId: h.id, units: h.sharesOwned, lockedInListings: h.id === "sky" ? 500 : 0, restricted: 0 })),
  holdings: P.holdings, history: P.history, rentHistory: P.rentHistory, rentLines,
  orders: [
    { id: "o1", kind: "sell-listing", propertyId: "sky", units: 500, price: 552, status: "Open", at: "2026-11-14T09:00:00Z" },
    { id: "o2", kind: "buy-order", propertyId: "plm", units: 100, price: 1170, status: "Open", at: "2026-11-16T09:00:00Z" },
    { id: "o3", kind: "subscription", propertyId: "cedar", units: 100, price: 450, status: "Pending · offering closes 10 Dec", at: "2026-11-17T10:20:00Z" },
  ],
  txs,
  security: {
    keyCustody: "Keys are held by the platform in this demo (a KMS/HSM in production). You never handle a private key.",
    recentActivity: [{ at: "2026-11-18T08:05:00Z", text: "Signed in (this device)" }, { at: "2026-11-15T09:40:00Z", text: "Rent claim approved" }, { at: "2026-11-12T11:58:00Z", text: "Test funds requested" }],
  },
};

export function demoAccount(state?: DemoState): Account {
  const a = structuredClone(base);
  if (state === "pending") a.wallet.allowlist = "pending";
  if (state === "frozen") { a.wallet.allowlist = "frozen"; a.tokens.forEach((t) => (t.restricted = t.units)); }
  if (state === "empty") Object.assign(a, { holdings: [], tokens: [], history: [], rentHistory: [], rentLines: [], orders: [] });
  return a;
}
