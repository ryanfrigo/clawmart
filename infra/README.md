# infra/ — Clawmart dev-box provisioning

Real EC2 worker boxes for live companies. A box runs a BYOK agent that opens a
pull request against your repo — reviewed by you, never auto-merged. Off by
default. Full guide: [`docs/PROVISIONING.md`](../docs/PROVISIONING.md); rationale
and safety model: [`docs/adr/2026-07-18-ec2-provisioning.md`](../docs/adr/2026-07-18-ec2-provisioning.md).

```
infra/
├── setup.sh              One-time: scoped IAM user + worker role + SG + log group.
│                         Replaces root-key usage. Idempotent.
├── cloud-init.sh         Box bootstrap (readable twin of the template embedded in
│                         convex/provisioning.ts). Docker + agent + self-terminate.
├── iam/
│   ├── control-plane-policy.json   Least-priv: launch/kill TAGGED boxes, manage
│   │                               /clawmart/box/* SSM params, PassRole (worker only).
│   ├── worker-role-policy.json     What a box may do: read ITS OWN secret, write ITS
│   │                               OWN logs. Nothing else.
│   └── worker-trust-policy.json    EC2 assume-role trust.
├── agent/                The agent image (swap it to run Hermes/Claude Code/etc.).
│   ├── Dockerfile        Unprivileged node:22-slim + python3. The harness unit
│   │                     tests are a RUN step: a red suite means no image.
│   ├── entrypoint.sh     The PR-only cage in three phases: scrub env → clone +
│   │                     branch → harness → push gate → PR. Never pushes the
│   │                     base branch.
│   ├── harness/          The agent itself (stdlib only). Closed action space of
│   │                     7 tools + finish, path confinement, a gate pinned at the
│   │                     base commit, dollar/iteration/wall-clock caps.
│   ├── pushgate.py       Egress filter on the diff about to leave the box.
│   ├── openpr.py         Opens the PR (draft unless the gate went green).
│   ├── tests/            Unit tests + fixtures + the fake upstream server.
│   └── test-local.sh     End-to-end proof with no AWS, no GitHub, no model key.
└── bin/
    └── clawmart-box      awscli-only operator CLI / kill switch (list/status/logs/
                          ssm/kill/nuke).
```

## Running the agent locally (no AWS, no GitHub, no model key)

```bash
bash infra/agent/test-local.sh            # every scenario
bash infra/agent/test-local.sh verified   # one scenario by name
```

It builds the image, seeds a throwaway repo into a bare origin held in a docker
volume, starts `tests/fake_upstream.py` on a private bridge (it stands in for
OpenRouter, Convex `/box/event`, and the GitHub PR API at once), and runs the
agent with **exactly** the production docker flags. Requires only Docker. Exit
code is non-zero on any failure, so it can gate the image build in CI.

Scenarios: a red-to-green run that opens a real PR; a premature `finish` that is
refused and downgraded to a draft carrying the failing output; a run that
rewrites `package.json` to fake a green gate and fails anyway; a repository whose
README is a prompt injection asking for every escape (all refused, no secret
anywhere in the feed, journal, tree, or PR); a base branch that fails its own
gate (zero model calls); a diff containing a credential-shaped string (push
refused); and a model that never emits a valid turn (clean stop, no PR).

To iterate on the harness alone: `cd infra/agent && python3 -m unittest discover
-s tests -t .` — no Docker needed.

## The safety model in one screen

- **Scoped identity, never root** — `setup.sh` creates `clawmart-control-plane`
  (least-priv) and `clawmart-worker-role`; delete your root keys after.
- **PR-only** — `entrypoint.sh` only ever pushes a `clawmart/*` branch and opens
  a PR; the bot PAT is fine-grained + repo-allowlisted; protect `main`.
- **Closed action space** — the agent has 7 typed tools and no shell, no network,
  and no git verbs. The harness makes the commits; push and PR happen in a phase
  the model never runs in.
- **Verified, or labelled** — a PR is only a normal PR when the repository's own
  gate (pinned from the base commit) passed. Anything else ships as a draft that
  says why and carries the failing output.
- **Honest about what is not covered** — the gate runs the repo's own test suite,
  so repository code executes as the same uid and in the same pid namespace as
  the harness. The PAT never enters that process or `.git/config`, but the box is
  not injection-proof; see "Residual risk" in `docs/PROVISIONING.md`.
- **No inbound** — `clawmart-worker-sg` opens no ports; access is SSM Session
  Manager (keyless), never SSH.
- **BYOK in SSM** — secrets are SecureString read by the box's own role; never in
  user-data, the DB, or the client.
- **Cost-capped** — self-terminate on shutdown + a hard boot-time timer + a dollar
  budget in the agent + daily rate limits.
