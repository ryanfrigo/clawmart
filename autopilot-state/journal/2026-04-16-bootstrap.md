# Bootstrap — 2026-04-16

Autopilot plugin scaffolded. This is not a real tick — no hypothesis tested, no code change shipped. It's a marker so the tick counter starts at 1 on the next `/clawpilot` invocation.

**Built:**
- `.claude/commands/clawpilot*.md` — six commands (tick, observe, ideate, report, pause, resume)
- `.claude/agents/autopilot-orchestrator.md` — the driver (agent name unchanged; only slash commands were renamed)
- `.claude/skills/clawmart-{traction-measurement,agent-demand-research,x402-skill-builder}/` — three skills
- `.claude/plugins/clawmart-autopilot/{.claude-plugin/plugin.json,CLAUDE.md}` — manifest + guardrails
- `autopilot-state/` — backlog (4 seed hypotheses), graveyard, active experiments, metrics history, journal
- Root `CLAUDE.md` with hard rules that apply to every session in this repo

**Reference corpora cloned to `/Users/ryanfrigo/dev/`:**
- `andrej-karpathy-skills/`
- `public-apis/`
- `superpowers/` (already there)

**Known gaps to resolve before autopilot does meaningful work:**
1. `PAYMENT_ADDRESS` env var — verify it's set in Vercel to a real USDC-receive address, not `0x0...0`. Autopilot will flag this every tick until resolved.
2. No `npm run test` target exists (checked package.json). Ticks that ship new routes rely on `npm run build` + `npm run lint` + manual curl smoke test. Adding a minimal e2e for x402 routes is itself a candidate hypothesis (H-005, future).
3. Vercel Analytics / logs access — the autopilot can only read what `/api/catalog` exposes (totalCalls from Convex). True page-view data and 402-to-200 conversion need the Vercel Analytics API or log export, which isn't wired. For now, `totalCalls` is the ground truth.

**Next:** invoke `/clawpilot` (or `/loop 30m /clawpilot`) to begin tick 1.

**Naming note:** Commands renamed from `/autopilot*` to `/clawpilot*` on 2026-04-17 because the globally-installed `ralph-loop@claude-plugins-official` plugin owns `/autopilot`. The directory `autopilot-state/` and agent `autopilot-orchestrator` keep their names — only user-facing slash commands moved.
