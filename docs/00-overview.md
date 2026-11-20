# 00 - Overview

> **Demo disclaimer:** This is a technical simulation on a local chain (Anvil) or a testnet. It is not a real offering, not investment advice, and moves no real money or real property rights.

Radisson Fractional is a local, open-source demo that shows how a real-estate developer (the Issuer) could split a flat or villa into tokenized Shares, sell them to many Investors, and pay out net rent in a test stablecoin (tUSD). Everything runs with `docker compose up` on one machine: a Postgres database, a Go backend, a Next.js UI, and a local Ethereum chain (Anvil). This file explains what the project is, what is in and out of scope, the two tokens, and the vocabulary used in every other doc.

## What and why

Buying a ₹2,00,00,000 flat is out of reach for most people. The demo explores one idea: represent ownership of one real-estate asset as 100,000 on-chain Shares, let many people hold small slices, and distribute rent automatically and verifiably.

The demo answers practical engineering questions, not legal ones:

- How do you model Property > Tower > Unit and sell it at different granularities (one unit, one tower, a bundle)?
- How do you pay rent to holders who buy and sell during the month, without anyone claiming rent from before they owned the Share?
- How do you keep transfers restricted to approved (allowlisted) investors?
- How do you show an Investor value in the asset's currency (INR), their display currency (USD) and the FX effect separately?

### Running example

Every doc uses the same two offerings:

| | Skyline Towers flat 1204 | Palm Villas V-07 |
|---|---|---|
| City | Mumbai | Mumbai |
| Type | 2 BHK flat, floor 12 | 3 BHK villa |
| Valuation | ₹2,00,00,000 | ₹5,00,00,000 |
| Shares | 100,000 | 100,000 |
| Rent | ₹60,000 / month | ₹1,50,000 / month |
| Token symbol | `SKY-1204` | `PLM-V07` |

Flat 1204 has five co-owners: Asha (40,000 Shares), Bilal (25,000), Chitra (20,000), Dev (10,000), Esha (5,000). All amounts are illustrative.

## Scope

### In scope

- Property, Tower, Unit and Offering management, with valuation and compliance approval.
- Primary sale into escrow with a minimum raise, then mint-or-refund.
- Permissioned Share tokens (one per Offering) and an allowlist.
- Rent loop: lease, simulated tenant payment, expense recording, net distributable rent, deposit, claim.
- Secondary marketplace with an atomic Share-for-tUSD swap.
- Custodial wallets, simulated KYC, admin freeze and forced transfer with an audit log.
- FX quotes with a visible spread, and portfolio views in asset and display currency.

### Out of scope

- Real money, real KYC providers, real banks, real on/off-ramps.
- Any legal structuring (SPV formation, registration, trustee arrangements).
- Mainnet deployment, audits, production key custody.
- Tax reporting beyond demo-grade reports.
- Mobile apps.

## Two tokens

| Token | What it is | Per | Decimals | Standard |
|---|---|---|---|---|
| **Property Share token** (e.g. `SKY-1204`) | One Share = one fractional claim on an Offering's rent and sale proceeds | One per Offering | 0 (whole Shares only) | ERC-20 with transfer restrictions |
| **tUSD** | Test stablecoin used for all payments and rent payouts | One for the whole platform | 6 | ERC-20 (mintable by the faucet) |

Decimals are demo defaults, listed in [open-questions.md](open-questions.md) (Q15). See [05-contracts.md](05-contracts.md) for the contracts and [03-pricing-and-fx.md](03-pricing-and-fx.md) for why there is a single settlement token.

## Custodial wallet caveat

Investors do not install a wallet. The platform generates a wallet per Investor at sign-up and holds the key, encrypted in Postgres, behind a `Signer` interface. This is a deliberate shortcut to make the demo usable. It means the platform can move any Investor's funds. A real product would need regulated custody or user-controlled keys; that is a legal and security question to verify, not something this demo solves. See [ADR 0007](adr/0007-custodial-wallets-for-demo.md).

## Real-world caveats (to verify, not facts)

The demo ignores real-world constraints. Anyone turning this into a product must verify, with qualified advisers in each jurisdiction:

- **Legal structuring:** whether Shares represent SPV equity, units in a trust, or something else, and who legally holds title to the flat.
- **Securities law:** whether the Shares count as securities and what licences, disclosures and investor limits apply.
- **KYC/AML and on/off-ramps:** these need licensed providers; the simulated KYC here proves nothing.
- **FX, crypto tax and regulation:** how stablecoin holdings, conversions and payouts are taxed and regulated.
- **Foreign ownership limits:** restrictions on non-resident or foreign investors owning Indian real estate.

## Glossary

| Term | Meaning |
|---|---|
| **Issuer** | The entity selling Shares; in the demo, Radisson (or an SPV it controls). |
| **Property Manager** | Operates the asset: leases, collects rent, records expenses, deposits net rent. A separate role from Issuer. |
| **Investor** | A person who buys, holds, sells Shares and claims rent. |
| **Tenant** | Occupant who pays rent (simulated). |
| **Valuer** | Independent party who submits a valuation for a Property or Unit. |
| **Platform Admin** | Compliance/operations user: approves investors and properties, freezes wallets, forces transfers. |
| **Property** | A real-estate asset held by an SPV in a city and currency, e.g. "Skyline Towers". |
| **Tower** | A building inside a Property. Villa communities use a villa cluster in its place (see [02-domain-model.md](02-domain-model.md)). |
| **Unit** | A flat or villa: BHK, floor, area, valuation. |
| **Offering** | A sale of Shares covering a unit, tower, property or bundle, with price, minimum raise and closing date. Each Offering has its own token. |
| **Share** | One unit of an Offering's token. Skyline flat 1204 has 100,000. |
| **Rent Pool** | The set of units whose net rent is combined before being split among Offerings (unit, tower or property). |
| **NAV** | Net asset value per Share: (property value - debt + reserve) / total Shares, from the latest valuation. |
| **tUSD** | The test stablecoin used for every payment on the platform. |
| **Allowlist** | On-chain list of wallets allowed to hold Shares (IdentityRegistry). |
| **Escrow** | Contract that holds subscription money until the Offering closes. |
| **Accumulator** | The rent-per-share counter that makes mid-period transfers safe ([ADR 0008](adr/0008-rent-per-share-accumulator.md)). |
| **SPV** | Special purpose vehicle: a company that owns one property. |
| **BHK** | Bedrooms, hall, kitchen: the Indian flat-size convention (2 BHK = two bedrooms). |

## Map of the docs

| Doc | Read it for |
|---|---|
| [01-roles-and-journeys.md](01-roles-and-journeys.md) | Who does what, step-by-step flows with sequence diagrams |
| [02-domain-model.md](02-domain-model.md) | Hierarchy, Offerings, schema, edge cases with worked numbers |
| [03-pricing-and-fx.md](03-pricing-and-fx.md) | Valuation, price per Share, NAV vs market, FX |
| [04-architecture.md](04-architecture.md) | Stack, components, queue, signer, indexer |
| [05-contracts.md](05-contracts.md) | Solidity contracts, invariants, worked claim example |
| [06-screens.md](06-screens.md) | 21 screens, states, API/contract mapping |
| [adr/](adr/README.md) | One file per architecture decision |
| [open-questions.md](open-questions.md) | Undecided items |
