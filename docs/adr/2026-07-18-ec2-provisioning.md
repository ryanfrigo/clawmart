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

- Per-box IAM isolation (currently the worker role reads `/clawmart/box/*`; tighten
  to the box's own path via ABAC before multi-tenant use).
- Single-source the box user-data (today `infra/cloud-init.sh` and the embedded
  template in `convex/provisioning.ts` are kept in sync by hand).
- Publish the agent image in CI instead of a manual `docker build && push`.
