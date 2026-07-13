# Active experiments

Shipped changes awaiting a measurement window. The measure phase of each tick reviews every row in this file. When a row resolves, it moves out (to journal for wins, graveyard for kills).

> **NOTE (2026-07-02):** The autopilot loop is PAUSED (see `PAUSED` file). The 2026-07-02
> relaunch replaced the product; prior experiment rows resolved to the graveyard
> ("hire pre-built AI agents" strategic kill #2).

Format:

| Tick | Shipped | PR | Hypothesis | Metric watched | Baseline | Deadline (tick) | Observed |
|---|---|---|---|---|---|---|---|
| relaunch | AI Visibility Fix Kit: free check → $49 one-time kit (docs/RELAUNCH-SPEC.md) | relaunch/ai-visibility-audit | Founders/indie SaaS will pay $49 one-time for ready-to-paste AI-visibility fixes with verifiable transcripts, where free graders only score | Free checks run; check→purchase conversion; kit sales; waitlist signups (monthly fix drops) | 0 everything | 14 days after launch assets fire | — |

Kill/win criteria for the relaunch experiment:
- **Win:** ≥10 kit sales OR ≥25 waitlist signups in 14 days after the founder fires launch assets → build the recurring "monthly fix drops" SKU.
- **Kill:** <3 sales AND <10 waitlist in 14 days with ≥500 site visits → reprice/reposition before adding anything.
- **No-test:** if launch assets never fire, the window never starts (the v0 lesson).
