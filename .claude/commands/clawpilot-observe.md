---
description: Observe phase only — pull traction metrics from Convex catalog, git history, and append to metrics-history.jsonl. No code changes.
disable-model-invocation: true
---

Run only the **observe** phase of the autopilot loop.

Use the `clawmart-traction-measurement` skill to:

1. Fetch the live catalog: `curl -s https://clawmart.co/api/catalog` (fallback: query local Convex via `npx convex run skills:list` if catalog is down).
2. Pull per-skill `totalCalls` and `averageRating`.
3. Check `git log --since="7 days ago" --oneline` for recently-shipped changes that might explain deltas.
4. Append a JSONL row to `autopilot-state/metrics-history.jsonl`:
   ```json
   {"ts":"<iso>","tick":<n>,"catalog_size":<int>,"total_calls_sum":<int>,"per_skill":{"<slug>":{"calls":<int>,"rating":<float>}}}
   ```
5. Compute deltas vs the previous row. Print a short summary (< 15 lines) of what moved.

Do not write to any file other than `autopilot-state/metrics-history.jsonl`. No branch, no PR, no hypothesis updates.
