# Investor dashboard: backend gaps

The Go backend currently has only config and DB plumbing (no HTTP routes, models or auth user).
`lib/portfolio.ts` defines the contract the dashboard needs; `getPortfolio()` returns "unavailable" until it is wired.

| Dashboard need | Required endpoint / data |
|---|---|
| Investor name, tUSD balance | `GET /v1/investor/me` (session user, custodial wallet balance) |
| Holdings (shares, issued supply, acquisition cost, latest NAV, token, unit/tower/city, image, occupancy) | `GET /v1/investor/holdings` |
| Valuation history (value + invested per date) | `GET /v1/investor/portfolio/history` (published NAV points only) |
| Rent per property per month, rent earned | Derived from rent-per-share accumulator events |
| Distributions + claim status (deposited vs claimable vs claimed) | `GET /v1/investor/distributions`, `POST /v1/investor/distributions/{id}/claim` |
| FX quotes + FX impact | `GET /v1/fx/quotes?base=INR` and per-display-currency impact on holdings |
| Activity (purchase, sale, rent, NAV, wallet, subscription, tx ref) | `GET /v1/investor/activity` |
| Open offerings | `GET /v1/offerings?status=open` |
| Property detail page | built at `/investor/marketplace/[id]`; needs `GET /v1/properties/{id}` (see `lib/property.ts` for the full shape) |

Set `NEXT_PUBLIC_DEMO_DATA=1` to render the illustrative fixture (`lib/demo-portfolio.ts`).

## Wallet and Portfolio pages

Both read `Account` from `lib/account.ts` (`GET /v1/investor/account`): wallet address/network/allowlist status, tUSD available/locked,
faucet limit and next-available time, per-property token balances (locked, restricted), holdings (with status and last market price),
value history including cumulative rent, rent lines per month (record date, units at record date, status, expiry, reduced/skipped reason),
open orders/listings/subscriptions, and transactions (type, fee, counterparty, hash, fail reason, cost basis, realised gain).
Actions needing endpoints: mint test funds, deposit, withdraw, claim rent, cancel order/listing, retry tx, connect own wallet.
Demo states: append `?demo=pending|frozen|empty` to either page.
