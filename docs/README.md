# Radisson Fractional documentation

> **Demo disclaimer:** This is a technical simulation on a local chain (Anvil) or a testnet. It is not a real offering, not investment advice, and moves no real money.

Radisson Fractional is a local, open-source demo of tokenized fractional property ownership with stablecoin rent payouts. These docs describe what it does, how it is modeled, how it is built, and what is still undecided. Running example throughout: Radisson Mumbai "Skyline Towers" flat 1204 (₹2,00,00,000, 100,000 Shares, ₹60,000 rent per month, 5 co-owners) and the villa "Palm Villas V-07".

## Reading order

1. [00-overview.md](00-overview.md): what and why, scope, tokens, glossary.
2. [01-roles-and-journeys.md](01-roles-and-journeys.md): roles and the main flows.
3. [02-domain-model.md](02-domain-model.md): hierarchy, Offerings, schema, edge cases.
4. [03-pricing-and-fx.md](03-pricing-and-fx.md): valuation, price per Share, NAV, FX.
5. [04-architecture.md](04-architecture.md): stack, components, queue, indexer.
6. [05-contracts.md](05-contracts.md): Solidity contracts and invariants.
7. [06-screens.md](06-screens.md): the 21 screens and their API/contract mapping.
8. [adr/](adr/README.md): decision records.
9. [open-questions.md](open-questions.md): what is not decided.

## Conventions

- No floats for money. Postgres `NUMERIC`; on-chain `uint256` stored as `NUMERIC(78,0)`.
- Terms: Issuer, Property Manager, Investor, Tenant, Valuer, Platform Admin; Property > Tower > Unit; Offering; Share; Rent Pool; NAV; tUSD.
- Real-world legal, tax and regulatory points are caveats to verify, never assumed facts.
