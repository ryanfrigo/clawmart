# Clawmart Dev Boxes — operator guide

A dev box is a real EC2 instance that runs a BYOK agent against one of your
repos and opens a **pull request** for you to review. It is off by default and
safe by construction. This guide is how to turn it on and run it.

See `docs/adr/2026-07-18-ec2-provisioning.md` for *why* and the safety rationale.

## What happens when a user clicks "Dev box"

1. `boxes.provisionDevBox` (Convex) checks: feature flag on, caller owns a **live**
   company, repo is on the allowlist, no box already running, under rate limits.
2. It records a `devBoxes` row (`provisioning`) and schedules the Node action.
3. `provisioning.provisionBox` writes the box's secrets to SSM SecureString
   (`/clawmart/box/<id>/*`), resolves the AL2023 arm64 AMI, and launches one
   instance with the scoped worker role, no inbound SG, a self-terminate timer,
   and IMDSv2 required.
4. cloud-init installs Docker, pulls the agent image, and runs it unprivileged.
   The container clones the repo, works on `clawmart/box-<id>`, commits, pushes
   that branch, opens a PR, and streams progress to `/box/event` → the Studio
   feed. Inside it, `infra/agent/harness/` runs the loop:
   - **preflight** — resolve the repo's verification gate from the **base commit**
     (`.clawmart/verify.json`, else `package.json` `typecheck`/`lint`/`test`; never
     `npm run`, never the working tree) and run it once. A base that fails its own
     gate ends the run with `REFUSED` before a single model call is made.
   - **loop** — the model gets 7 typed tools (`list_files`, `read_file`, `search`,
     `write_file`, `edit_file`, `diff`, `run_verify`) plus `finish`. No shell, no
     network, no git. The harness commits after each accepted mutating turn.
   - **finish is a request** — it runs the whole gate; red means the failing
     output comes back and work continues. Done is earned, never declared.
   - **verdict** — `VERIFIED` ships a normal PR. Every other verdict —
     `UNVERIFIED` / `STALLED` / `BUDGET` / `CAPPED`, and `CRASHED` too — ships a
     **draft** PR titled `DRAFT (…)` carrying the exact failing output, *provided
     the run committed something*. Only `REFUSED` (a base that fails its own gate,
     an empty task, no model key) or zero commits ship no PR at all: a crash that
     had already committed work is reported as a draft, not dropped.
   - **push gate** — before anything leaves the box, the diff is refused if it
     touches `.github/workflows/` or `.clawmart/`, exceeds 200 files / 2 MB, or
     contains anything shaped like a credential.
5. The box `shutdown -h now`s itself when done (or at the budget deadline) and,
   because it launched with `InstanceInitiatedShutdownBehavior=terminate`, is
   destroyed.

## One-time setup

```bash
# 1. Create the scoped identities, SG, and log group (never uses root at runtime)
bash infra/setup.sh

# 2. Set the control-plane creds it printed into Convex env
npx convex env set AWS_ACCESS_KEY_ID      <printed id>
npx convex env set AWS_SECRET_ACCESS_KEY  <printed secret>
npx convex env set AWS_REGION             us-east-2

# 3. Delete your ROOT access keys (setup.sh replaces them)
#    https://console.aws.amazon.com/iam/home#/security_credentials

# 4. Publish the agent image and point the provisioner at it
docker build -t ghcr.io/<you>/clawmart-agent:latest infra/agent
docker push  ghcr.io/<you>/clawmart-agent:latest
npx convex env set CLAWMART_BOX_AGENT_IMAGE ghcr.io/<you>/clawmart-agent:latest

# 5. Provide the box's BYOK key + a FINE-GRAINED bot PAT (allowed repos only,
#    contents:write + pull_requests:write; NO `workflows` scope; protect `main`)
npx convex env set CLAWMART_BOX_GITHUB_TOKEN  github_pat_...
#    (BYOK LLM key reuses OPENROUTER_API_KEY unless you set CLAWMART_BOX_LLM_KEY)

# 6. Allowlist the repos a box may target, then enable
npx convex env set CLAWMART_BOX_REPO_ALLOWLIST "https://github.com/you/repo"
npx convex env set CLAWMART_BOXES_ENABLED 1

# 7. Show the button in the UI (build-time flag)
vercel env add NEXT_PUBLIC_CLAWMART_BOXES   # value: 1
```

## Env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `CLAWMART_BOXES_ENABLED` | Convex | Master switch. Unset = subsystem refuses. |
| `AWS_ACCESS_KEY_ID/SECRET/REGION` | Convex | Scoped control-plane creds from setup.sh. |
| `CLAWMART_BOX_AGENT_IMAGE` | Convex | Agent container image to run. |
| `CLAWMART_BOX_GITHUB_TOKEN` | Convex | Fine-grained bot PAT (allowed repos only). |
| `CLAWMART_BOX_LLM_KEY` | Convex | BYOK key for the box (falls back to `OPENROUTER_API_KEY`). |
| `CLAWMART_BOX_REPO_ALLOWLIST` | Convex | Comma-separated repos a box may target. |
| `CLAWMART_BOX_BASE_BRANCH` | Convex | Branch a box works from when the caller names none (default `main`). Needed for an allowlisted repo whose default branch isn't `main`, since a mission-dispatched box never takes a caller-supplied branch. One value for every allowlisted repo. |
| `CLAWMART_BOX_MODEL` | Convex | OpenRouter model id (default sonnet). |
| `CLAWMART_BOX_BUDGET_USD` | Convex | Dollar cap per box run (default 2). |
| `CLAWMART_BOX_MAX_ITERS` | Convex | Model turns per run (default 30). |
| `CLAWMART_BOX_AGENT_KEY` | Convex | Default roster key (`convex/lib/roster.ts`), e.g. `qa-engineer`, for a box that names no specialist — a mission-dispatched box overrides it with the one the planner staffed. Only the eight `codeCapable` engineering agents are accepted; anything else is ignored. Sets the agent's system-prompt role; the PR title comes from the model's own `finish` call, not from this key. |
| `CLAWMART_BOX_MAX_RUNTIME_MIN` | Convex | Hard self-terminate deadline (default 60). Also becomes the harness's wall-clock cap (minus a 2-minute reserve), so a slow run stops in time to still open its PR. |
| `CLAWMART_BOX_INSTANCE_TYPE` | Convex | Default `t4g.small` (~$12/mo, billed per-second while up). |
| `CLAWMART_WORKER_SG` / `_SUBNET` / `_AMI` | Convex | Optional overrides; auto-detected otherwise. |
| `NEXT_PUBLIC_CLAWMART_BOXES` | Vercel | Build-time flag to render the button. |

## Operating a box (out-of-band CLI)

`infra/bin/clawmart-box` needs only awscli — it's your kill switch even if the
web app is down. Every command is scoped to `Project=clawmart` tagged instances.

```bash
clawmart-box list            # running/pending boxes
clawmart-box status <box-id> # state, IP, uptime
clawmart-box logs <box-id>   # tail the box's CloudWatch audit log
clawmart-box ssm <box-id>    # keyless shell on the box (no SSH)
clawmart-box kill <box-id>   # terminate one box + delete its SSM secrets
clawmart-box nuke            # panic button: terminate ALL clawmart boxes
```

## Residual risk: the gate executes repository code

There is no version of "useful dev box" in which repository content cannot
execute: the gate runs the repo's own test suite, and `npm ci` executes the
lockfile's install graph (mitigated by `--ignore-scripts`, not eliminated). What
that means, stated plainly rather than papered over:

- Code the gate runs is the **same uid, same pid namespace** as the harness. It
  can read `/proc/<pid>/environ` and, with no seccomp profile, `ptrace`.
- The window is deliberately small: `entrypoint.sh` re-`exec`s itself without the
  three secrets (so `/proc/1/environ` is clean), the PAT lives only in shell
  memory and never reaches `.git/config` or any argv, the LLM key is a file the
  harness reads and unlinks before any repo code runs, and no gate subprocess
  inherits any of them. **That shrinks the exposure; it does not make the box
  injection-proof.**
- The controls that survive a fully compromised gate are external: the
  fine-grained PAT (allowed repos, `contents:write` + `pull_requests:write`, **no
  `workflows`**), protection-locked `main`, human review, the ephemeral box,
  callback-secret revocation on terminate/fail, and the byte-level push gate.

The real fix is a two-container split (a broker holding the credentials, a
sandbox holding no secret and no network) — see the ADR follow-ups. It is not
built yet, and this file will say so until it is.

## Residual risk: CI runs before human review

"PR-only, nothing merges without you" is true for the *merge*, but a pushed
`clawmart/*` branch can still trigger the target repo's CI. If a task is
prompt-injected, agent-authored `postinstall`/build scripts execute in **your CI
with its secrets** on branch push, before you read the PR. Mitigate for untrusted
tasks by: giving the bot PAT **no `workflows` scope** (blocks adding new workflow
files), scoping CI to run only on PRs from trusted actors, or pointing dev boxes
at a **fork / CI-less mirror**. Treat a dev box like an untrusted contributor.

## Cost

A `t4g.small` is ~$0.0168/hr (billed per second). With the default 60-minute hard
cap and self-terminate, a runaway box costs cents, not dollars. Nothing is left
running: the box destroys itself; `clawmart-box nuke` guarantees a clean slate.
