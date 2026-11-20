# ADR 0005: One token per Offering

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Shares in flat 1204 and villa V-07 have different values, rents, holders and closing dates. Radisson also wants to sell at several levels (unit, tower, property). See [02-domain-model.md](../02-domain-model.md).

## Decision

The `OfferingFactory` deploys one permissioned ERC-20 `PropertyToken` and one `RentDistributor` for every Offering. Shares have 0 decimals. Pooled rent across Offerings is handled off-chain by splitting net rent into per-Offering deposits.

## Consequences

- Clear accounting: a token's holders are exactly the Offering's co-owners, and rent is claimed per Offering.
- Simple contracts; no multi-asset bookkeeping.
- An Investor in several Offerings makes several claims; the UI batches them.
- More deployments (cheap on a local chain; use clones on a real chain).

## Alternatives considered

- **ERC-1155 with one id per Offering:** one contract, but permissioning, per-asset hooks and rent accumulators get more complex. Rejected for the demo.
- **One token for the whole platform:** cannot represent separate assets. Rejected.
