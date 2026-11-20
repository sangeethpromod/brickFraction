# 03 - Pricing and FX

> **Demo disclaimer:** This is a technical simulation on a local chain (Anvil) or a testnet. It is not a real offering, not investment advice, and moves no real money. All rates and fees are illustrative.

This file explains how a Unit is valued, how an Offering's size and price per Share are derived, how NAV differs from the marketplace price, and how multi-currency works on a single settlement token (tUSD). The running example is flat 1204 in Skyline Towers (₹2,00,00,000, 100,000 Shares). Domain terms are in [00-overview.md](00-overview.md), data model in [02-domain-model.md](02-domain-model.md).

## Valuation methods

A Valuer submits one valuation per Unit, stating the method. The method and report reference are stored with it.

| Method | How | Fits |
|---|---|---|
| **Comparable sales** | Recent sale prices of similar flats nearby, adjusted for floor, area, age. Example: three 2 BHK flats in the same tower sold at ₹1.95 to ₹2.05 crore, so ₹2,00,00,000. | Flats in established towers |
| **Income approach** | Value = NOI / cap rate. Example: NOI ₹6,22,400 per year at a 3.1% cap rate gives ≈ ₹2,00,77,000. | Rented units, to cross-check the comparables |
| **Replacement cost** | Land value + cost to rebuild - depreciation. | Villas, unique assets with few comparables |

The demo stores the value and method; it does not compute them. Which method is authoritative per asset type is a business choice, not modeled.

## Offering size and price per Share

```
offering_size = property_value - debt + acquisition_costs + platform_fee + reserve
price_per_share = offering_size / total_shares
```

Worked example for flat 1204 (assumed percentages; verify real stamp duty, registration and fees):

| Item | Basis | ₹ |
|---|---|---|
| Property value | Valuation | 2,00,00,000 |
| - Debt | None | 0 |
| + Acquisition costs | 1% (stamp duty, registration, legal) | 2,00,000 |
| + Platform fee | 1% | 2,00,000 |
| + Reserve | 0.5% (cushion for vacancy and repairs) | 1,00,000 |
| **Offering size** | | **2,05,00,000** |
| Total Shares | | 100,000 |
| **Price per Share** | 2,05,00,000 / 100,000 | **₹205** |
| Minimum ticket | 500 Shares | ₹1,02,500 |

Initial NAV per Share is ₹200 (value / Shares). The ₹5 gap is costs and reserve, which is why a buyer sees a small day-one drop against NAV.

### Yield on the example

| | Per year (₹) | Yield on ₹2,00,00,000 |
|---|---|---|
| Gross rent: 60,000 x 12 | 7,20,000 | **3.6%** |
| Management fee 8% | -57,600 | |
| Maintenance and property tax | -40,000 | |
| **Net rent** | **6,22,400** | **≈ 3.1%** (3.04% on the ₹2,05,00,000 size) |

Net rent per month is ₹51,866.67; per Share per month that is **≈ ₹0.52** (₹0.5187). In tUSD at the rate below, a 500-Share ticket earns about 3.07 tUSD per month.

## NAV vs market price

| | NAV | Market price |
|---|---|---|
| Source | Periodic revaluation by a Valuer | Marketplace orders by Investors |
| Changes | When a new valuation is approved | Every order |
| Formula | (value - debt + reserve) / total Shares | Seller's limit price |
| Use | Portfolio value, marketplace band | Secondary trades |

The marketplace restricts a listing to a **band around NAV**, for example ±10%. With NAV ₹200 the allowed range is ₹180 to ₹220 per Share. Whether to use a band at all, or let the price float, is open: [open-questions.md](open-questions.md), Q5. Because contracts settle in tUSD, an on-chain band needs NAV in tUSD, which drifts with the exchange rate between NAV updates (Q11).

## FX

### Principles

- **The stablecoin is a payment rail, not a hedge.** tUSD does not protect an INR asset from INR moving against USD. It only makes settlement uniform.
- **Each Offering is priced in its own currency.** Flat 1204 is priced in INR.
- **Everything settles on-chain in tUSD:** subscriptions, marketplace trades, rent deposits, claims.
- Alternative of one stablecoin per currency: [ADR 0006](adr/0006-single-settlement-token-tusd-with-fx-quotes.md) and [open-questions.md](open-questions.md), Q3.

### FX quote service

A quote is a short-lived, server-signed price:

```json
{
  "quote_id": "q_01HV...",
  "pair": "INR/USD",
  "mid_rate": "85.00",
  "spread_bps": 50,
  "effective_rate": "84.575",
  "expires_at": "2026-11-17T10:15:00Z"
}
```

- `mid_rate` is INR per 1 USD. The source is **Frankfurter** (free ECB-based reference rates, updated daily, so not a live market rate) or a **static table** for offline demos. The `refresh_fx` background job fetches it ([04-architecture.md](04-architecture.md)).
- The **spread/fee is visible** to the user. The effective rate is worse than mid for whoever converts: 85.00 x (1 - 0.005) = 84.575 INR per USD.
- A quote **expires after 60 seconds**. Executing with an expired or reused `quote_id` is rejected.
- Rates are stored as `NUMERIC(18,8)`; no floats.

### Subscription example (Investor pays in tUSD, asset priced in INR)

Price ₹205 per Share, 500 Shares = ₹1,02,500.

- Effective rate 84.575 -> 102,500 / 84.575 = **1,211.98 tUSD** (2.42388 tUSD per Share).
- At mid, the same amount would be 102,500 / 85 = 1,205.88 tUSD. The 6.10 tUSD difference is the visible spread.

### Rent example (Issuer collects INR, Investors claim tUSD)

1. Tenant pays ₹60,000. The Property Manager records the waterfall: net ₹51,866.67.
2. At deposit time the manager takes a quote: mid 85.00, effective 84.575.
3. ₹51,866.67 / 84.575 = **613.262 tUSD** is deposited once. The deposit row stores net INR, the rate (84.575) and the tUSD amount.
4. Investors claim tUSD. A 500-Share holder claims 500 / 100,000 x 613.262 = 3.0663 tUSD.

### Off-ramp (mock)

Investors can see what their tUSD would be worth in INR. A mock quote uses mid 85.00 with a 1.0% combined spread and fee: 1,000 tUSD -> 1,000 x 85.00 x 0.99 = **₹84,150**. No money moves; a real off-ramp needs a licensed provider.

### Portfolio: three separate numbers

The portfolio shows, per holding:

1. **Asset-currency value:** Shares x NAV in INR.
2. **Display-currency value:** that value converted at the current mid rate to the Investor's display currency (USD).
3. **FX gain/loss:** the part of the USD change caused by the exchange rate, shown separately from asset gain/loss.

Example: a 500-Share ticket bought for 1,211.98 tUSD at mid 85.00 and effective 84.575. Six months later NAV is unchanged at ₹200 and mid is 88.00.

| Component | INR | USD |
|---|---|---|
| Cost | 1,02,500 | 1,211.98 |
| Current asset value (500 x ₹200) | 1,00,000 | 1,136.36 (at 88.00) |
| **Asset gain/loss** (NAV 200 vs price 205), valued at purchase mid 85.00 | -2,500 | -29.41 |
| **Spread/fee paid** (1,211.98 vs 1,205.88 at mid) | | -6.10 |
| **FX gain/loss** (100,000 INR at 88.00 vs 85.00) | | -40.11 |
| **Total** | | **-75.62** |

Check: -29.41 - 6.10 - 40.11 = -75.62 = 1,136.36 - 1,211.98. The rupee weakening cost more than the asset's own movement; rent income is tracked separately.

## Caveats to verify

These are not facts and the demo does not handle them:

- **Legal structuring:** what Shares legally represent and who holds title.
- **Securities law:** whether and how such Shares can be offered, and to whom.
- **Licensed KYC and on/off-ramps:** real conversions need regulated providers.
- **FX and crypto tax/regulation:** treatment of stablecoin holdings, conversion gains, and cross-border flows (including central-bank rules on remittances).
- **Foreign ownership limits:** limits on non-resident or foreign investors in Indian real estate.
- **Reference-rate accuracy:** Frankfurter publishes daily reference rates, not tradable prices.
