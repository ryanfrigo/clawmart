# AI SDR Pack 📈

Turn your OpenClaw into an outbound sales rep that never sleeps.

This pack is a curated bundle of six skills that give your self-hosted [OpenClaw](https://github.com/openclaw/openclaw) assistant an end-to-end outbound motion: research a prospect, write a first touch that isn't a template, run a disciplined follow-up cadence, triage the replies, book the meeting, and keep a pipeline log so the assistant actually *remembers* every deal.

These are instruction bundles built to the OpenClaw AgentSkills spec — a senior SDR's playbook written so an agent can follow it — not a hosted app and not turnkey magic. You adapt the channels and tools to your stack. 14-day refund, no questions.

## What's inside

| Skill | What it does |
| --- | --- |
| `prospect-research` | Enrich a lead from a domain or name — what they do, who the person is, recent buying signals, and the single best angle to lead with. |
| `cold-open` | Draft a personalized, non-templated first-touch email or DM from the research. |
| `followup-sequence` | Generate and schedule a 4-touch follow-up cadence; stop the instant they reply. |
| `reply-triage` | Classify inbound replies (interested / not now / objection / referral / OOO / opt-out) and draft the next move. |
| `meeting-booker` | Offer real times in the prospect's timezone, confirm, and drop a calendar hold with an agenda. |
| `pipeline-log` | Keep one running deal log (stage, next step, last touch) that every other skill reads and writes. |

They're designed to hand off to each other: research → cold-open → followup-sequence → reply-triage → meeting-booker, with pipeline-log as the shared memory underneath.

## Install

1. **Unzip** this pack.
2. **Copy each skill folder** (the directories that contain a `SKILL.md`) into your OpenClaw skills directory — either the global one or a workspace one:
   ```bash
   # global (available everywhere)
   cp -r prospect-research cold-open followup-sequence \
         reply-triage meeting-booker pipeline-log ~/.openclaw/skills/

   # or per-workspace
   cp -r prospect-research cold-open followup-sequence \
         reply-triage meeting-booker pipeline-log <your-workspace>/skills/
   ```
3. **Start a new OpenClaw session.** Skills are picked up at session start, so a running session won't see them until you restart it.
4. **Confirm they loaded** — ask your assistant "what skills do you have?" and check the six show up.

## What to configure

These skills describe *what to do*; they use whatever tools and channels you've connected to OpenClaw. To get the full motion working:

- **Email channel** (required for cold-open, followup-sequence, reply-triage) — the inbox/sender you'll do outbound from. Use a warmed, secondary domain if you're sending volume; keep read access so reply-triage can see responses and stop cadences.
- **Calendar access** (required for meeting-booker) — Google Calendar or your provider, with write access to create events. Set a default conferencing link (Meet/Zoom).
- **Web search / page fetch** (required for prospect-research) — a search backend so research isn't guessing.
- **A place for the pipeline log** (used by pipeline-log) — zero-config default is a `pipeline.json`/`pipeline.csv` file in the workspace. If you'd rather, point it at a Google Sheet, Airtable, HubSpot, or Pipedrive.
- **Enrichment API (optional)** — Apollo/Clearbit/etc. for firmographics and verified emails. Without one, research works from public web results.

See `openclaw.json.example` for a starting config sketch — adapt names to your setup.

## How to use

Just talk to your assistant. Example trigger phrases:

- "Research acme.com and tell me the angle."
- "Write a cold open to Dana, the new VP Sales at Acme."
- "Queue the follow-up cadence for that lead."
- "What replies came back today, and how should I respond?"
- "They said yes — find a time and book it."
- "What's due today?" / "Show me the pipeline."

A natural first run: **"Research acme.com, draft a first touch to their VP of Sales, and set up the follow-ups"** — that chains research → cold-open → followup-sequence, all logged to the pipeline.

## Honest caveats

- **You keep a human in the loop.** These skills draft and schedule; you should review the first batches until you trust the voice. Positive and hostile replies especially deserve a human glance.
- **Compliance is yours.** Cold outbound is regulated (CAN-SPAM in the US; GDPR/PECR in the EU/UK). The skills honor opt-outs immediately and avoid tracking links on first touch, but they won't guarantee legal compliance for your jurisdiction or verify consent. Know your obligations.
- **No fabricated proof.** The skills are written to never invent stats, logos, or case studies. If your value prop needs proof, supply real ones.
- **Not tested against your exact stack.** Channels, CRMs, and search tools vary. Treat the pack as a strong starting playbook you tune, not a plug-and-play product.

---

*Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw. "OpenClaw" is used nominatively to describe compatibility. 14-day refund on every pack.*
