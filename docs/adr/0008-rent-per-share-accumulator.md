# ADR 0008: Rent-per-share accumulator

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Holders buy and sell Shares between rent deposits. The distributor must never let a buyer claim rent deposited before they held Shares, must not loop over all holders on deposit, and must not lose or create money through rounding. See [05-contracts.md](../05-contracts.md).

## Decision

`RentDistributor` keeps `accRentPerShare`, scaled by 1e18, which increases on each deposit by `(amount x 1e18 + dust) / totalSupply`. Each wallet stores the accumulator value at its last settlement and a scaled pending balance. The token calls `beforeBalanceChange(from, to)` on every mint, transfer and burn so both wallets settle before balances change. Claims pay whole base units and keep the fraction. The deposit remainder is stored as `dustScaled` and added to the next deposit.

## Consequences

- O(1) deposit and claim cost regardless of holder count.
- Buyers start at the current accumulator and cannot claim earlier deposits.
- The design pays whoever holds at the deposit moment, with no day-weighting inside a period ([open-questions.md](../open-questions.md), Q10).
- Every transfer costs a little extra gas for two settlements.
- Total supply must be greater than 0 at deposit time.

## Alternatives considered

- **Snapshots per deposit (ERC20Snapshot):** exact balances at a record date, but more storage and a snapshot step before each deposit.
- **Push payouts to every holder:** unbounded gas and failure handling. Rejected.
- **Merkle distributions computed off-chain:** cheap deposits, but needs a proof service and trust in the root. Rejected for the demo.
