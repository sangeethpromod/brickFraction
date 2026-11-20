// Property detail + marketplace contract. As with lib/portfolio.ts, the Go backend has no routes yet, so loaders return
// "unavailable" unless NEXT_PUBLIC_DEMO_DATA=1. Amounts are in `currency` (asset currency).
import type { Offering } from "./portfolio";

export type PropertyStatus = "new-offering" | "operating" | "resale" | "wind-up";
export type RentMonth = {
  month: string; // YYYY-MM
  status: "paid" | "due" | "vacant"; // due = rent owed, not yet received
  gross: number; vacancyLoss: number;
  tax: number; insurance: number; maintenance: number; management: number;
  special: { label: string; amount: number } | null; // one-off expense / capital call
  debtService: number; reserveTopUp: number; platformFee: number;
};
export type PropertyDetail = {
  id: string; name: string; address: string; propertyType: string; spv: string;
  status: PropertyStatus; currency: string;
  // supply
  unitsTotal: number; unitsSold: number; holderCount: number; topHolderPct: number | null; holderCapPct: number | null;
  unsoldRentGoesTo: "issuer" | "reserves" | null; // partially sold: where rent for unsold units goes
  // price
  offeringPrice: number; lastTradePrice: number | null;
  yours: { units: number; cost: number; restrictedUnits: number } | null;
  // media
  photos: string[]; floorPlan: string | null; mapEmbed: string | null; documents: { label: string; href: string | null }[];
  // valuation
  valuation: { appraisedValue: number; debt: number; reserves: number; liabilities: number };
  appraisals: { date: string; value: number; source: string }[];
  staleAfterMonths: number;
  // offering (new-offering only)
  offering: { fundedPct: number; minRaise: number; closesAt: string; refundIfNotMet: boolean; lockupMonths: number | null; projectedMonthlyRent: number; projectedNetYieldPct: number } | null;
  // rent
  occupancy: string | null;
  leases: { tenant: string; term: string; expiry: string; monthlyRent: number }[];
  rent: RentMonth[]; // empty for new offerings
  recordDateNote: string; // who gets a month's rent when units change hands
  claim: { claimed: number; unclaimed: number; expiresAt: string | null; onExpiry: string } | null;
  distributionsPaused: boolean;
  windUp: { finalDistribution: number | null } | null;
  // reserves & debt
  reserves: { target: number; targetMonths: number; log: { date: string; label: string; amount: number }[] } | null;
  debt: {
    lender: string; ratePct: number; maturity: string; monthlyService: number;
    ltvCovenantPct: number; dscrCovenant: number; onBreach: string; refinanced: { date: string; note: string }[];
  } | null;
  // market & legal
  market: { listings: { units: number; price: number }[]; trades: { date: string; units: number; price: number }[] };
  risks: string[]; tokenAddress: string | null; distributorAddress: string | null; explorerBase: string | null;
  audit: { at: string; kind: "rent" | "valuation" | "debt" | "freeze" | "other"; text: string }[];
};

export type PropertyResult = { status: "ok"; data: PropertyDetail } | { status: "notfound" } | { status: "unavailable" };
export type MarketplaceResult = { status: "ok"; currency: string; offerings: Offering[] } | { status: "unavailable" };

const demo = () => process.env.NEXT_PUBLIC_DEMO_DATA === "1";

export async function getProperty(id: string): Promise<PropertyResult> {
  if (!demo()) return { status: "unavailable" }; // TODO: GET /v1/properties/{id}
  const { DEMO_PROPERTIES } = await import("./demo-properties");
  const data = DEMO_PROPERTIES[id];
  return data ? { status: "ok", data } : { status: "notfound" };
}
export async function getMarketplace(): Promise<MarketplaceResult> {
  if (!demo()) return { status: "unavailable" }; // TODO: GET /v1/offerings and /v1/listings
  const { DEMO_PORTFOLIO } = await import("./demo-portfolio");
  return { status: "ok", currency: DEMO_PORTFOLIO.assetCurrency, offerings: DEMO_PORTFOLIO.offerings };
}

// ---- derived figures ----
export const equity = (v: PropertyDetail["valuation"]) => v.appraisedValue - v.debt + v.reserves - v.liabilities;
export const navPerUnit = (p: PropertyDetail) => equity(p.valuation) / p.unitsTotal;
export const opex = (m: RentMonth) => m.tax + m.insurance + m.maintenance + m.management + (m.special?.amount ?? 0);
/** Distributable rent for a month; 0 when the month is vacant/unpaid or distributions are paused. */
export const distributable = (m: RentMonth) =>
  m.status === "paid" ? Math.max(0, m.gross - m.vacancyLoss - opex(m) - m.debtService - m.reserveTopUp - m.platformFee) : 0;
const last12 = (p: PropertyDetail) => p.rent.slice(-12);
export const grossYieldPct = (p: PropertyDetail) => {
  const r = last12(p);
  return r.length ? ((r.reduce((s, m) => s + m.gross, 0) / r.length) * 12 / p.valuation.appraisedValue) * 100 : null;
};
export const netYieldPct = (p: PropertyDetail) => {
  const r = last12(p);
  return r.length ? ((r.reduce((s, m) => s + distributable(m), 0) / r.length) * 12 / equity(p.valuation)) * 100 : null;
};
export const ltvPct = (p: PropertyDetail) => (p.valuation.debt / p.valuation.appraisedValue) * 100;
/** NOI ÷ debt service for the latest paid month. */
export const dscr = (p: PropertyDetail) => {
  const m = [...p.rent].reverse().find((x) => x.status === "paid");
  return m && p.debt ? (m.gross - m.vacancyLoss - (m.tax + m.insurance + m.maintenance + m.management)) / p.debt.monthlyService : null;
};
/** Months the reserve covers debt service + fixed costs with zero rent. */
export const runwayMonths = (p: PropertyDetail) => {
  const m = p.rent[p.rent.length - 1];
  const burn = (p.debt?.monthlyService ?? 0) + (m ? m.tax + m.insurance + m.management : 0);
  return burn ? p.valuation.reserves / burn : null;
};
export const monthsSince = (iso: string) => (Date.now() - Date.parse(iso)) / (30.44 * 864e5);
export const isStale = (p: PropertyDetail) => {
  const a = p.appraisals[p.appraisals.length - 1];
  return !!a && monthsSince(a.date) > p.staleAfterMonths;
};
