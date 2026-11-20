# ADR 0009: Separate Issuer and Property Manager roles

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Radisson sells the Shares and also runs the buildings. In a real structure these functions can sit with different parties (a developer sells, a licensed manager collects rent), and the person who raises money should not also control rent records without oversight. See [01-roles-and-journeys.md](../01-roles-and-journeys.md).

## Decision

Model Issuer and Property Manager as separate roles with separate permissions and signer identities. The Issuer creates and closes Offerings and receives raise proceeds. The Property Manager manages leases, records rent and expenses, and holds the `DEPOSITOR_ROLE` on RentDistributors. In seed data, one organization holds both roles through two accounts.

## Consequences

- Cleaner audit trail: who raised money and who handled rent.
- Easy to demonstrate a third-party manager.
- Slightly more setup in the demo.
- Roles are checked in the API and in the contracts (`ISSUER_ROLE`, `DEPOSITOR_ROLE`).

## Alternatives considered

- **One combined "Operator" role:** less to build, but hides a distinction that matters in practice. Rejected.
