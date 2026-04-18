---
description: Pause the autopilot loop — writes autopilot-state/PAUSED so subsequent /clawpilot calls refuse to run.
disable-model-invocation: true
---

Pause the autopilot. Create `autopilot-state/PAUSED` containing:

```
Paused at: <iso timestamp>
Paused by: user (via /clawpilot-pause)
Reason: <ask the user for a one-line reason and write it here>
```

Confirm back: "Autopilot paused. `/clawpilot` will refuse to run until `/clawpilot-resume` is invoked."

Do not run any other phase.
