# autopilot-state

Durable state for the clawmart-autopilot loop. Everything here persists across Claude Code sessions and survives terminal exits.

## Files

| File | Purpose | Who writes |
|---|---|---|
| `hypothesis-backlog.md` | Pending ideas ranked for future ticks | `/clawpilot-ideate`, decide phase reorders |
| `active-experiments.md` | Shipped changes awaiting signal (draft PR → measurement) | ship + measure phases |
| `graveyard.md` | Killed ideas with reasons — prevents retry | reflect phase |
| `metrics-history.jsonl` | One JSON row per observe phase (append-only) | observe phase only |
| `journal/YYYY-MM-DD-tick-N.md` | One entry per tick | reflect phase |
| `PAUSED` | Sentinel file — presence halts the loop | pause/resume commands, guardrail violations |

## Invariants

- `metrics-history.jsonl` is **append-only**. Never rewrite prior rows.
- One journal file per tick. No retroactive edits.
- The autopilot never modifies files outside `autopilot-state/**` during observe/ideate/report/measure/reflect. Only the build phase touches `src/`, `convex/`, etc., and only on an `autopilot/tick-*` branch.
- If `PAUSED` exists, every autopilot command except `/clawpilot-resume` refuses to run.

## How to inspect progress

```bash
# latest tick summary
ls -t autopilot-state/journal/ | head -1 | xargs -I{} cat autopilot-state/journal/{}

# metric trend
tail -14 autopilot-state/metrics-history.jsonl | jq -c '{tick, total_calls_sum}'

# in-flight experiments
cat autopilot-state/active-experiments.md

# or just
/clawpilot-report
```
