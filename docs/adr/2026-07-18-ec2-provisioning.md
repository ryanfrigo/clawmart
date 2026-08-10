# ADR: EC2 dev-box provisioning

- **Date:** 2026-07-18
- **Status:** Accepted (feature-flagged, off by default)
- **Supersedes:** the "Infrastructure decision (no EC2)" section of
  `docs/COMPANY-STUDIO.md` — but only for the new *execute* scope, not the
  Studio draft pipeline, which stays exactly as it was.

## Context

The Studio deliberately chose **no EC2**: its pipeline (Strategist → Brand →
Product → Landing → Marketing) is stateless text generation, run as short Convex
actions chained by the scheduler. For *drafting*, that's correct — servers would
be pure liability, and the documented escape hatch for ever executing code was
Vercel Sandbox, "still not EC2."

Two things changed:

1. **Scope expanded from draft → execute.** The product now offers a user a real
   worker that continues *building the actual product* after the draft — the
   long-standing backlog item **H-009** ("buyer → charge → spin up a coding agent
   with a role + gateway"), which always assumed real compute (it targeted
   Modal/Daytona).
2. **A persistent worker outgrows Sandbox.** Vercel Sandbox caps at ~45 minutes
   and keeps no disk between runs. A "dev box you leave working on your repo"
   needs a persistent, controllable host. EC2 is the right substrate for that
   scope; it is not a reversal of the draft-pipeline decision, which is untouched.

## Decision

Add **Clawmart Dev Boxes**: a live company can spin up one real EC2 instance that
runs a BYOK agent, which opens **pull requests** against the user's repo. The
whole subsystem is feature-flagged (`CLAWMART_BOXES_ENABLED`) and is a no-op
until the AWS control-plane creds are set in Convex env, so the deployed Studio
is unchanged until it's explicitly turned on.

Architecture (see `docs/PROVISIONING.md` for operator detail):

- **Control plane** — `convex/boxes.ts` (V8: auth, rate limits, DB, the live
  feed) hands off to `convex/provisioning.ts` (`"use node"`: the only module
  that talks to AWS, via the scoped IAM user).
- **The box** — Amazon Linux 2023 arm64, launched by cloud-init
  (`infra/cloud-init.sh`), runs the agent image (`infra/agent/`) in a locked-down
  container, and self-terminates.
- **Audit** — the box POSTs progress to `/box/event` (authenticated by a per-box
  secret) which writes into the same `agentEvents` feed the Studio already
  renders — zero UI changes to show box progress.
- **Operator CLI** — `infra/bin/clawmart-box` (awscli only) is the out-of-band
  kill switch, usable even if the app is down.

## Safety model (the actual product)

- **Never root.** `infra/setup.sh` creates a *scoped* IAM user for the control
  plane and a least-privilege role for the box. Root keys must be deleted after.
- **PR-only.** The box works on a `clawmart/*` branch and opens a PR; the
  entrypoint has no code path that pushes the base branch, the bot PAT is
  fine-grained to allowed repos, and the base branch is expected to be
  protection-locked. Nothing is auto-merged.
- **No inbound.** The security group opens no ports; access is SSM Session
  Manager (keyless) only — there is no SSH port and no key pair.
- **BYOK in SSM.** LLM key, bot PAT, and callback secret are SSM SecureString,
  read by the box's own instance role; never baked into user-data, returned to
  the client, or stored raw in the DB.
- **Cost cannot run away.** Instances launch with
  `InstanceInitiatedShutdownBehavior=terminate` plus a hard `shutdown -h +N`
  timer set before anything else in boot, a dollar budget in the agent loop, and
  per-user/global daily rate limits.
- **Repo allowlist.** A user can only aim a box at repos on the server allowlist.

### Residual risk after the 2026-08-10 review

A 20-agent adversarial review of the v2 harness reproduced its findings against the
built image. The control-plane defects it confirmed are fixed (a refused mission
claim no longer burns the global daily box budget; a dispatched box now runs as the
staffed specialist instead of the globally configured agent; the base branch is
configurable). Those are correctness fixes. **They do not move the box's trust
boundary at all**, and the following stays true:

- **Repository code executes.** There is no useful dev box in which it does not:
  the gate runs the repo's own tests and `npm ci` executes the lockfile's install
  graph (`--ignore-scripts` mitigates, it does not eliminate).
- **That code runs as the same uid and in the same pid namespace as the harness**,
  so it can read `/proc/<pid>/environ` and, with no seccomp profile, `ptrace`. The
  entrypoint's secret hygiene (re-`exec` without the three secrets, PAT only in
  shell memory, LLM key unlinked before repo code runs) shrinks that window; it
  does not close it. A fully compromised gate should be assumed to hold the box's
  credentials.
- **The controls that survive that compromise are all external to the box**: the
  fine-grained PAT (allowed repos only, `contents:write` + `pull_requests:write`,
  **no `workflows` scope**), a protection-locked `main`, human review of every PR,
  the box being ephemeral and self-terminating, callback-secret revocation on
  terminate/fail, and the byte-level push gate. Nothing inside the container is
  load-bearing against a hostile repository.
- The two-container split (broker holding credentials, sandbox holding none) in
  Follow-ups below remains the actual fix, and is not built.

Until that split ships, treat a dev box as an untrusted contributor with a scoped
token, and point it only at repos whose test suites you already trust.

## Trust-rule compliance

This does not break the honest-labeling DNA (`CLAUDE.md` trust rules). A dev box
is presented as a **user-initiated dev sandbox that drafts code as pull requests
you review** — never as the concept company "going live for real" or the product
"autonomously running your business." All box UI copy must keep that framing.

## Consequences

- Introduces the first `"use node"` Convex module, the first cloud SDK
  (`@aws-sdk/client-ec2`, `@aws-sdk/client-ssm`), and the first stateful external
  infra in the repo.
- Off by default; the deployed Studio is unaffected until enabled.

## Follow-ups (not in this change)

- **Split the box into two containers** (2026-08-10, top priority). The agent
  harness now has a closed action space, a pinned gate, path confinement, and a
  push gate — but the gate still executes repository code as the same uid and in
  the same pid namespace as the harness, so `/proc/<pid>/environ` and `ptrace`
  remain open to a compromised test suite. The correct answer is a broker
  container that holds the credentials and a sandbox container that holds none
  and has `--network none`, talking over a socket. It was deliberately **not**
  built in the harness-v2 change because it needs two images, a socket protocol,
  a seccomp profile, and cloud-init changes that cannot be verified without AWS
  creds — and shipping unverifiable security machinery is worse than shipping a
  smaller boundary and naming what it does not cover.
- **Gate the image build in CI** using `infra/agent/test-local.sh` (it already
  exits non-zero on any failure and needs only Docker).

- Per-box IAM isolation (currently the worker role reads `/clawmart/box/*`; tighten
  to the box's own path via ABAC before multi-tenant use). The compensating control
  today is an explicit IMDS hop limit of 1 keeping the role unreachable from the
  container — intentional, but scoping the policy is the real fix.
- Restrict worker egress to the hosts a box actually needs (github.com,
  openrouter.ai, the Convex site) via an egress security group instead of allow-all.
- Single-source the box user-data (today `infra/cloud-init.sh` and the embedded
  template in `convex/provisioning.ts` are kept in sync by hand).
- Publish the agent image in CI instead of a manual `docker build && push`.

---

## 2026-08-10 — STATUS: NOT READY TO ENABLE

The v2 harness replaced a toy loop that had outright RCE (`.git/hooks/pre-commit`
was a legal write path, executed by the next `git commit`). It is strictly safer
than what it replaced. It is **still not safe to enable**, and this section
records why, so nobody turns the flag on from a summary that sounded positive.

Two adversarial rounds (32 agents) found and fixed real defects — the push gate
scanned rendered `git diff`, blind to binary-classified paths; C-quoted
filenames evaded the deny check; `pre-push` hooks ran holding the PAT; the BYOK
key was on disk while the gate executed repository code; refused box claims
burned the global rate-limit budget. All fixed and regression-tested.

Then the fixes were re-attacked, and these **bypasses survived**, each
reproduced in Docker against the built image under production flags:

| Bypass | Mechanism |
|---|---|
| **PAT exfiltration** | Gate-executed repo code rewrites `/work/repo/.git/config` so `remote.origin.url` points at an attacker host; the inline credential helper hands the token over. Captured `x-access-token` on a listener. |
| **Secret scan evasion** | The same credentials interleaved with NUL bytes pass the push gate that refuses them in plain form. |
| **Whole-range push** | A secret committed in one commit and removed in a later one is invisible to scans of the net diff and the HEAD tree, but every object in `base..HEAD` still reaches the remote. |
| **Forged verification (indirection)** | A pinned gate of `npm run inner` re-enters the *working-tree* `package.json`; rewriting `scripts.inner` to `true` turns the gate green. Ships a NON-draft PR asserting `VERIFIED`. |
| **Forged verification (imports)** | `gate_paths()` is lexical and never follows what the gate's code imports. Gutting `support/assertions.js` — while never touching `tests/run.js` — ships a NON-draft `VERIFIED` PR. Same hole for `vitest.config.ts`, `conftest.py`, `jest.config.js`. |

### The root cause is architectural, not a list of bugs

Every credential bypass above has one cause: **the PAT lives in the same process,
uid, and filesystem as code the gate executes.** The gate must run the repo's own
tests to be useful, so repo content executes by design. No allowlist or scanner
fixes that, which is why each round of patches surfaced a deeper hole.

The design review scored a two-process split (executing process holds no secret,
no network) 5/5 on safety and rejected it as too expensive. The attacks have been
re-deriving that judgement ever since.

### Decided direction: take the PAT off the box

Cheaper than the two-container split and it closes the whole class:

- the box produces a **patch + `result.json`** and never holds a credential,
  never pushes, never talks to GitHub;
- **Convex** — which already holds the token — scans the patch and opens the PR.

Consequences: PAT theft becomes impossible (there is none to steal); push-hook
and `.git/config` attacks become irrelevant (the box does not push); secret
scanning moves server-side, where the agent cannot influence git's output or its
quoting. Forged verification survives — it is an honesty problem, not a
credential one — so **every box-authored PR should be a draft, unconditionally**,
and the verdict should be presented as the agent's claim rather than as evidence.

Until that lands: `CLAWMART_BOXES_ENABLED` stays unset, no AWS credentials are
provisioned, and the mission `execute` opt-in has no UI entry point.
