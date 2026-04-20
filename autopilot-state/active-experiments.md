# Active experiments

Shipped changes awaiting a measurement window. The measure phase of each tick reviews every row in this file. When a row resolves, it moves out (to journal for wins, graveyard for kills).

Format:

| Tick | Shipped | PR | Hypothesis | Metric watched | Baseline | Deadline (tick) | Observed |
|---|---|---|---|---|---|---|---|
| 2 | 2026-04-17 | #1 | H-001 landing demand-side reframe | `/api/catalog` req rate (48h window) + `total_calls_sum` | calls=0, catalog_size=6 | tick 7 (5-tick auto-kill) | ticks_observed=2 — superseded by 2026-04-20 pivot; recommend closing PR #1 as "superseded" |
| 4 | 2026-04-20 | #3 (draft) | H-006 agents catalog with 5 role templates | `/agents` request vol + `/agents/<slug>` 404 hits (pre tick 5) | static page live, hire flow 404s | tick 9 (5-tick auto-kill) | ticks_observed=0 |

