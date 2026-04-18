---
description: Run one full autopilot tick (observe → ideate → decide → build → ship → measure → reflect). Bounded to one change, one draft PR.
disable-model-invocation: true
---

Run one tick of the clawmart autopilot loop. Dispatch the `autopilot-orchestrator` agent with this assignment:

> You are running tick N of the clawmart autopilot. Read `.claude/plugins/clawmart-autopilot/CLAUDE.md` first — its guardrails are non-negotiable. Then execute the seven phases in order. A tick is bounded: one hypothesis, one change, one draft PR. Do not chain a second tick. Write a journal entry before you exit.

The orchestrator handles everything: state reads, branch creation, `gh pr create --draft`, journal writing, and auto-pause if guardrails would be violated.

If `autopilot-state/PAUSED` exists, do **not** run — tell the user why it's paused and exit.
