# ADR 0003: River queue, no Redis initially

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Several operations must run in the background: sending transactions with managed nonces, waiting for confirmations, simulated KYC, notifications, report exports and FX refresh. Each is triggered by a database write, and losing or duplicating a job has money consequences. See [04-architecture.md](../04-architecture.md).

## Decision

Use River, a Postgres-backed job queue for Go. Enqueue jobs in the same transaction that writes the intent row. Do not run Redis in the initial stack.

## Consequences

- Transactional enqueue: no intent without a job, no job without an intent.
- One fewer service in Docker Compose.
- Throughput is bounded by Postgres; fine for a demo.
- Redis is added only when needed: multiple API replicas needing shared rate limiting or WebSocket fan-out, a measured cache need, or queue throughput beyond Postgres.

## Alternatives considered

- **Redis + Asynq/BullMQ:** more mature at high throughput but needs a second datastore and loses transactional enqueue. Rejected for now.
- **Cron plus polling tables:** no retries or visibility. Rejected.
