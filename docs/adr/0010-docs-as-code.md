# ADR 0010: Docs as code

> **Demo disclaimer:** Technical simulation on a local chain or testnet. Not a real offering.

**Status:** Accepted

## Context

Planning decisions were made in conversation and need to survive the conversation. New contributors should be able to read why things are the way they are. See [README](../README.md).

## Decision

Keep documentation in the repository under `/docs` as Markdown, reviewed in pull requests like code. Diagrams use Mermaid so GitHub renders them. Each architecture decision is one file in `docs/adr/` with Title, Status, Context, Decision, Consequences, Alternatives considered. Undecided items go in [open-questions.md](../open-questions.md), not into the text as guesses.

## Consequences

- Docs change in the same pull request as the behavior they describe.
- Diagrams are text and diff cleanly.
- Links are relative and can be checked in CI (a link and Mermaid check is a candidate future job).
- No WYSIWYG editing; some readers prefer a wiki.

## Alternatives considered

- **Wiki (Notion, Confluence):** easy editing but drifts from the code and has no review flow. Rejected.
- **Generated docs site (Docusaurus, MkDocs):** nicer to browse; unnecessary for now, and the Markdown here would migrate directly.
