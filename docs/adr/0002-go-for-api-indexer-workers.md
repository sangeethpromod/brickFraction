# ADR 0002: Go for the API, indexer and workers

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

The backend has three long-running roles: an HTTP API, a chain indexer and queue workers. All three talk to Postgres and to an Ethereum node. See [04-architecture.md](../04-architecture.md).

## Decision

Write all three in Go in one module, as separate binaries (`cmd/api`, `cmd/worker`, `cmd/indexer`). Use chi or Echo for HTTP, `pgx` and `sqlc` for typed SQL, and `go-ethereum` with `abigen` for typed contract bindings generated from Foundry's ABI output.

## Consequences

- One language and one set of types for API, indexer and workers; contract bindings are compile-checked.
- Small static binaries and simple containers.
- The web app is TypeScript, so API types are shared through an OpenAPI spec or generated clients, not shared code.
- Team needs Go knowledge.

## Alternatives considered

- **Node/TypeScript backend:** one language across the stack, but weaker typing for SQL and bindings and more runtime overhead for the indexer. Rejected.
- **Rust:** strong guarantees, slower to build for a demo. Rejected.
