# 06 - Screens

> **Demo disclaimer:** This is a technical simulation on a local chain (Anvil) or a testnet. It is not a real offering, not investment advice, and moves no real money.

The UI has 21 screens grouped by role: Investor (1-10), Issuer (11-14), Property Manager (15-16), Tenant (17), Platform Admin (18-21). Each screen below lists its purpose, key data, primary action and the states it must handle. A shared state catalogue comes first, a placeholder for mockups follows, and the last section maps each screen to API endpoints and contract calls. API paths are proposals; the roles are defined in [01-roles-and-journeys.md](01-roles-and-journeys.md), the contracts in [05-contracts.md](05-contracts.md).

## Shared states

Every screen that reads or writes data handles these. Screens below only call out the ones that matter most.

| State | Behavior |
|---|---|
| Empty | Explains what is missing and offers the next action |
| Loading | Skeleton placeholders, no layout shift |
| Pending tx | Banner with the transaction hash (link to local explorer if available) and status: queued, submitted, confirming |
| Failed with retry | Shows the revert reason or error and a "Retry" button that creates a new intent |
| Frozen wallet | Buying, selling, claiming disabled with an explanation and a support contact |
| Not-yet-approved Investor | Browsing allowed; buying disabled with a link to the approval status (screen 2) |
| Vacant unit | Shows "vacant" and zero rent for that month, not an error |
| Partial funding | Progress bar against the minimum raise and a clear "refund if not reached" note |

## Investor (1-10)

| # | Screen | Purpose | Key data | Primary action | Notable states |
|---|---|---|---|---|---|
| 1 | Sign up / log in | Create an account | Email, password | Sign up | Auth error |
| 2 | KYC and approval status | Complete simulated KYC and see the approval state | KYC step, document upload, admin approval status | Submit KYC | Not-yet-approved (the main state), rejected with reason |
| 3 | Wallet and test funds | Show the custodial wallet and get tUSD | Address, tUSD balance, gas balance | Get test funds | Frozen wallet, faucet limit reached, pending tx |
| 4 | Offering catalog | Browse Open Offerings | Name, city, currency, price per Share, net yield, progress, closing date | Open an Offering | Empty (no Offerings), loading |
| 5 | Offering detail | Decide whether to buy | Property/Unit details, valuation and NAV, price ₹205, minimum ticket 500, rent history, fees, documents | Buy | Partial funding, Failed (refund shown), not-yet-approved |
| 6 | Buy flow | Subscribe (primary) with an FX quote | Shares, cost in INR and tUSD (1,211.98 tUSD for 500 Shares), quote countdown (60 s), spread | Confirm purchase | Quote expired, insufficient tUSD, pending tx with hash, failed with retry |
| 7 | Portfolio | See holdings in aggregate | Per Offering: Shares, asset-currency value, display-currency value, FX gain/loss, unclaimed rent | Open a holding | Empty, frozen wallet |
| 8 | Rent and claims | Claim rent | Claimable per Offering (Asha on `SKY-1204`: 245.3048 tUSD), claim history, deposit rate | Claim / Claim all | Nothing to claim, pending tx, failed with retry, vacant unit (zero month) |
| 9 | Secondary market | List and buy Shares | Order book per Offering, NAV and allowed price band, own orders | Create order / Fill order | Price outside band (rejected), frozen wallet, no orders |
| 10 | Activity and statements | History and export | Subscriptions, trades, claims, refunds with tx hashes | Export statement | Empty, export pending |

## Issuer (11-14)

| # | Screen | Purpose | Key data | Primary action | Notable states |
|---|---|---|---|---|---|
| 11 | Issuer dashboard | Overview | Properties, Offerings by status, funds raised | Create Offering | Empty |
| 12 | Property, Tower, Unit editor | Maintain the asset tree; request valuation | Hierarchy, Unit details, valuation history, approval status | Add Property/Unit | Awaiting compliance approval, valuation missing |
| 13 | Offering builder | Create and publish an Offering | Scope, currency, Shares, price (computed from size), minimum ticket, minimum raise, closing date, rent pool, fees | Save draft / Publish | Draft, validation errors, deploy pending (hash) |
| 14 | Offering monitor | Track and close an Offering | Subscribed Shares vs minimum raise, subscribers, escrow balance | Finalize / Close | Partial funding, Funded, Failed with refund progress |

The Valuer submits valuations through the valuation form in screen 12. Whether that deserves its own screen is open: [open-questions.md](open-questions.md), Q13.

## Property Manager (15-16)

| # | Screen | Purpose | Key data | Primary action | Notable states |
|---|---|---|---|---|---|
| 15 | Leases and rent ledger | Manage leases; record gross rent and expenses | Lease, Tenant, rent due and received, expenses | Record rent / expense | Vacant unit (no lease), overdue |
| 16 | Distribution | Compute net rent and deposit it | Waterfall (₹60,000 → ₹51,866.67), FX quote, tUSD amount (613.262), pool allocation | Deposit to RentDistributor | Negative net (nothing to deposit, deficit carried), quote expired, pending tx, failed with retry |

## Tenant (17)

| # | Screen | Purpose | Key data | Primary action | Notable states |
|---|---|---|---|---|---|
| 17 | Tenant portal | See the lease and pay rent (simulated) | Lease terms, rent due ₹60,000, payment history | Pay rent | Paid, overdue |

Whether the Tenant pays inside the app or the manager enters payments is undecided: [open-questions.md](open-questions.md), Q4.

## Platform Admin (18-21)

| # | Screen | Purpose | Key data | Primary action | Notable states |
|---|---|---|---|---|---|
| 18 | Compliance queue | Approve Investors, Properties, valuations | Pending items, KYC result, documents | Approve / Reject | Empty queue |
| 19 | Wallet controls | Freeze, forced transfer, recovery | Wallet, holdings, frozen flag, pending rent | Freeze / Force transfer (reason required) | Pending tx, failed with retry, reason missing |
| 20 | Audit log | Review every admin action | Actor, action, subject, reason, tx hash, time | Filter / Export | Empty |
| 21 | Reports and operations | Run reports and watch the system | Cap table, deposits and claims, FX conversions, exception report, queue and indexer health | Export report | Export pending, indexer lagging |

## Mockups

Placeholder. Links to be filled when mockups exist.

| Screens | Link |
|---|---|
| 1-3 Onboarding | _TBD_ |
| 4-6 Browse and buy | _TBD_ |
| 7-10 Portfolio, rent, market | _TBD_ |
| 11-14 Issuer | _TBD_ |
| 15-17 Rent loop | _TBD_ |
| 18-21 Admin | _TBD_ |

## Screen to API and contract mapping

Endpoints are proposals under `/api/v1`. "Reads" come from Postgres (indexed state); "Writes" create an intent and enqueue a `submit_tx` job ([04-architecture.md](04-architecture.md)).

| # | Screen | API | Contract call (via worker) |
|---|---|---|---|
| 1 | Sign up / log in | Auth.js; `GET /me` | none |
| 2 | KYC and approval | `POST /kyc`, `GET /kyc/status` | `IdentityRegistry.allow` (on admin approval) |
| 3 | Wallet and test funds | `GET /wallet`, `POST /wallet/faucet` | `tUSD.mint` |
| 4 | Offering catalog | `GET /offerings` | none |
| 5 | Offering detail | `GET /offerings/{id}` | none |
| 6 | Buy flow | `POST /fx/quotes`, `POST /offerings/{id}/subscriptions` | `Marketplace.subscribe` |
| 7 | Portfolio | `GET /portfolio` | none |
| 8 | Rent and claims | `GET /offerings/{id}/claimable`, `POST /offerings/{id}/claims` | `RentDistributor.claim` |
| 9 | Secondary market | `GET /offerings/{id}/orders`, `POST /orders`, `POST /orders/{id}/fills` | `Marketplace.createOrder`, `fill` |
| 10 | Activity and statements | `GET /activity`, `POST /reports/statement` | none (`export_report` job) |
| 11 | Issuer dashboard | `GET /issuer/summary` | none |
| 12 | Property, Tower, Unit editor | `POST /properties`, `/towers`, `/units`, `/units/{id}/valuations` | none |
| 13 | Offering builder | `POST /offerings`, `POST /offerings/{id}/publish` | `OfferingFactory.createOffering` |
| 14 | Offering monitor | `GET /offerings/{id}/subscriptions`, `POST /offerings/{id}/finalize` | `Marketplace.finalize`, `settleBatch`, `refund` |
| 15 | Leases and rent ledger | `POST /leases`, `POST /rent-receipts`, `POST /expenses` | none |
| 16 | Distribution | `POST /fx/quotes`, `POST /offerings/{id}/rent-deposits` | `RentDistributor.deposit` |
| 17 | Tenant portal | `GET /leases/mine`, `POST /rent-payments` | none |
| 18 | Compliance queue | `GET /compliance/queue`, `POST /compliance/{id}/decision` | `IdentityRegistry.allow` / `revoke` |
| 19 | Wallet controls | `POST /admin/wallets/{id}/freeze`, `POST /admin/forced-transfers` | `IdentityRegistry.freeze`, `PropertyToken.forceTransfer`, `RentDistributor.adminClaimTo` |
| 20 | Audit log | `GET /admin/audit` | none |
| 21 | Reports and operations | `POST /reports`, `GET /admin/health` | none (`export_report` job) |
