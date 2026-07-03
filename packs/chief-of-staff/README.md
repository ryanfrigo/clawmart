# Personal Chief of Staff Pack 🗂️

Six curated OpenClaw skills that turn your self-hosted assistant into a chief of
staff: it triages your inbox, guards your calendar, captures tasks from any
channel, briefs you every morning, preps you for meetings, and wraps up your day.

> **What this is (honestly):** a bundle of instruction skills built to the
> OpenClaw AgentSkills spec, plus this setup guide. They give your assistant the
> *judgment layer* of a great EA — the triage rubrics, the prioritization, the
> output formats. They read and write through the tool skills you already run
> (email, calendar, messages, tasks). They are **not** a turnkey SaaS and are not
> tested against your exact stack — you'll adapt the config and trigger phrases to
> how you work. 14-day refund, no questions.
>
> *Clawmart is an independent storefront and is not affiliated with or endorsed by
> OpenClaw.*

## What's inside

| Skill | What it does |
|-------|--------------|
| `inbox-triage` | Sorts mail into urgent / reply / read-later / ignore and drafts the replies you'd send. |
| `calendar-guard` | Flags conflicts and back-to-backs, proposes reshuffles, and holds focus blocks. |
| `daily-brief` | A tight morning brief across mail, calendar, messages, and tasks — what matters, what's due, what to say no to. |
| `task-capture` | Turns "can you…" / "remind me…" into a dated task in your real task tool. |
| `meeting-prep` | A one-pager before each meeting: who, why, last thread, your goal. |
| `end-of-day` | An evening wrap: done, slipped, loose ends, tomorrow's top 3. |

`daily-brief` and `end-of-day` are the open/close loop; the other four are the
machinery they draw on. Install all six for the full effect.

## Install

1. **Copy the skill folders into OpenClaw's skills directory.** Each subfolder here
   (the ones with a `SKILL.md`) is one skill. Drop them into either your global
   skills dir or a workspace's `skills/`:

   ```bash
   # global (applies everywhere)
   cp -R inbox-triage calendar-guard daily-brief task-capture meeting-prep end-of-day \
     ~/.openclaw/skills/

   # or per-workspace
   cp -R inbox-triage calendar-guard daily-brief task-capture meeting-prep end-of-day \
     /path/to/workspace/skills/
   ```

2. **Start a new OpenClaw session.** Skills are loaded at session start, so an
   existing session won't see them — open a fresh one.

3. **Verify** they loaded: ask OpenClaw "what skills do you have?" or just try a
   trigger phrase like "give me my morning brief."

## Configure

These skills are the judgment layer — they orchestrate the **tool skills** that
actually touch your email, calendar, messages, and tasks. Connect the ones you
use (all optional; a skill just omits a source it can't reach):

- **Email** — [`himalaya`](https://github.com/pimalaya/himalaya) (IMAP/SMTP), Gmail,
  or another mail tool. Powers `inbox-triage`, and the mail sections of the brief,
  wrap, and meeting-prep search.
- **Calendar** — a calendar CLI such as `gcalcli` (Google Calendar, read+write) or
  `icalBuddy` (macOS Calendar.app, read-only). Powers `calendar-guard`, and the
  agenda in the brief and meeting-prep.
- **Messages** — `slack`, `imsg`/`bluebubbles` (iMessage), or `discord` for DMs and
  @mentions feeding the brief, task-capture, and meeting-prep.
- **Tasks** — `things` (Things 3), `remindctl` (Apple Reminders), Todoist, Notion,
  or Trello for `task-capture` and the task sections of the brief and wrap.

Then set your personal preferences. Copy `openclaw.json.example` and fill it in —
timezone is required; the rest tunes the skills to you:

```bash
cp openclaw.json.example ~/.openclaw/chief-of-staff.json   # then edit
```

Key settings: `timezone` (load-bearing for every date/time), `vipSenders`
(who counts as urgent), `workingHours` / `bufferMinutes` / `maxMeetingHours`
(calendar rules), `maxNeedsYou` (how many items the brief surfaces), and delivery
channel. Nothing here contains secrets — mail/calendar credentials live in each
tool's own config, never in these skills.

### Schedule the recurring ones

`daily-brief` and `end-of-day` are best on a timer. Use OpenClaw's `cron` tool:

- Morning brief ~06:45 on weekdays.
- End-of-day wrap ~18:00 on weekdays.
- `meeting-prep` ~20 min before external meetings (or run it on demand).

## How to use — trigger phrases

Once installed, just talk to OpenClaw:

- "Give me my morning brief" → **daily-brief**
- "Triage my inbox" / "what emails need a reply?" → **inbox-triage**
- "Any conflicts this week?" / "protect my focus time" → **calendar-guard**
- "Remind me to send Dana the deck Friday" → **task-capture**
- "Prep me for my 2pm" → **meeting-prep**
- "Wrap up my day" → **end-of-day**

## Honest caveats

- **Drafts, not sends.** Every skill that touches your outbound (replies, decline
  notes) produces a draft you approve. Sending is always your explicit action. The
  only auto-writes are opt-in and narrow (archive the ignore bucket, add focus
  blocks, roll slipped tasks forward).
- **No fabrication.** These skills won't invent deadlines, make up facts about
  people, or pad a brief to look busy. Empty source → it says so.
- **Quality tracks your setup.** A brief is only as good as the tools you connect
  and the config you fill in (voice samples, VIP list, rules). Budget 20-30 minutes
  to wire it up and a few days to tune the thresholds to your taste.
- **Timezone and privacy.** Set your timezone. Deliver briefs and wraps only to a
  private channel you control — they carry sensitive names, deals, and health items.
