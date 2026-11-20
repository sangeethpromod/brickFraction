# ADR 0004: Foundry and Anvil

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

The contracts ([05-contracts.md](../05-contracts.md)) need fast tests, fuzz and invariant testing, scripted deployment and a local chain that starts in a container with funded accounts.

## Decision

Use Foundry: `forge` for build, test (including fuzz and invariant tests) and deployment scripts, and Anvil as the local chain. OpenZeppelin provides ERC-20, access control and utilities. Sepolia is the optional testnet target.

## Consequences

- Tests are written in Solidity and run in milliseconds.
- Anvil supports cheat RPCs (`anvil_setBalance`, time travel) that make the demo easy to drive, for example moving time to a closing date.
- ABI output feeds `abigen` for the Go backend ([ADR 0002](0002-go-for-api-indexer-workers.md)).
- Anvil's behavior differs from a real network (no reorgs by default, instant blocks); the indexer must still be written defensively.

## Alternatives considered

- **Hardhat:** larger JavaScript ecosystem, slower tests, weaker built-in invariant testing. Rejected.
- **Ganache:** unmaintained. Rejected.
