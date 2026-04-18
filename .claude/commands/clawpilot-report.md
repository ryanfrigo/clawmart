---
description: Produce a human-readable digest of what autopilot has learned — recent journal entries, metric trends, live experiments, graveyard highlights.
disable-model-invocation: true
---

Generate a concise progress report for the human operator. Do **not** modify state.

Read:

- Last 7 entries in `autopilot-state/journal/`
- Last 14 rows in `autopilot-state/metrics-history.jsonl`
- `autopilot-state/active-experiments.md`
- `autopilot-state/hypothesis-backlog.md` (top 5 pending)
- `autopilot-state/graveyard.md` (last 3 killed, with reasons)
- Open draft PRs: `gh pr list --draft --head-pattern 'autopilot/tick-*'`

Render a single markdown document to stdout with sections:

1. **Traction** — what moved this week (catalog hits, payments proxied via totalCalls, top skill)
2. **In flight** — draft PRs awaiting human review, with 1-line summary each
3. **Learned** — what worked (from wins) and what didn't (from recent graveyard)
4. **Next** — top-3 upcoming hypotheses, why they're ranked that order
5. **Blocked** — anything requiring human action (env vars to set, PRs to review, pause flags)

Keep it under 400 words. This is read fast.
