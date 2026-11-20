// DEMO FIXTURE: illustrative testnet property records (NEXT_PUBLIC_DEMO_DATA=1 only). Numbers are built so that
// distributable rent equals the dashboard fixture's rent pool and equity ÷ units equals its NAV.
import { MONTHS, POOL } from "./demo-portfolio";
import type { PropertyDetail, RentMonth } from "./property";

const P = "/images/property/";
const ALL = ["exterior", "living", "kitchen", "dinning", "bedroom"].map((n) => `${P}${n}.jpg`);
const photos = (first: string) => { const i = ALL.findIndex((x) => x.includes(first)); return [...ALL.slice(i), ...ALL.slice(0, i)]; };
const DOCS = [{ label: "Title deed", href: null }, { label: "Appraisal report", href: null }, { label: "Lease summary", href: null }, { label: "Insurance certificate", href: null }];
const RISKS = ["Rental income depends on tenant payment and occupancy.", "Valuations are estimates and can fall.", "Debt covenants can pause distributions.", "Secondary-market liquidity is not guaranteed."];
const map = (lng: number, lat: number) => `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.006}%2C${lng + 0.01}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lng}`;

type Fin = { gross: number; tax: number; insurance: number; management: number; fee: number; debt: number; topUp: number };
// Maintenance is the plug so that distributable == the pool for that month (minus any special expense).
function months(id: string, f: Fin, special: Record<string, { label: string; amount: number }> = {}): RentMonth[] {
  return MONTHS.map((month, m) => {
    const sp = special[month] ?? null;
    const fixed = f.tax + f.insurance + f.management + f.fee + f.debt + f.topUp;
    return {
      month, status: "paid", gross: f.gross, vacancyLoss: 0, tax: f.tax, insurance: f.insurance, management: f.management,
      maintenance: f.gross - fixed - POOL[id][m] - (sp?.amount ?? 0), special: sp,
      debtService: f.debt, reserveTopUp: f.topUp, platformFee: f.fee,
    };
  });
}
const base = {
  currency: "INR", spv: "Demo SPV Pvt Ltd (simulated)", holderCapPct: 10, mapEmbed: null, documents: DOCS, risks: RISKS,
  tokenAddress: "0x0000…demo", distributorAddress: "0x0000…demo", explorerBase: null,
  staleAfterMonths: 12, leases: [], recordDateNote: "Rent for a month goes to whoever held units on the record date (the 1st of that month).",
  floorPlan: P + "floor-plan.jpg", unsoldRentGoesTo: null, windUp: null, distributionsPaused: false, offering: null,
  market: { listings: [], trades: [] }, yours: null, lastTradePrice: null,
} satisfies Partial<PropertyDetail>;
const rentAudit = (t: string) => ({ at: "2026-11-02T09:00:00Z", kind: "rent" as const, text: t });
const reservesFor = (id: string) => ({
  target: id === "plm" ? 3_000_000 : 2_000_000, targetMonths: 3,
  log: [{ date: "2026-10-01", label: "Monthly top-up", amount: 10000 }, { date: "2026-07-14", label: "Repair: plumbing", amount: -18000 }],
});
const debt = (lender: string, ratePct: number, service: number, covenant: number, refi = true) => ({
  lender, ratePct, maturity: "2030-03-31", monthlyService: service, ltvCovenantPct: covenant, dscrCovenant: 1.2,
  onBreach: "Rent is held back and distributions pause until the covenant is cured.",
  refinanced: refi ? [{ date: "2026-08-01", note: `Refinanced to ${ratePct}% (from ${ratePct + 0.5}%)` }] : [],
});

export const DEMO_PROPERTIES: Record<string, PropertyDetail> = {
  sky: {
    ...base, id: "sky", name: "Skyline Towers · Flat 1204", address: "Tower A, Bandra Kurla Complex, Mumbai", propertyType: "Residential apartment", status: "operating",
    unitsTotal: 100000, unitsSold: 100000, holderCount: 214, topHolderPct: 7.5, offeringPrice: 500, lastTradePrice: 548,
    yours: { units: 4000, cost: 2000000, restrictedUnits: 0 }, photos: photos("exterior"), mapEmbed: map(72.867, 19.066),
    valuation: { appraisedValue: 75_000_000, debt: 20_000_000, reserves: 1_000_000, liabilities: 2_000_000 },
    appraisals: [{ date: "2024-11-20", value: 70_000_000, source: "Independent valuer" }, { date: "2025-11-05", value: 72_000_000, source: "Independent valuer" }, { date: "2026-08-14", value: 75_000_000, source: "Independent valuer" }],
    occupancy: "Let · 11 months left", leases: [{ tenant: "Corporate tenant (demo)", term: "24 months", expiry: "2027-09-30", monthlyRent: 500000 }],
    rent: months("sky", { gross: 500000, tax: 30000, insurance: 15000, management: 25000, fee: 10000, debt: 180000, topUp: 10000 }),
    claim: { claimed: 8000, unclaimed: 0, expiresAt: null, onExpiry: "Unclaimed rent returns to reserves after the claim window." },
    reserves: reservesFor("sky"), debt: debt("Demo Bank", 8.5, 180000, 40),
    market: { listings: [{ units: 1200, price: 548 }, { units: 300, price: 552 }], trades: [{ date: "2026-11-10", units: 500, price: 545 }, { date: "2026-10-22", units: 250, price: 538 }] },
    audit: [rentAudit("Rent deposited for October"), { at: "2026-08-14T10:00:00Z", kind: "valuation", text: "Valuation updated to ₹7,50,00,000" }, { at: "2026-08-01T10:00:00Z", kind: "debt", text: "Debt refinanced" }],
  },
  plm: {
    ...base, id: "plm", name: "Palm Villas · Villa 7", address: "Candolim Road, Goa", propertyType: "Villa", status: "operating",
    unitsTotal: 50000, unitsSold: 50000, holderCount: 131, topHolderPct: 9.2, offeringPrice: 1100, lastTradePrice: 1185,
    yours: { units: 3000, cost: 3300000, restrictedUnits: 0 }, photos: photos("living"), mapEmbed: map(73.762, 15.517),
    valuation: { appraisedValue: 95_000_000, debt: 32_000_000, reserves: 1_500_000, liabilities: 4_500_000 },
    appraisals: [{ date: "2024-06-12", value: 88_000_000, source: "Independent valuer" }, { date: "2025-08-10", value: 95_000_000, source: "Independent valuer" }], // stale: > 12 months
    occupancy: "Let · 5 months left", leases: [{ tenant: "Family tenant (demo)", term: "12 months", expiry: "2027-04-30", monthlyRent: 700000 }],
    rent: months("plm", { gross: 700000, tax: 42000, insurance: 21000, management: 35000, fee: 14000, debt: 236000, topUp: 10000 }, { "2026-07": { label: "Roof repair (capital call)", amount: 18000 } }),
    claim: { claimed: 0, unclaimed: 18000, expiresAt: "2027-02-28", onExpiry: "Unclaimed rent returns to reserves." },
    reserves: reservesFor("plm"), debt: debt("Demo Bank", 9, 236000, 40),
    market: { listings: [{ units: 800, price: 1185 }], trades: [{ date: "2026-11-05", units: 200, price: 1190 }] },
    audit: [rentAudit("Rent deposited for October"), { at: "2026-07-14T10:00:00Z", kind: "other", text: "Special expense: roof repair, ₹18,000" }],
  },
  hbr: {
    ...base, id: "hbr", name: "Harbour Lofts · Loft 3B", address: "Marine Drive, Kochi", propertyType: "Loft apartment", status: "operating",
    unitsTotal: 30000, unitsSold: 30000, holderCount: 77, topHolderPct: 8.1, offeringPrice: 880,
    yours: { units: 1500, cost: 1250000, restrictedUnits: 0 }, photos: photos("kitchen"), mapEmbed: map(76.274, 9.968),
    valuation: { appraisedValue: 50_000_000, debt: 22_000_000, reserves: 1_000_000, liabilities: 2_000_000 }, // LTV 44% > 40% covenant
    appraisals: [{ date: "2025-12-02", value: 52_000_000, source: "Independent valuer" }, { date: "2026-09-18", value: 50_000_000, source: "Independent valuer" }],
    occupancy: null, distributionsPaused: true,
    rent: [...months("hbr", { gross: 400000, tax: 24000, insurance: 12000, management: 20000, fee: 8000, debt: 182000, topUp: 10000 }),
      { month: "2026-11", status: "due", gross: 0, vacancyLoss: 0, tax: 24000, insurance: 12000, maintenance: 0, management: 20000, special: null, debtService: 182000, reserveTopUp: 0, platformFee: 0 }],
    claim: { claimed: 0, unclaimed: 0, expiresAt: null, onExpiry: "Unclaimed rent returns to reserves." },
    reserves: reservesFor("hbr"), debt: debt("Demo Bank", 9.5, 182000, 40),
    audit: [{ at: "2026-11-10T10:00:00Z", kind: "debt", text: "LTV above covenant; distributions paused" }, { at: "2026-09-18T10:00:00Z", kind: "valuation", text: "Valuation lowered to ₹5,00,00,000" }],
  },
  cedar: {
    ...base, id: "cedar", name: "Cedar Residences · Unit 502", address: "Koregaon Park, Pune", propertyType: "Residential apartment", status: "new-offering",
    unitsTotal: 200000, unitsSold: 144000, holderCount: 38, topHolderPct: 6.5, offeringPrice: 450, photos: photos("bedroom"), mapEmbed: map(73.893, 18.536),
    valuation: { appraisedValue: 136_000_000, debt: 45_000_000, reserves: 2_000_000, liabilities: 3_000_000 },
    appraisals: [{ date: "2026-10-05", value: 136_000_000, source: "Underwriting valuer" }],
    offering: { fundedPct: 72, minRaise: 70_000_000, closesAt: "2026-12-10", refundIfNotMet: true, lockupMonths: 6, projectedMonthlyRent: 520000, projectedNetYieldPct: 5.8 },
    unsoldRentGoesTo: "reserves", occupancy: null, rent: [], claim: null, reserves: { ...reservesFor("sky"), log: [] }, debt: debt("Demo Bank", 8.75, 200000, 40, false),
    audit: [{ at: "2026-10-05T10:00:00Z", kind: "valuation", text: "Underwriting valuation published" }],
  },
  lakeview: {
    ...base, id: "lakeview", name: "Lakeview Court · Penthouse", address: "Fateh Sagar Road, Udaipur", propertyType: "Penthouse", status: "new-offering",
    unitsTotal: 100000, unitsSold: 31000, holderCount: 12, topHolderPct: 9.8, offeringPrice: 1500, photos: photos("dinning"), mapEmbed: map(73.683, 24.592),
    valuation: { appraisedValue: 240_000_000, debt: 80_000_000, reserves: 3_000_000, liabilities: 13_000_000 },
    appraisals: [{ date: "2026-10-20", value: 240_000_000, source: "Underwriting valuer" }],
    offering: { fundedPct: 31, minRaise: 75_000_000, closesAt: "2027-01-05", refundIfNotMet: true, lockupMonths: null, projectedMonthlyRent: 900000, projectedNetYieldPct: 5.2 },
    unsoldRentGoesTo: "issuer", occupancy: null, rent: [], claim: null, reserves: { ...reservesFor("plm"), log: [] }, debt: debt("Demo Bank", 9, 350000, 40, false),
    audit: [{ at: "2026-10-20T10:00:00Z", kind: "valuation", text: "Underwriting valuation published" }],
  },
};
