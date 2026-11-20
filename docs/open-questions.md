# Open questions

> **Demo disclaimer:** This is a technical simulation on a local chain (Anvil) or a testnet. It is not a real offering, not investment advice, and moves no real money.

This file lists decisions the docs deliberately leave open. Each row has the options, a current leaning (a leaning is not a decision), an owner role and a status. Other docs link here instead of picking an answer. Q1-Q9 were requested up front; Q10-Q16 were added while writing the docs. Ownership is by role because no people are assigned yet.

| ID | Question | Options | Current leaning | Owner | Status |
|---|---|---|---|---|---|
| Q1 | Which Offering levels ship in the MVP? | (a) whole-property + per-unit only; (b) add per-tower and bundles | (a), towers later. See [02-domain-model.md](02-domain-model.md) | Product | Open |
| Q2 | Default rent pooling | (a) per Offering/unit (vacancy hits that unit's holders); (b) pooled per tower or property | Per unit for MVP, pooled as an option. See [02-domain-model.md](02-domain-model.md) edge case 4 | Product | Open |
| Q3 | Settlement token | (a) one tUSD with FX quotes; (b) one stablecoin per currency (tINR, tUSD) | (a). See [ADR 0006](adr/0006-single-settlement-token-tusd-with-fx-quotes.md) | Contracts | Open |
| Q4 | Tenant portal | (a) Tenant clicks "Pay rent" (simulated); (b) manager enters payments by hand | (a) for demo value, (b) as fallback | Product | Open |
| Q5 | Marketplace pricing | (a) free price; (b) band around NAV (e.g. ±10%) | (b). Needs on-chain NAV, see Q11. See [03-pricing-and-fx.md](03-pricing-and-fx.md) | Product | Open |
| Q6 | Minimum raise behavior at close | (a) fail and refund below minimum, mint what sold above it (Issuer keeps the rest); (b) fail below minimum, downsize supply to what sold; (c) Issuer may top up | (a). See [02-domain-model.md](02-domain-model.md) edge case 8 | Product | Open |
| Q7 | Issuer retained stake percentage | (a) 0%; (b) fixed, e.g. 10-20%, minted to the Issuer at close; (c) set per Offering | (c), default to be chosen | Product | Open |
| Q8 | Gas strategy on testnet | (a) top-up job funds each wallet with Sepolia ETH; (b) relayer pays gas via meta-transactions; (c) paymaster (ERC-4337) | (a) for simplicity. See [04-architecture.md](04-architecture.md) | Backend | Open |
| Q9 | Legal form assumptions | SPV equity, trust units, or other. Needs qualified counsel; also securities, KYC, FX/crypto tax, foreign ownership | None. Treated as caveats to verify, not assumptions. See [00-overview.md](00-overview.md) | External legal adviser | Open |
| Q10 | Intra-period rent proration | (a) pay whoever holds at deposit (current design); (b) record date / ex-rent date; (c) day-weighted accrual | (a) for MVP, documented limitation. See [02-domain-model.md](02-domain-model.md) edge case 6 | Contracts | Open |
| Q11 | NAV on-chain and FX drift | NAV is set in tUSD at update time but INR/USD moves between updates, so a ±band goes stale. (a) accept; (b) update NAV on each FX refresh; (c) compute the band off-chain only | (c) if Q5 is (b) | Contracts | Open |
| Q12 | Retired offerings | After a property sale, (a) add a Retired status; (b) keep Closed with a `retired` flag | (b). See [02-domain-model.md](02-domain-model.md) edge case 11 | Product | Open |
| Q13 | Valuer UI | (a) form inside screen 12; (b) dedicated Valuer screen | (a). See [06-screens.md](06-screens.md) | Product | Open |
| Q14 | Pool allocation weights | When rent is pooled, weight by (a) valuation; (b) area; (c) equal | (a) | Product | Open |
| Q15 | Token decimals | Shares: 0 or 18. tUSD: 6 or 18 | Shares 0, tUSD 6. See [05-contracts.md](05-contracts.md) | Contracts | Open |
| Q16 | Oversubscription | (a) hard cap at total Shares, first come first served; (b) allocate pro rata | (a) | Product | Open |

Additional design point without its own ID: whether a frozen wallet may still claim pending rent, and how `adminClaimTo` is authorized in recovery. It is described in [05-contracts.md](05-contracts.md) and should be settled with the compliance rules.
