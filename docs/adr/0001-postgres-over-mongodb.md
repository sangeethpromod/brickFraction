# ADR 0001: Postgres over MongoDB

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

The demo stores properties, Offerings, holdings, rent deposits, claims, FX quotes and an audit log. Money and ownership updates touch several rows at once (a rent deposit writes the deposit, ledger entries and allocation records). Amounts range from paise to `uint256` token units. See [02-domain-model.md](../02-domain-model.md).

## Decision

Use PostgreSQL as the single datastore. Fiat amounts are `NUMERIC(24,2)`, on-chain amounts `NUMERIC(78,0)`. A double-entry ledger table records money movements. Foreign keys and `CHECK` constraints enforce the hierarchy and status values.

## Consequences

- Multi-row atomic updates with real transactions.
- Exact decimal arithmetic; no floats anywhere.
- The same database hosts the job queue ([ADR 0003](0003-river-queue-no-redis-initially.md)).
- Schema changes need migrations; flexible documents (KYC payloads, valuation reports) go in `jsonb` columns or in MinIO.

## Alternatives considered

- **MongoDB:** flexible schema, but multi-document transactions are heavier, money needs `Decimal128` discipline, and the data is relational (Property > Tower > Unit > Offering). Rejected.
- **SQLite:** too limited for concurrent workers and the indexer. Rejected.
