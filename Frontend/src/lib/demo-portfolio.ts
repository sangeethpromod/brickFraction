// DEMO FIXTURE: illustrative testnet figures, loaded only when NEXT_PUBLIC_DEMO_DATA=1. Never imported by components.
import { holdingValue, type Holding, type Portfolio } from "./portfolio";

const P = "/images/property/";
const END = Date.parse("2026-11-18");
export const MONTHS = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
// Landlord net rent pool per month and the investor's share, derived below as shares / issued.
export const POOL: Record<string, number[]> = {
  sky: [195000, 200000, 200000, 204000, 200000, 200000],
  plm: [290000, 300000, 300000, 296000, 300000, 300000],
  hbr: [118000, 120000, 120000, 120000, 114000, 120000],
};
const base = [
  { id: "sky", name: "Skyline Towers", unit: "Tower A · Flat 1204", city: "Mumbai", token: "SKY-1204", sharesOwned: 4000, sharesIssued: 100000, navPerShare: 540, acquisitionCost: 2000000, occupancy: "Let · 11 months left", img: P + "exterior.jpg", canSell: true },
  { id: "plm", name: "Palm Villas", unit: "Villa 7", city: "Goa", token: "PLM-07", sharesOwned: 3000, sharesIssued: 50000, navPerShare: 1200, acquisitionCost: 3300000, occupancy: "Let · 5 months left", img: P + "living.jpg", canSell: true },
  { id: "hbr", name: "Harbour Lofts", unit: "Block B · Loft 3B", city: "Kochi", token: "HBR-3B", sharesOwned: 1500, sharesIssued: 30000, navPerShare: 900, acquisitionCost: 1250000, occupancy: null, img: P + "kitchen.jpg", canSell: false },
];
const share = (b: (typeof base)[number], m: number) => (POOL[b.id][m] * b.sharesOwned) / b.sharesIssued;

const MARKET: Record<string, number> = { sky: 548, plm: 1185 }; // last secondary trade; valuation still uses NAV
const operating: Holding[] = base.map((b) => ({
  ...b, image: b.img,
  rentEarned: MONTHS.reduce((s, _, m) => s + share(b, m), 0),
  monthlyNetRent: share(b, MONTHS.length - 1),
  status: b.id === "hbr" ? "paused" : "operating", marketPrice: MARKET[b.id] ?? null,
}));
// Subscribed to an offering that hasn't closed: valued at subscription cost, no rent yet.
const funding: Holding = {
  id: "lakeview", name: "Lakeview Court", unit: "Penthouse", city: "Udaipur", token: "LKV-PH", image: P + "dinning.jpg", canSell: false,
  sharesOwned: 100, sharesIssued: 100000, navPerShare: 1500, acquisitionCost: 150000, rentEarned: 0, monthlyNetRent: null, occupancy: null, status: "funding",
};
const holdings: Holding[] = [...operating, funding];
const rentByMonth = MONTHS.map((_, m) => base.reduce((s, b) => s + share(b, m), 0));

const value = holdings.reduce((s, h) => s + holdingValue(h), 0);
const cost = holdings.reduce((s, h) => s + h.acquisitionCost, 0);
const history = Array.from({ length: 53 }, (_, i) => {
  const invested = i < 16 ? cost * 0.7 : cost;
  const t = i / 52;
  const v = i === 52 ? value : invested * (1 + (value / cost - 1) * t + 0.008 * Math.sin(i * 1.7));
  const d = new Date(END - (52 - i) * 7 * 864e5);
  // Rent counts once its month has ended (month-end snapshot).
  const rentCum = MONTHS.reduce((s, mo, m) => (Date.parse(`${mo}-28`) <= d.getTime() ? s + rentByMonth[m] : s), 0);
  return { t: d.toISOString().slice(0, 10), value: Math.round(v), invested: Math.round(invested), rentCum: Math.round(rentCum) };
});

export const DEMO_PORTFOLIO: Portfolio = {
  investor: { name: "Alex" },
  assetCurrency: "INR",
  fx: { USD: { rate: 0.0119, impact: -310 } , INR: { rate: 1, impact: null } },
  tusdBalance: 1250,
  holdings,
  history,
  rentHistory: MONTHS.map((month, m) => ({ month, byProperty: Object.fromEntries(base.map((b) => [b.id, share(b, m)])) })),
  distributions: [
    { propertyId: "sky", period: "2026-11", netRent: 200000, yourShare: share(base[0], 5), status: "claimed" },
    { propertyId: "plm", period: "2026-11", netRent: 300000, yourShare: share(base[1], 5), status: "claimable" },
    { propertyId: "hbr", period: "2026-11", netRent: 120000, yourShare: share(base[2], 5), status: "pending" },
  ],
  activity: [
    { id: "a1", at: "2026-11-15T09:42:00Z", kind: "rent", label: "Received rental distribution", token: "SKY-1204", amount: share(base[0], 5), status: "confirmed", ref: "0x4f2a…9c1d" },
    { id: "a2", at: "2026-11-02T14:05:00Z", kind: "purchase", label: "Purchased 500 Shares", token: "HBR-3B", amount: 450000, status: "confirmed", ref: "0x81be…07aa" },
    { id: "a3", at: "2026-10-28T11:20:00Z", kind: "nav", label: "New property valuation published", token: "PLM-07", amount: null, status: "confirmed", ref: "0xd3c9…5e12" },
    { id: "a4", at: "2026-10-20T08:00:00Z", kind: "wallet", label: "Wallet credited with tUSD", token: "tUSD", amount: null, status: "pending", ref: "0x2290…b6f3" },
  ],
  offerings: [
    { id: "cedar", name: "Cedar Residences · Unit 502", city: "Pune", image: P + "bedroom.jpg", kind: "primary", pricePerShare: 450, minInvestment: 45000, yieldPct: 5.8, fundedPct: 72, closesAt: "2026-12-10" },
    { id: "lakeview", name: "Lakeview Court · Penthouse", city: "Udaipur", image: P + "dinning.jpg", kind: "primary", pricePerShare: 1500, minInvestment: 150000, yieldPct: null, fundedPct: 31, closesAt: "2027-01-05" },
    { id: "sky", name: "Skyline Towers · Flat 1204", city: "Mumbai", image: P + "exterior.jpg", kind: "resale", pricePerShare: 548, minInvestment: 5480, yieldPct: 4.4, fundedPct: null, closesAt: null },
    { id: "plm", name: "Palm Villas · Villa 7", city: "Goa", image: P + "living.jpg", kind: "resale", pricePerShare: 1185, minInvestment: 11850, yieldPct: 6.1, fundedPct: null, closesAt: null },
  ],
};
