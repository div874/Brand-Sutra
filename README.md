# Brand Sutra — AI Brand Governance

Brand Sutra helps marketing teams check content against approved brand rules before publishing. It flags possible tone and terminology violations, potential conflicts with approved facts, explains findings, and leaves final decisions to a human reviewer.

## Codex 48 — Round 2

**Deadline:** Wednesday, 28 October 2026, 10:00 AM IST.

## Core workflow

1. Configure a brand profile with voice guidance, preferred/prohibited terms, and approved facts.
2. Paste a marketing draft and run checks.
3. Review findings with severity, explanation, matching rule/fact, and a focused suggested correction.
4. Edit the draft and re-check it.
5. Submit for human review; approve or request changes with comments.

## Implementation approach

- Next.js, TypeScript, Tailwind CSS
- Next.js server-side API routes
- Deterministic checks for exact terms and configured rules
- LLM structured output for contextual tone review and focused suggestions
- PostgreSQL and Supabase Auth when available/configured
- Vercel deployment

## Safety and trust

- Do not expose API keys in the browser.
- Do not pretend an unverified statement is a proven fact.
- Mark claims as needing verification when a trusted approved fact is unavailable.
- Never auto-approve or auto-publish content.
- A human makes the final approval decision.

## Development note

Repository initialized for Round 2. Feature status must be updated only after the feature is implemented and tested.