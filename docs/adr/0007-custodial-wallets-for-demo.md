# ADR 0007: Custodial wallets for the demo

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

The audience is people who have never used a crypto wallet. Requiring browser wallets and seed phrases would block the demo. See [04-architecture.md](../04-architecture.md).

## Decision

Generate one wallet per Investor at sign-up. Store the private key encrypted with AES-GCM in Postgres; the master key comes from OpenBao (dev mode) or an environment variable. All signing goes through a `Signer` interface so a KMS or HSM implementation can replace it. The platform pays gas (see [open-questions.md](../open-questions.md), Q8).

## Consequences

- Smooth onboarding: email and password only.
- The platform can move any Investor's funds. This is acceptable only because tokens and money are fake. Real custody is a legal and security matter to verify.
- Enables admin recovery after lost access ([02-domain-model.md](../02-domain-model.md), edge case 10).
- The master key is a single point of failure for the demo.

## Alternatives considered

- **User-controlled wallets (MetaMask, WalletConnect):** the right model for non-custodial use; poor demo onboarding. Possible later as an option.
- **Smart-contract wallets / account abstraction:** more moving parts. Deferred.
