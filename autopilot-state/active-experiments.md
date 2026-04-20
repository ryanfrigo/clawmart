# Active experiments

Shipped changes awaiting a measurement window. The measure phase of each tick reviews every row in this file. When a row resolves, it moves out (to journal for wins, graveyard for kills).

Format:

| Tick | Shipped | PR | Hypothesis | Metric watched | Baseline | Deadline (tick) | Observed |
|---|---|---|---|---|---|---|---|
| 2 | 2026-04-17 | #1 | H-001 landing demand-side reframe | `/api/catalog` req rate (48h window) + `total_calls_sum` | calls=0, catalog_size=6 | tick 7 (5-tick auto-kill) | ticks_observed=0 |
| 3 | 2026-04-20 | #2 (draft) | H-005 homepage pivot to agent-workforce framing | homepage → `/agents` click-through; indirect via /agents hits | 0 | 14d after merge of v0 bundle | pending merge |
| 4 | 2026-04-20 | #3 (draft) | H-006 /agents catalog with 5 role cards | `/agents` hit rate and per-slug click distribution | 0 | 14d after merge of v0 bundle | pending merge |
| 5 | 2026-04-20 | #4 (draft, this tick) | H-007 Stripe pre-auth hire flow (v0 completion) | Stripe Checkout sessions created on `/api/agents/hire` | 0 | 14d after last-of-{#2,#3,#4} merges | pending merge — **< 5 pre-auths in window = kill workforce pivot** |

