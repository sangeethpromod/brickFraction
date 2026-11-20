// Investor portfolio contract + derived maths + loader.
// The Go backend has no portfolio endpoints yet (only config/db plumbing), so getPortfolio() returns
// "unavailable" unless NEXT_PUBLIC_DEMO_DATA=1. Required endpoints are listed in docs/dashboard-api-gaps.md.

export type Holding = {
  id: string; name: string; unit: string; city: string; token: string; image: string | null;
  canSell: boolean; // resale-eligible per backend rules
  sharesOwned: number; sharesIssued: number;
  acquisitionCost: number; navPerShare: number; // asset currency
  rentEarned: number; monthlyNetRent: number | null; // rent-per-share accumulator * shares, asset currency
  occupancy: string | null;
  status?: "operating" | "funding" | "paused"; // default operating; funding = subscribed, offering not closed
  marketPrice?: number | null; // last secondary trade per unit; holdings are valued at NAV, never at this
};
export type HistoryPoint = { t: string; value: number; invested: number | null; rentCum?: number | null }; // ISO date
export type RentMonth = { month: string; byProperty: Record<string, number> }; // YYYY-MM
export type Distribution = {
  propertyId: string; period: string; netRent: number; yourShare: number;
  status: "claimed" | "claimable" | "pending"; // pending = deposited but not yet claimable
};
export type Activity = {
  id: string; at: string; kind: "purchase" | "sale" | "rent" | "nav" | "wallet" | "subscription";
  label: string; token: string | null; amount: number | null; status: "confirmed" | "pending" | "failed"; ref: string;
};
export type Offering = {
  id: string; name: string; city: string; image: string | null; kind: "primary" | "resale";
  pricePerShare: number; minInvestment: number;
  yieldPct: number | null; // primary = target (indicative), resale = historical; null = not published
  fundedPct: number | null; closesAt: string | null; // primary offerings only
};
export type Portfolio = {
  investor: { name: string };
  assetCurrency: string;
  // Display-currency quotes. impact = FX effect on holdings value, in the display currency (null = not quoted).
  fx: Record<string, { rate: number; impact: number | null }>;
  tusdBalance: number | null;
  holdings: Holding[];
  history: HistoryPoint[];
  rentHistory: RentMonth[];
  distributions: Distribution[];
  activity: Activity[];
  offerings: Offering[];
};
export type PortfolioResult = { status: "ok"; data: Portfolio } | { status: "unavailable" };

export async function getPortfolio(): Promise<PortfolioResult> {
  if (process.env.NEXT_PUBLIC_DEMO_DATA === "1") {
    const { DEMO_PORTFOLIO } = await import("./demo-portfolio");
    return { status: "ok", data: DEMO_PORTFOLIO };
  }
  return { status: "unavailable" }; // TODO: fetch `${NEXT_PUBLIC_API_URL}/v1/investor/portfolio` once it exists
}

// ---- derived figures (all asset currency) ----
export const holdingValue = (h: Holding) => h.sharesOwned * h.navPerShare;
export const ownershipPct = (h: Holding) => (h.sharesOwned / h.sharesIssued) * 100;
/** Annualised net rent / current value. Null when the rent isn't known. */
export const yieldPct = (h: Holding) => {
  const v = holdingValue(h);
  return h.monthlyNetRent == null || v === 0 ? null : ((h.monthlyNetRent * 12) / v) * 100;
};
export function totals(p: Pick<Portfolio, "holdings">) {
  const value = p.holdings.reduce((s, h) => s + holdingValue(h), 0);
  const invested = p.holdings.reduce((s, h) => s + h.acquisitionCost, 0);
  const rent = p.holdings.reduce((s, h) => s + h.rentEarned, 0);
  const gain = value - invested;
  return {
    value, invested, rent, gain,
    gainPct: invested ? (gain / invested) * 100 : 0,
    // Methodology: (value − cost + rent) / cost. Excludes FX; no time-weighting.
    returnPct: invested ? ((gain + rent) / invested) * 100 : 0,
    shares: p.holdings.reduce((s, h) => s + h.sharesOwned, 0),
  };
}

// ---- formatting ----
const LOCALE: Record<string, string> = { INR: "en-IN", USD: "en-US", EUR: "de-DE" };
export const money = (n: number, cur: string, digits = 0) =>
  new Intl.NumberFormat(LOCALE[cur] ?? "en-US", { style: "currency", currency: cur, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const pct = (n: number, d = 2) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(d)}%`;
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
export const monthLabel = (ym: string) => new Date(`${ym}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

/** Format an asset-currency amount in the chosen display currency. */
export type Fmt = (assetAmount: number, digits?: number) => string;
export function makeFmt(p: Portfolio, display: string): Fmt {
  const rate = display === p.assetCurrency ? 1 : (p.fx[display]?.rate ?? 1);
  return (n, digits = 0) => money(n * rate, display, digits);
}

export const RANGE_DAYS = { "1W": 7, "1M": 30, "3M": 91, "6M": 182, "1Y": 365, ALL: Infinity } as const;
export type RangeKey = keyof typeof RANGE_DAYS;
