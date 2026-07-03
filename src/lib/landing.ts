/**
 * SEO/AEO landing pages — capture 'openclaw ___' search demand and funnel to
 * packs. Authored honestly (nominative OpenClaw, non-affiliation, ClawHub is
 * free, no fabricated stats). Rendered by /openclaw/[slug].
 */
export interface LandingSection { heading: string; body: string }
export interface LandingFaq { q: string; a: string }
export interface LandingPage {
  slug: string; seoTitle: string; metaDescription: string; h1: string;
  answerCapsule: string; sections: LandingSection[]; faq: LandingFaq[];
  ctaPackSlug: string; targetKeywords: string[];
}

export const LANDING_PAGES: LandingPage[] = [
  {
    "slug": "for-sales",
    "seoTitle": "OpenClaw SDR & Outbound Sales Setup · Clawmart",
    "metaDescription": "Make your self-hosted OpenClaw run outbound: prospect research, cold opens, follow-ups, reply triage, and meeting booking. Curated AI SDR pack + setup guide.",
    "h1": "Turn OpenClaw into an outbound SDR",
    "answerCapsule": "OpenClaw can run outbound sales when you add SDR skills: it researches prospects, drafts personalized cold opens, schedules follow-ups, triages replies, and books meetings on the email and calendar you connect. It drafts and schedules with a human reviewing — it is not a fully autonomous, guaranteed-pipeline autopilot.",
    "sections": [
      {
        "heading": "Can OpenClaw actually do outbound sales?",
        "body": "OpenClaw is a self-hosted personal assistant; on its own it doesn't know how to prospect or write a cold email. Give it the right skills and it can run the full motion: research an account, draft a first touch built on one real signal, queue a follow-up cadence that stops on reply, triage what comes back, and book the meeting on your calendar.\n\nWhat it can't do: guarantee replies or pipeline, verify a prospect's consent, or send safely without you configuring a warmed sender. It **drafts and schedules** — you keep a human on the first batches until you trust the voice. Think of it as a senior-SDR playbook an agent follows, not a hands-off autopilot."
      },
      {
        "heading": "What skills are in the OpenClaw AI SDR setup?",
        "body": "The AI SDR Pack is six skills built to OpenClaw's AgentSkills spec, designed to hand off to each other:\n\n- **prospect-research** — enrich a lead from a domain or name: what they do, recent buying signals, and the single best angle to lead with.\n- **cold-open** — draft a personalized, non-templated first touch from that research (one observation, one hypothesis, one soft ask).\n- **followup-sequence** — generate and schedule a 4-touch cadence that stops the instant they reply.\n- **reply-triage** — classify inbound (interested / not now / objection / referral / OOO / opt-out) and draft the next move.\n- **meeting-booker** — offer real times in the prospect's timezone, confirm, and drop a calendar hold with an agenda.\n- **pipeline-log** — one running deal log every other skill reads and writes, so the assistant remembers each deal.\n\nThe chain: research → cold-open → followup-sequence → reply-triage → meeting-booker, with pipeline-log as shared memory."
      },
      {
        "heading": "What do you configure — email, calendar, and search?",
        "body": "The skills describe *what to do*; they use the tools and channels you connect to OpenClaw. To get the full motion working:\n\n- **Email channel** (cold-open, followup-sequence, reply-triage): the sender you send from — ideally a warmed secondary domain — with read access so triage sees replies and stops cadences.\n- **Calendar** (meeting-booker): Google Calendar or your provider with write access, plus a default Meet/Zoom link.\n- **Web search / page fetch** (prospect-research): a search backend so research isn't guessing.\n- **Pipeline store** (pipeline-log): a local `pipeline.json` by default, or point it at a Google Sheet, Airtable, HubSpot, or Pipedrive.\n- **Enrichment API** (optional): Apollo/Clearbit for firmographics and verified emails; without one, research works from the public web.\n\nThe pack ships an `openclaw.json.example` to start from — you adapt names to your setup."
      },
      {
        "heading": "Free ClawHub skills vs a curated pack — why pay?",
        "body": "OpenClaw has a free public skill registry (ClawHub), and you can absolutely assemble an outbound stack à la carte from free skills — that path is legitimate and costs nothing. What you're buying here is the **curated, assembled layer**: six skills chosen to cover one job end-to-end, written to hand off to each other, tuned so the cold opens don't read like a mail-merge, and shipped with a setup guide and example config.\n\nThe do-it-yourself alternative is finding, vetting, and wiring individual skills together, then discovering after your first campaign which gaps you missed — reply triage, a shared pipeline log, a follow-up cadence that actually stops on reply. The pack is the \"it just works for outbound\" shortcut, backed by a 14-day refund."
      },
      {
        "heading": "Does it guarantee meetings? Compliance and the human loop",
        "body": "No pack guarantees pipeline — reply and meeting rates depend on your offer, list quality, and email deliverability, none of which a skill controls. Two things stay your responsibility.\n\n**Compliance:** cold outbound is regulated (CAN-SPAM in the US; GDPR/PECR in the EU/UK). The skills honor opt-outs immediately and avoid tracking links on the first touch, but they won't verify consent or guarantee legal compliance for your jurisdiction. Know your obligations.\n\n**The human loop:** the skills draft and schedule, but you should review the first batches — especially positive and hostile replies — until you trust the voice. Used that way, an OpenClaw SDR setup removes the research-and-typing grind, not your judgment."
      }
    ],
    "faq": [
      {
        "q": "Is Clawmart affiliated with OpenClaw?",
        "a": "No. Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw. We use the name \"OpenClaw\" only to describe what these skill packs are compatible with. OpenClaw is the open-source, self-hosted assistant at github.com/openclaw/openclaw."
      },
      {
        "q": "Can I get OpenClaw SDR skills for free?",
        "a": "The individual building blocks are available free, à la carte, on OpenClaw's public ClawHub registry, and assembling your own outbound stack there is a legitimate path. The AI SDR Pack sells the curated, assembled bundle — six skills that hand off to each other — plus a setup guide and example config, with a 14-day refund."
      },
      {
        "q": "Will OpenClaw send cold emails on its own?",
        "a": "The skills draft messages and schedule cadences, but they send only through the email channel and sender identity you configure in OpenClaw. We recommend keeping a human reviewing the first batches until you trust the voice, and using a warmed secondary domain if you're sending volume."
      },
      {
        "q": "Does the pack guarantee meetings or pipeline?",
        "a": "No. There are no guaranteed results. Reply and meeting rates depend on your offer, list quality, and email deliverability — things no skill can control. The pack gives you a strong, senior-SDR playbook the agent follows; the outcomes still depend on your inputs."
      },
      {
        "q": "What do I need before installing?",
        "a": "A running OpenClaw instance, an email channel with read access, calendar write access for booking, and a web-search backend for research. The pipeline log works out of the box as a local file. An enrichment API like Apollo or Clearbit is optional."
      }
    ],
    "ctaPackSlug": "ai-sdr",
    "targetKeywords": [
      "openclaw sales",
      "openclaw sdr",
      "openclaw outbound",
      "ai sdr openclaw",
      "openclaw cold email"
    ]
  },
  {
    "slug": "for-ecommerce",
    "seoTitle": "OpenClaw for Shopify & E-Commerce Ops · Clawmart",
    "metaDescription": "Run Shopify store ops with OpenClaw: inventory watch, order triage, refund drafts, reorder logic, and a daily brief. Read-and-draft, human-gated. $39 pack.",
    "h1": "Run your Shopify store ops with OpenClaw",
    "answerCapsule": "OpenClaw can run day-to-day Shopify operations by reading your store data and drafting the work: low-stock alerts, order and refund triage, review requests, reorder quantities, and a morning brief. It drafts; you approve before anything sends. Connect a Shopify Admin API token. Clawmart's E-Commerce Ops Pack assembles these six skills for $39.",
    "sections": [
      {
        "heading": "What can OpenClaw actually do for a Shopify store?",
        "body": "The E-Commerce Ops Pack teaches OpenClaw six recurring store jobs. **inventory-watch** alerts when SKUs cross a low-stock threshold and surfaces sales velocity so you reorder in time. **order-triage** summarizes the day's orders and flags fraud-signal or risky ones. **refund-assistant** drafts policy-consistent refund and return replies and logs the reason. **review-requests** times and drafts post-delivery review asks per customer. **reorder-logic** turns sales velocity plus supplier lead time into recommended reorder quantities and dates. **daily-store-brief** is a morning summary — sales, stockouts, refunds, and the three things worth handling today. Each is a Markdown SKILL.md your self-hosted assistant loads and runs when you ask for it."
      },
      {
        "heading": "Does OpenClaw change my store on its own?",
        "body": "No — the pack is read-and-draft, and actions are human-gated. OpenClaw reads your Shopify data and writes the work for you: a refund reply, a reorder recommendation, a flagged order. It does not issue refunds, cancel orders, edit inventory, or email customers by itself. You review each draft and take the final action in Shopify admin (or your help desk) when you agree. That's deliberate: store ops moves real money and customer trust, and a wrong automated refund or cancelled order is expensive to unwind. Think of it as an ops assistant that does the reading, first-drafting, and math — and leaves the button-press to you. If you later wire up write actions yourself, that's your call and your risk."
      },
      {
        "heading": "What do I need to connect OpenClaw to Shopify?",
        "body": "OpenClaw is a self-hosted assistant you run yourself, so you supply the credentials. For Shopify, that's an Admin API access token from a custom app in your store admin, scoped to what the skills read — products and inventory, orders, and customers. Grant read scopes first; the pack's default flow only reads and drafts. Keep the token in your own environment — Clawmart never sees your store or your data, because the pack is just Markdown skill files you download and copy into `~/.openclaw/skills`. The setup guide walks through creating the custom app, the scopes each skill uses, and the trigger phrases. Note: Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw or Shopify."
      },
      {
        "heading": "Isn't this just free ClawHub skills?",
        "body": "Partly, and we'll be straight about it. OpenClaw's ClawHub registry is free and à la carte — you can find, vet, and assemble store-ops skills yourself, and if you enjoy that, you should. What Clawmart sells is the assembled layer: six skills curated to work together for one job, made consistent in tone and data model, plus a setup guide covering the Shopify token, scopes, and reorder inputs. You're paying for assembly and time, not for access to something secret — every file is the same kind of Markdown you could write or find piecemeal. The E-Commerce Ops Pack is $39 with a 14-day, no-questions refund. If it doesn't fit your stack, get your money back."
      },
      {
        "heading": "What's inside the E-Commerce Ops Pack?",
        "body": "Six skills, one job — daily store operations — for a flat $39 (or included in the $99 All-Access bundle). You get `inventory-watch`, `order-triage`, `refund-assistant`, `review-requests`, `reorder-logic`, and `daily-store-brief`, each a complete SKILL.md built to OpenClaw's AgentSkills spec. The `reorder-logic` skill is shown in full, free, on the pack page — so you can read the actual file and judge the depth before you pay. Install is unzip, copy the folders into `~/.openclaw/skills`, and start a new session; the README lists trigger phrases and what to configure. These are curated instruction bundles you adapt to your store, not turnkey magic tested against your exact stack. 14-day refund on every pack."
      }
    ],
    "faq": [
      {
        "q": "Is Clawmart affiliated with OpenClaw or Shopify?",
        "a": "No. Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw or Shopify. We use the name \"OpenClaw\" only to describe what the packs are built for."
      },
      {
        "q": "Can OpenClaw issue refunds or cancel orders automatically?",
        "a": "No. The pack is read-and-draft: OpenClaw drafts the refund reply or flags the order, and you take the final action in Shopify admin. Nothing sends or changes your store without your approval."
      },
      {
        "q": "OpenClaw skills are free on ClawHub — why pay $39?",
        "a": "À-la-carte skills on ClawHub are genuinely free. Clawmart sells the assembled, curated layer: six store-ops skills made to work together, plus a setup guide for the Shopify token and scopes. It ships with a 14-day, no-questions refund."
      },
      {
        "q": "What Shopify permissions does it need?",
        "a": "An Admin API access token from a custom app in your store, with read scopes for products/inventory, orders, and customers. You create and control the token in your own environment; Clawmart never sees it or your store data."
      },
      {
        "q": "Does it work with platforms other than Shopify?",
        "a": "The pack is built around the Shopify Admin API. The skills are Markdown you can adapt to another platform's API, but they aren't tested against every stack — treat non-Shopify use as a starting point you'll adjust."
      }
    ],
    "ctaPackSlug": "ecom-ops",
    "targetKeywords": [
      "openclaw shopify",
      "openclaw ecommerce",
      "openclaw inventory",
      "shopify ai agent"
    ]
  },
  {
    "slug": "for-founders",
    "seoTitle": "OpenClaw as Your Personal Chief of Staff · Clawmart",
    "metaDescription": "Set up OpenClaw as a personal assistant: inbox triage, calendar guard, a daily brief, task capture, and meeting prep. It drafts replies — you approve and send.",
    "h1": "Run OpenClaw as your personal chief of staff",
    "answerCapsule": "OpenClaw can act as a personal chief of staff: it triages your inbox, guards your calendar, and delivers a morning brief across mail, calendar, and messages. You wire your own email, calendar, and message tools; OpenClaw's skills read them and draft your replies. It drafts and proposes — you approve and send.",
    "sections": [
      {
        "heading": "What does OpenClaw do as a personal chief of staff?",
        "body": "OpenClaw is a self-hosted personal AI assistant you run on your own machine; it answers on the channels you already use. As a chief of staff it runs six recurring jobs: triage your inbox, guard your calendar, deliver a morning **daily brief**, capture tasks from any message, prep you before meetings, and wrap the day at night.\n\nThe honest part: OpenClaw **drafts and proposes** — it writes the reply, flags the conflict, suggests the reschedule — but you approve and send. Nothing goes out under your name without your click. The skills are playbooks that sit on top of whatever email, calendar, and message tools you connect, not a black box that acts on its own."
      },
      {
        "heading": "What do you need to wire up first?",
        "body": "The pack is the playbook layer — it assumes OpenClaw can reach your data. Before the daily brief means anything, connect three things.\n\n- **Email:** a terminal mail client like Himalaya (IMAP/SMTP) gives OpenClaw read-and-draft access to your inbox.\n- **Messages:** OpenClaw speaks iMessage, Slack, WhatsApp, and Telegram natively, plus CLIs like `imsg` and `slack` for reading history.\n- **Calendar:** point OpenClaw at whatever calendar access you already run so it can see your day.\n\nTasks land wherever you keep them — Apple Reminders, Things, Notion, or Trello all have OpenClaw skills. You self-host OpenClaw and choose which model provider it calls, so you decide where your data goes."
      },
      {
        "heading": "How do the daily brief and inbox triage actually work?",
        "body": "The **daily-brief** skill assembles one morning read across mail, calendar, and messages: what's urgent, what's due, what you can say no to. Instead of opening five apps, you get a single brief on your phone.\n\n**inbox-triage** sorts new mail into urgent / reply / read-later / ignore, then drafts the replies you'd actually send — in your voice, with the thread context — and leaves them for one-tap approval. At night, **end-of-day** wraps up: what got done, what slipped, and tomorrow's top three.\n\nNone of these auto-send; every draft waits for you. Run them on a schedule (a morning trigger, an evening trigger) or ask for them on demand from any channel."
      },
      {
        "heading": "What about calendar guard, task capture, and meeting prep?",
        "body": "Three more jobs round out the role. **calendar-guard** scans your schedule for conflicts and back-to-backs, proposes reshuffles, and holds focus blocks before your week fills up — it suggests, you confirm. **task-capture** turns any stray message (\"remind me to…\", \"can you send…\") into a tracked task with a due date, so nothing dies in a chat thread. **meeting-prep** builds a one-pager before each meeting: who you're meeting, why, the last thread with them, and your goal for the call — waiting in your brief or messaged a few minutes ahead.\n\nEach skill is a Markdown `SKILL.md` built to OpenClaw's AgentSkills spec, so you can read exactly what it does and tune the prompts to your taste."
      },
      {
        "heading": "Do you have to pay? Free skills vs. the curated pack",
        "body": "Honest answer: no. OpenClaw is open-source, and individual skills are free on ClawHub, its public registry — you can assemble a chief-of-staff setup yourself for nothing but time.\n\nWhat Clawmart sells is the shortcut: the **Personal Chief of Staff Pack ($39)** is those six skills curated, wired to work together, and shipped with a setup guide so it runs the first day instead of after a weekend of tinkering. Every pack has a 14-day refund.\n\nClawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw; the name is used only to identify the software the packs are built for. If you'd rather build it yourself, ClawHub is genuinely the right call."
      }
    ],
    "faq": [
      {
        "q": "Does OpenClaw send emails or messages on its own?",
        "a": "No. Every skill in this setup drafts and proposes — a reply, a reschedule, a task — and leaves it for you to approve and send. inbox-triage writes the response in your voice; calendar-guard suggests the move; you make the final call. That's the design, and it's the honest answer to \"can I trust it with my inbox.\""
      },
      {
        "q": "Do I have to buy anything to use OpenClaw as an assistant?",
        "a": "No. OpenClaw is free and open-source, and the underlying skills are free on ClawHub, its public registry. The paid Personal Chief of Staff Pack just bundles and pre-wires the six skills with a setup guide so it works on day one. Building it yourself from ClawHub is a legitimate, free path."
      },
      {
        "q": "What do I need to connect for the daily brief to work?",
        "a": "Three things: email access (a CLI like Himalaya over IMAP/SMTP), your calendar, and at least one message channel (iMessage, Slack, WhatsApp, or Telegram — OpenClaw speaks these natively). The brief is only as complete as the sources you wire in."
      },
      {
        "q": "Is Clawmart affiliated with OpenClaw?",
        "a": "No. Clawmart is an independent storefront that sells curated skill packs built for OpenClaw. The name \"OpenClaw\" is used nominatively to identify the open-source assistant the packs target; there is no affiliation or endorsement."
      },
      {
        "q": "What's inside the Personal Chief of Staff Pack?",
        "a": "Six skills: inbox-triage, calendar-guard, daily-brief, task-capture, meeting-prep, and end-of-day. Each is a SKILL.md built to OpenClaw's AgentSkills spec, plus a setup guide. It's $39 with a 14-day refund, and daily-brief is previewable free on the pack page."
      }
    ],
    "ctaPackSlug": "chief-of-staff",
    "targetKeywords": [
      "openclaw assistant",
      "openclaw personal assistant setup",
      "openclaw chief of staff",
      "openclaw daily brief",
      "openclaw inbox triage",
      "openclaw calendar guard"
    ]
  },
  {
    "slug": "for-creators",
    "seoTitle": "OpenClaw Content Repurposing for Creators · Clawmart",
    "metaDescription": "Turn one podcast into show notes, clips, social posts, and a newsletter draft with OpenClaw. See what the Content Engine Pack does — and what to set up first.",
    "h1": "OpenClaw for creators and podcasters",
    "answerCapsule": "OpenClaw is a self-hosted AI assistant. Clawmart's Content Engine Pack adds six skills that turn one podcast recording into clean show notes, timestamped clip suggestions, platform-native social posts, and a newsletter draft. It writes the drafts and finds the moments worth clipping — you still cut the video and hit publish.",
    "sections": [
      {
        "heading": "What does OpenClaw do for podcasters and creators?",
        "body": "OpenClaw (github.com/openclaw/openclaw) is a self-hosted personal AI assistant you run yourself. On its own it's a general assistant; the Content Engine Pack teaches it your repurposing workflow as six connected skills. Point it at an episode transcript and it runs the chain: `transcript-clean` produces speaker-labeled, timestamped text; `show-notes` writes a titled summary with chapters, takeaways, and linked resources; `clip-finder` surfaces the 5-8 most clippable moments with timestamps and a hook line for each; `social-repurpose` turns those into an X thread, a LinkedIn post, and shorts captions; `newsletter-draft` drafts an issue with a subject line and CTA; `publish-checklist` runs a per-episode list before you go live. One recording becomes a week of drafts."
      },
      {
        "heading": "Does OpenClaw cut video, or just write the drafts?",
        "body": "Straight answer: it writes text and finds moments — it does not edit audio or cut video. `clip-finder` gives you timestamps and a reason each moment works; you (or your editor) make the actual cut in Descript, Premiere, CapCut, or with ffmpeg. Every social post, show-notes doc, and newsletter it produces is a first draft, not a finished, fact-checked publish. Treat it like a fast, tireless assistant editor: it removes the blank-page problem and the \"where are the good bits\" problem, then hands you something to trim. Nothing is guaranteed and nothing publishes itself — you keep the final read."
      },
      {
        "heading": "What do you set up before the pack works (Whisper, ffmpeg)?",
        "body": "The pack operates on a transcript, so transcription is upstream of it. Most creators wire OpenClaw to Whisper (whisper.cpp or a hosted Whisper API) to turn episode audio into the raw transcript that `transcript-clean` then formats. To actually export the clips `clip-finder` points to, you'll want ffmpeg installed so OpenClaw — or you — can slice the source file at those timestamps. Neither tool ships in the pack; both are free and well-documented. The included setup guide walks the wiring, but you provide the OpenClaw install, your own model/API keys, and these two upstream tools. If you already transcribe in Descript or Riverside, paste that transcript in and skip Whisper entirely."
      },
      {
        "heading": "OpenClaw skills are free on ClawHub — why pay for this?",
        "body": "Fair question, and the honest answer: many individual skills are free to install à la carte from ClawHub, OpenClaw's public registry. If you enjoy assembling, prompt-tuning, and wiring skills together, do that — you don't need us. The Content Engine Pack sells the assembled result: six skills chosen to hand off to each other cleanly, tuned for the podcast-to-everything job, packaged to the OpenClaw AgentSkills spec, plus a setup guide so it runs the same day. It's the \"it just works for my show\" shortcut, not secret functionality. It's $39 with a 14-day refund. Clawmart is an independent storefront and is not affiliated with the OpenClaw project."
      },
      {
        "heading": "What does a repurposing week actually look like with it?",
        "body": "Say you drop a 60-minute interview. OpenClaw transcribes it via Whisper, then `transcript-clean` labels speakers and timestamps. `show-notes` returns a titled description with chapter markers you can paste into your host and YouTube. `clip-finder` flags, say, seven moments — a hot take at 12:04, a story at 28:30 — each with a hook line, so you know what to cut before you open your editor. `social-repurpose` spins those into a launch-day X thread, two LinkedIn posts, and shorts captions. `newsletter-draft` gives you an issue to edit down. `publish-checklist` reminds you to add links, alt text, and the episode number. You review, trim, and ship — the drafts exist instead of a blank calendar."
      }
    ],
    "faq": [
      {
        "q": "Is Clawmart affiliated with OpenClaw?",
        "a": "No. OpenClaw is an independent open-source project (github.com/openclaw/openclaw); the name is used here only to describe what the pack is built for. Clawmart is a separate storefront selling curated skill packs for it."
      },
      {
        "q": "Does the pack publish or schedule my content for me?",
        "a": "No. It produces drafts — show notes, social posts, a newsletter — and a pre-publish checklist. You or your existing scheduler do the actual publishing. It also doesn't cut video; it finds the moments and hands you timestamps."
      },
      {
        "q": "Can I get these skills for free?",
        "a": "Individual skills are often available free on ClawHub, OpenClaw's public registry, if you want to assemble and tune them yourself. The pack sells the curated, ready-to-run bundle plus a setup guide — same idea, less wiring. It's $39 with a 14-day refund."
      },
      {
        "q": "Do I need Whisper and ffmpeg?",
        "a": "You need a transcript, so Whisper (or any transcription — Descript, Riverside) sits upstream. ffmpeg is optional but recommended if you want OpenClaw to export the clips it identifies. Both are free, and the setup guide covers wiring Whisper in."
      },
      {
        "q": "What do I actually need to run it?",
        "a": "A working OpenClaw install, your own model or API keys, and an episode transcript (or audio plus Whisper). The pack is the six skills and the setup guide; it doesn't include an OpenClaw host or model inference."
      }
    ],
    "ctaPackSlug": "content-engine",
    "targetKeywords": [
      "openclaw content",
      "openclaw podcast",
      "openclaw repurposing",
      "openclaw show notes",
      "openclaw clip finder",
      "repurpose podcast with openclaw"
    ]
  },
  {
    "slug": "skills-free-or-paid",
    "seoTitle": "Are OpenClaw Skills Free? ClawHub vs Clawmart · Clawmart",
    "metaDescription": "Yes, OpenClaw skills are free on ClawHub and you can assemble them yourself. Clawmart sells the curated, ready-to-run pack plus a setup guide and saved time.",
    "h1": "Are OpenClaw skills free? ClawHub vs Clawmart, honestly",
    "answerCapsule": "Yes. OpenClaw skills are free on ClawHub, its own registry — you can search, install, and wire them together yourself for nothing. Clawmart isn't selling access; it sells assembly: a curated set of skills for one job, made coherent, with a setup guide. If you enjoy assembling them, use ClawHub.",
    "sections": [
      {
        "heading": "Are OpenClaw skills free?",
        "body": "Yes. OpenClaw ships with ClawHub, its own free skill registry (clawhub.com). Skills are small Markdown files — a `SKILL.md` built to the AgentSkills spec that teaches the assistant to do one thing and when to do it. With ClawHub enabled, OpenClaw can search the registry and pull in skills automatically, and you can also write your own and drop them into `~/.openclaw/skills`. None of that costs money. If your question is *do I have to pay to extend OpenClaw?* — no. You can build a capable assistant entirely from free, à-la-carte skills, and plenty of people do exactly that. Being upfront about this is the whole point of this page: the raw ingredients are free."
      },
      {
        "heading": "ClawHub vs Clawmart: the real difference",
        "body": "The files are the same kind either way — plain, editable Markdown skills. What differs is assembly. On ClawHub you decide which skills a job needs, find them, check they don't overlap or conflict, and tune each one's trigger phrases so the agent fires the right skill at the right moment. That's an afternoon of research and trial-and-error. A Clawmart pack is that afternoon already done: a curated set of skills chosen to work together for one job — outbound sales, store ops, a chief of staff, a content engine — plus a README setup guide that says exactly what to connect and how to use it. You're paying for curation, coherence-as-a-set, and time — not for access to anything secret. Every pack is $39 (or $99 for all-access), with a 14-day refund. Nothing runs on our servers and nothing phones home."
      },
      {
        "heading": "Is there really a paid market for OpenClaw skills?",
        "body": "Yes, and it's worth being straight about it. Beyond the free registry, a small paid market has grown up around OpenClaw — individuals and shops selling premium skills and pre-assembled bundles. Prices you'll see quoted across the wider ecosystem tend to land somewhere in the rough range of $10 to $200, depending on how much is bundled. That's a third-party observation of what others charge, not a number we measured, and not our pricing. Clawmart is one storefront in that market. The honest framing: the ingredients are free on ClawHub, and the paid layer is convenience — someone else's time doing the curation and the write-up. If that convenience isn't worth it to you, the free path is completely legitimate."
      },
      {
        "heading": "What's actually inside a Clawmart pack?",
        "body": "A pack is a zip of skill folders plus a README. Today there are four, each $39, each built for one job:\n\n- **AI SDR Pack** — prospect research, cold opens, follow-up cadences, reply triage, meeting booking, pipeline logging.\n- **E-Commerce Ops Pack** — inventory watch, order triage, refunds, review requests, reorder logic, a daily store brief.\n- **Personal Chief of Staff Pack** — inbox triage, calendar guard, task capture, meeting prep, a real morning brief.\n- **Content Engine Pack** — transcript cleanup, show notes, clip finding, social repurposing, newsletter drafts.\n\nYou copy the folders into `~/.openclaw/skills`, start a new session, and the skills are live. The All-Access Bundle is $99 for all four plus every future pack. Skills that touch email, a calendar, or a store assume you've connected those in OpenClaw — the README lists exactly what to configure."
      },
      {
        "heading": "When should you NOT buy a pack?",
        "body": "Skip the pack if any of these is you. You enjoy assembling skills and tuning triggers — that's a real hobby, and ClawHub is built for it. You only need one skill, not a coordinated set — just grab it free. You have more time than money right now. Or your stack is unusual enough that a curated bundle would need heavy rewiring anyway — in that case start from the free pieces and shape them yourself. A pack earns its price when you want a specific job handled and would rather spend an evening using your assistant than building it. If that's not you, use ClawHub, genuinely — and if you buy and it isn't a fit, the 14-day refund is there."
      }
    ],
    "faq": [
      {
        "q": "Are OpenClaw skills free?",
        "a": "Yes. ClawHub is OpenClaw's own free skill registry, and you can install à-la-carte skills or write your own for nothing. Clawmart sells a curated, pre-assembled layer on top — packs of skills for one job, with a setup guide — but you never have to pay to extend OpenClaw."
      },
      {
        "q": "What's the difference between ClawHub and Clawmart?",
        "a": "ClawHub is OpenClaw's own free registry of individual, community skills you assemble yourself. Clawmart is an independent storefront that curates skills into ready-to-run packs for a specific job and writes a setup guide for each. Same kind of Markdown files; Clawmart adds curation, coherence, and time saved."
      },
      {
        "q": "Do people actually sell premium OpenClaw skills?",
        "a": "Yes — beyond the free registry, individuals and shops sell premium skills and bundles. Prices quoted across the ecosystem tend to fall roughly in the $10 to $200 range; that's an observation of others' pricing, not a figure we measured. Clawmart's packs are $39, or $99 for all-access, with a 14-day refund."
      },
      {
        "q": "When should I not buy a Clawmart pack?",
        "a": "If you enjoy assembling skills yourself, only need a single skill, or have more time than money, use ClawHub — it's free and completely legitimate. Packs are for when you'd rather spend the evening using your assistant than wiring it up."
      },
      {
        "q": "Is Clawmart affiliated with OpenClaw?",
        "a": "No. Clawmart is an independent storefront and is not affiliated with or endorsed by OpenClaw. We use the name nominatively to describe what the packs are built for."
      }
    ],
    "ctaPackSlug": "all-access",
    "targetKeywords": [
      "are openclaw skills free",
      "openclaw clawhub",
      "openclaw premium skills",
      "clawhub vs clawmart"
    ]
  }
];

export function getLanding(slug: string): LandingPage | undefined { return LANDING_PAGES.find((p) => p.slug === slug); }
