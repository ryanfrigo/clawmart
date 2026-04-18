---
description: Ideate phase only — research agent demand via karpathy-skills, public-apis, and scrapling-crawled agent marketplaces. Updates hypothesis-backlog.md.
disable-model-invocation: true
---

Run only the **ideate** phase. Use the `clawmart-agent-demand-research` skill.

Research inputs (in this order, stop when you have 3+ fresh hypotheses):

1. **Local corpora (no network):**
   - `/Users/ryanfrigo/dev/andrej-karpathy-skills/skills/` — which skill archetypes recur? What do they have in common?
   - `/Users/ryanfrigo/dev/public-apis/README.md` — which API categories are most represented? Which could be proxied + resold with zero-config x402 billing?
2. **Web research via scrapling (path: `/Users/ryanfrigo/.pyenv/shims/scrapling`):**
   - smithery.ai — what MCP servers are most installed?
   - agent.ai marketplace, crewai tools, HN "Show HN: agent" in the last 30 days
   - X/Twitter search for "agent spent $" or "x402" (text only, no login-gated content)
3. **Self-audit:** look at clawmart's current 5 x402 skills in `src/app/api/x402/`. What category is missing? What's overpriced/underpriced based on competitor scans?

Output: append 3+ new entries to `autopilot-state/hypothesis-backlog.md` using the template already at the top of that file. **Deduplicate against `graveyard.md`** — never re-propose something that was killed.

Do not write code, create branches, or touch `src/`.
