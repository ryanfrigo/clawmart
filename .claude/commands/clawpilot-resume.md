---
description: Resume the autopilot loop — deletes autopilot-state/PAUSED after confirming with the user.
disable-model-invocation: true
---

Resume the autopilot.

1. Read `autopilot-state/PAUSED` and show the user why it was paused.
2. Ask: "Confirm resume? (yes/no)". If anything other than "yes", abort.
3. On yes: delete `autopilot-state/PAUSED` and confirm "Autopilot resumed. Next tick can run."

Do not run a tick — the user has to invoke `/clawpilot` explicitly after resume.
