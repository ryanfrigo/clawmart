import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Clawmart v2 schema — premium OpenClaw skill-pack storefront.
 *
 * Guest-first: no user accounts. A purchase is keyed by an unguessable token
 * (the delivery URL). Money mutations are internal; the only public surface is
 * createPending / attachStripeSession (secret-guarded) and getByToken.
 *
 * Studio surfaces DO have accounts: `...authTables` below is Convex Auth's own
 * schema (`users`, `authAccounts`, `authSessions`, `authRefreshTokens`,
 * `authVerificationCodes`, `authVerifiers`, `authRateLimits`) — see
 * convex/auth.ts. Those tables are owned by the library; never write to them
 * directly. `companies.ownerId` / `missions.ownerId` / `devBoxes.ownerId` hold
 * an `Id<"users">` from that set.
 */
export default defineSchema({
  ...authTables,

  // One row per checkout attempt. Stripe drives it pending_payment -> paid|failed.
  purchases: defineTable({
    token: v.string(), // 128-bit hex — the download URL key. Never expose _id.
    slug: v.string(), // pack slug or "all-access"
    title: v.optional(v.string()), // human label passed from checkout (record only)
    email: v.optional(v.string()), // from Stripe session, for delivery
    status: v.union(
      v.literal("pending_payment"),
      v.literal("paid"),
      v.literal("failed")
    ),
    stripeSessionId: v.optional(v.string()), // idempotency key for fulfillment
    stripePaymentIntentId: v.optional(v.string()),
    amountUsd: v.number(), // whole dollars, validated against allowed prices
    // Crypto (USDC on Base) rail — optional; card purchases leave these unset.
    paymentMethod: v.optional(v.union(v.literal("card"), v.literal("crypto"))),
    expectedUsdcMicro: v.optional(v.number()), // exact USDC (6dp micro units) to match on-chain
    cryptoFromBlock: v.optional(v.number()), // Base block at order creation — scan from here
    cryptoTxHash: v.optional(v.string()), // the matched on-chain payment
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_stripe_session", ["stripeSessionId"]),

  // Sliding-window rate limiting (keyed by hashed IP or a global key).
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // "New packs" waitlist — validates demand for future packs before we build them.
  waitlist: defineTable({
    email: v.string(),
    source: v.string(), // e.g. "home" | "purchase" | "c/<slug>"
    domain: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    // Owner-facing demand signal: count signups per company page.
    .index("by_source", ["source"]),

  // ---- Company Studio (docs/COMPANY-STUDIO.md) ----------------------------

  // One row per user company idea. Owned by an account; public via slug.
  companies: defineTable({
    // Id<"users"> from Convex Auth, stored as a string (this table predates the
    // users table). NEVER identity.subject — Convex Auth mints `sub` as
    // "<userId>|<sessionId>", so the raw subject rotates every session.
    ownerId: v.string(),
    ownerEmail: v.optional(v.string()), // for the morning digest (from the user doc)
    slug: v.string(), // public URL key — re-slugged from brand name mid-build
    slugLocked: v.optional(v.boolean()), // once branded, the slug never changes (shared links)
    lastCheckinAt: v.optional(v.number()), // daily CEO check-in bookkeeping
    idea: v.string(), // the user's raw description
    name: v.string(), // provisional until the brand agent lands
    tagline: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("building"),
      v.literal("live"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"])
    // Cron paths (watchdog, check-ins, digests) must never table-scan.
    .index("by_status", ["status"]),

  // One row per pipeline step per build.
  agentRuns: defineTable({
    companyId: v.id("companies"),
    agentKey: v.string(), // "strategist" | "brand" | "product" | "landing" | "marketing"
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    model: v.string(),
    attempt: v.number(), // 1-based; one retry max
    error: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Append-only live feed shown in /studio/[id].
  agentEvents: defineTable({
    companyId: v.id("companies"),
    agentKey: v.string(),
    kind: v.union(v.literal("status"), v.literal("output")),
    text: v.string(),
    ts: v.number(),
  }).index("by_company", ["companyId"]),

  // Final artifacts, one per kind per company (upserted on re-runs).
  // json is a stringified blob — agent output schemas evolve too fast for validators.
  companyAssets: defineTable({
    companyId: v.id("companies"),
    kind: v.string(), // "plan" | "brand" | "product" | "landing" | "marketing"
    json: v.string(),
    updatedAt: v.number(),
  }).index("by_company_kind", ["companyId", "kind"]),

  // ---- Agency missions (docs/AGENCY.md) -----------------------------------
  // A mission dispatches the agent roster (convex/lib/roster.ts) at one goal:
  // an orchestrator plans a task DAG, then tasks execute in parallel waves.

  missions: defineTable({
    companyId: v.id("companies"),
    ownerId: v.string(), // Id<"users"> (see companies.ownerId) — authorizes read/cancel
    goal: v.string(), // the user's raw instruction to the army
    strategy: v.union(
      v.literal("free"), // free models only — a free mission can never bill
      v.literal("balanced"),
      v.literal("quality")
    ),
    status: v.union(
      v.literal("planning"), // orchestrator is staffing the mission
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    // Opt-in: may this mission hand a codeCapable task to a real dev box
    // (docs/PROVISIONING.md) instead of drafting text? Optional and absent on
    // every existing row — a mission without it behaves exactly as before, and
    // even with it the whole path stays behind CLAWMART_BOXES_ENABLED.
    execute: v.optional(v.boolean()),
    approach: v.optional(v.string()), // orchestrator's one-line plan rationale
    taskCount: v.number(), // 0 until the plan lands
    doneCount: v.number(), // settled tasks: done + failed + skipped
    failedCount: v.number(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_owner", ["ownerId"])
    // Watchdog path must never table-scan.
    .index("by_status", ["status"]),

  // One row per staffed specialist. `dependsOn` holds indexes within the same
  // mission and always points strictly backwards (validated in lib/roster.ts),
  // so wave scheduling cannot deadlock.
  missionTasks: defineTable({
    missionId: v.id("missions"),
    companyId: v.id("companies"),
    index: v.number(), // position in the plan; dependsOn refers to these
    agentKey: v.string(), // must resolve in ROSTER_BY_KEY
    title: v.string(),
    brief: v.string(),
    dependsOn: v.array(v.number()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("skipped") // an upstream dependency failed
    ),
    model: v.optional(v.string()), // the model that actually served it
    attempt: v.number(),
    // Stringified TaskOutput envelope — agent output shapes evolve faster than
    // Convex validators, same call as companyAssets.json.
    outputJson: v.optional(v.string()),
    handoff: v.optional(v.string()), // what downstream tasks read (kept small)
    error: v.optional(v.string()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_mission", ["missionId"])
    .index("by_mission_status", ["missionId", "status"]),

  // What the army has learned about one company, distilled from settled
  // missions and injected into every later plan/task prompt so missions
  // compound instead of starting cold. One row per durable learning; capped at
  // MAX_COMPANY_MEMORY rows per company (missions.rememberLearnings) so it can
  // never grow without bound, and every row is individually deletable by the
  // owner — a wrong learning would otherwise poison every future mission.
  companyMemory: defineTable({
    companyId: v.id("companies"),
    text: v.string(),
    sourceMissionId: v.optional(v.id("missions")), // provenance; optional by design
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Per-model circuit breaker for the free-inference router (lib/router.ts).
  // Free endpoints rate-limit constantly; this keeps a flapping model out of
  // rotation across action invocations instead of retrying it every task.
  modelHealth: defineTable({
    model: v.string(),
    failures: v.number(), // consecutive; reset to 0 on success
    cooldownUntil: v.number(), // epoch ms; in the past = healthy
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_model", ["model"]),

  // ---- Dev boxes (docs/adr/2026-07-18-ec2-provisioning.md) -----------------
  // One row per real EC2 worker box a user spins up for a live company. The box
  // runs a BYOK agent that opens PRs against the user's repo — reviewed by the
  // user, never auto-merged. Feature-flagged (CLAWMART_BOXES_ENABLED); the whole
  // subsystem is a no-op until the AWS control-plane creds are set in Convex env.
  devBoxes: defineTable({
    companyId: v.id("companies"),
    ownerId: v.string(), // Id<"users"> (see companies.ownerId) — authorizes kill/status
    boxId: v.string(), // public, unguessable id: "box_<hex>"; used in tags + SSM path
    status: v.union(
      v.literal("provisioning"),
      v.literal("running"),
      v.literal("terminating"),
      v.literal("terminated"),
      v.literal("failed")
    ),
    instanceId: v.optional(v.string()),
    publicIp: v.optional(v.string()),
    region: v.string(),
    instanceType: v.string(),
    repoUrl: v.string(),
    baseBranch: v.string(),
    // sha-256 hex of the per-box callback secret — validates the box's audit POSTs
    // without ever storing the raw secret (raw lives only in SSM, read by the box).
    callbackSecretHash: v.string(),
    // Mission bridge (docs/AGENCY.md). Set only when the Agency dispatched this
    // box for one mission task; absent on a box the owner started by hand. At
    // most ONE row per missionId ever exists (boxes.claimBoxForTask), which is
    // what makes "one box per mission" a database fact rather than a convention.
    missionId: v.optional(v.id("missions")),
    missionTaskId: v.optional(v.id("missionTasks")),
    // The pull request the box reported opening, if any. Recorded only when the
    // link resolves under repoUrl (lib/boxevents.ts) — the box's event stream
    // also carries untrusted repository bytes.
    prUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    terminatedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_box", ["boxId"])
    .index("by_owner", ["ownerId"])
    // The one-box-per-mission check runs on every dispatch; never a table scan.
    .index("by_mission", ["missionId"]),
});
