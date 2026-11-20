# ADR 0006: Single settlement token (tUSD) with FX quotes

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Offerings are priced in a local currency (INR for Skyline Towers), but Investors may think in USD. Contracts need one unit to settle subscriptions, trades and rent. See [03-pricing-and-fx.md](../03-pricing-and-fx.md).

## Decision

All on-chain settlement uses one test stablecoin, tUSD (6 decimals). Each Offering keeps its own pricing currency. Conversion happens off-chain through an FX quote service: mid rate (Frankfurter or a static table), a visible spread, and a 60-second expiry. Rent is collected in local currency, converted to tUSD at deposit time with the rate recorded, and claimed in tUSD. The portfolio shows asset-currency value, display-currency value and FX gain/loss separately.

## Consequences

- One payment path in the contracts.
- A stablecoin is a payment rail, not a hedge; the UI says so and shows FX effects.
- Quotes must be stored and validated (expiry, single use).
- Reference rates are not tradable prices; a real product needs a licensed conversion provider (to verify).
- The alternative of one stablecoin per currency stays open: [open-questions.md](../open-questions.md), Q3.

## Alternatives considered

- **One stablecoin per currency (tINR, tUSD):** closer to local-currency reality, but multiplies contracts and liquidity. Deferred.
- **Pay in INR only, no FX:** simpler, but removes the multi-currency demonstration. Rejected.
