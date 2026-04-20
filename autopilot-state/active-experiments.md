# Active experiments

Shipped changes awaiting a measurement window. The measure phase of each tick reviews every row in this file. When a row resolves, it moves out (to journal for wins, graveyard for kills).

Format:

| Tick | Shipped | PR | Hypothesis | Metric watched | Baseline | Deadline (tick) | Observed |
|---|---|---|---|---|---|---|---|
| 3 | Homepage rewrite to "Your AI workforce, off the shelf" — new hero, 3-col feature section, Hermes/OpenClaw trust stack, Browse-agents CTA. Legacy skills surface demoted to footer link. | [#2](https://github.com/ryanfrigo/clawmart/pull/2) | H-005 | Homepage → `/agents` click-through rate (starts measuring once H-006 lands a real `/agents` page); secondary: homepage → `/skills` referrals should drop sharply. | 0 measurable clicks (prior page sent supply-side signups to `/sign-up`). | Tick 8 (5 ticks post-ship, per kill rule) | — |

*(H-001 was superseded by the 2026-04-20 pivot and moved to graveyard.md.)*

**Known landmine carried into tick 4:** `/agents` currently redirects back to `/` (legacy stub). This tick's Browse-agents CTAs land users in a redirect loop. H-006 must replace that stub with the real agent catalog before any real measurement is possible. Until then, the homepage change is visible but un-measurable.
