# Content Engine Pack 🎬

**One recording, a week of content.** Six OpenClaw skills that take a podcast or
video recording from raw transcript all the way to published show notes, clips,
social posts, and a newsletter — on a repeatable pipeline.

Built for creators, podcasters, and marketers who record long-form and need it
to become everything else without a full production team.

> Clawmart is an independent storefront and is not affiliated with or endorsed
> by OpenClaw. "OpenClaw" is used here only to name the assistant these skills
> run on (github.com/openclaw/openclaw).

## What's inside

The skills are designed to run in sequence, each reading the previous one's output:

1. **transcript-clean** 🧹 — raw ASR (SRT/VTT/JSON/text) → one clean, speaker-labeled, timestamped transcript. Everything else reads this.
2. **show-notes** 📝 — clean transcript → SEO titles, valid chapters, takeaways, resource links, guest bio, pull quotes.
3. **clip-finder** ✂️ — finds the 5–8 most clippable moments with exact in/out timestamps and a hook for each. *(This is the free sample skill on the pack page.)*
4. **social-repurpose** 🔁 — a clip or takeaway → platform-native X thread, LinkedIn post, and short-form caption.
5. **newsletter-draft** ✉️ — the episode → a full newsletter issue: subject lines, preview text, one developed idea, one CTA.
6. **publish-checklist** ✅ — walks the episode's assets and reports what's DONE / MISSING / NEEDS-REVIEW before you publish.

These are **curated instruction bundles** built to the OpenClaw AgentSkills spec —
a senior content-ops playbook your assistant follows. They're not turnkey magic
and they're not tested against your exact stack; adapt them to how you ship.
14-day refund, no questions asked.

## Install

Each skill is a folder with a `SKILL.md`. Drop the folders into your OpenClaw
skills directory, then start a **new** session so OpenClaw indexes them.

```bash
# 1. Unzip the pack (from your clawmart download)
unzip content-engine-clawmart.zip

# 2. Copy the six skill folders into your OpenClaw skills directory
#    Global (all workspaces):
cp -R content-engine/transcript-clean \
      content-engine/show-notes \
      content-engine/clip-finder \
      content-engine/social-repurpose \
      content-engine/newsletter-draft \
      content-engine/publish-checklist \
      ~/.openclaw/skills/

#    …or per-workspace instead:
#    cp -R content-engine/* <your-workspace>/skills/
```

Do **not** copy this `README.md` or `openclaw.json.example` into `skills/` — only
the skill folders (each containing a `SKILL.md`) are loaded as skills.

Then start a fresh OpenClaw session and confirm they loaded:

```
list my skills
```

You should see the six 🎬 Content Engine skills. If they don't appear, check
that each lives at `~/.openclaw/skills/<skill-name>/SKILL.md` and restart the
session (skills are indexed at session start).

## What to configure

The skills work out of the box for **drafting** — reading transcripts and writing
notes, clips lists, posts, newsletters, and checklists to files. To go from draft
to *published*, wire up the channels/tools you already use (all optional, all
yours to configure — this pack never posts or sends on its own):

- **Transcription** (upstream of the pack): if you only have audio/video, run a
  transcription skill first (e.g. the `openclaw-src` `openai-whisper` skill, or
  export from Descript/Riverside/Otter) and feed the transcript to `transcript-clean`.
- **Video cutting** (for `clip-finder`): `ffmpeg`, Descript, Opus Clip, CapCut, or
  Premiere. The pack gives you exact timestamps + hooks; your editor makes the cut.
- **Social posting** (for `social-repurpose`): a scheduler or API — Typefully,
  Buffer, Hypefury, or the platform's own API. Absent one, the skill hands you
  paste-ready drafts.
- **Email** (for `newsletter-draft`): Resend, Beehiiv, ConvertKit, Substack, or
  your ESP. The skill drafts; you review and send.
- **Voice samples**: give the social/newsletter skills 2–3 of your existing posts
  so they match your voice instead of a generic one.

An optional `openclaw.json.example` in this pack shows a `contentEngine` config
block (creator name, show name, default platforms, voice-sample path, output
folder) you can adapt — merge the pieces you want into your own OpenClaw config.

## How to use

Start a session and talk to your assistant. Example trigger phrases:

- "clean up this transcript" → **transcript-clean**
- "write show notes and chapters for this episode" → **show-notes**
- "find the best clips in this episode" → **clip-finder**
- "turn clip 1 into an X thread and a LinkedIn post" → **social-repurpose**
- "draft this week's newsletter from the episode" → **newsletter-draft**
- "am I ready to publish episode 42?" → **publish-checklist**

A typical run, end to end:

```
you  → here's the raw transcript for ep 42, clean it up
claw → [transcript.clean.md] 58:12 · 2 speakers · removed 214 filler words
you  → write show notes with chapters
claw → [title options, chapters, takeaways, resources, pull quotes]
you  → find me 6 clips
claw → [ranked cut sheet with hooks + timestamps]
you  → turn the top 2 into X threads, LinkedIn posts, and Shorts captions
claw → [paste-ready drafts per platform]
you  → draft the newsletter, then run the publish checklist
claw → [issue draft] + [readiness report: 3 MISSING, 2 NEEDS-REVIEW]
```

## Honest notes

- **Drafts, not autopilot.** These skills read and write files and hand you
  ready-to-use drafts. They do **not** post to social, send email, or upload
  video unless *you* connect those tools — by design.
- **Fidelity matters.** `transcript-clean` deliberately keeps the speaker's real
  words; the downstream skills won't invent stats, links, quotes, or testimonials.
  If a link or number isn't in the source, they ask or flag it rather than guess.
- **Adapt to your stack.** Character limits, platform norms, and podcast-host
  quirks drift over time — treat the specifics as a strong starting point and
  edit the skill files to match your workflow.
- 14-day refund on the pack, no questions asked.
