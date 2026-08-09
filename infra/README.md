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
│   ├── Dockerfile        Unprivileged python:3.12-slim.
│   ├── entrypoint.sh     The PR-only cage: clone → clawmart/* branch → PR. Never
│   │                     pushes the base branch.
│   └── runner.py         Reference BYOK loop (stdlib only, budget-capped).
└── bin/
    └── clawmart-box      awscli-only operator CLI / kill switch (list/status/logs/
                          ssm/kill/nuke).
```

## The safety model in one screen

- **Scoped identity, never root** — `setup.sh` creates `clawmart-control-plane`
  (least-priv) and `clawmart-worker-role`; delete your root keys after.
- **PR-only** — `entrypoint.sh` only ever pushes a `clawmart/*` branch and opens
  a PR; the bot PAT is fine-grained + repo-allowlisted; protect `main`.
- **No inbound** — `clawmart-worker-sg` opens no ports; access is SSM Session
  Manager (keyless), never SSH.
- **BYOK in SSM** — secrets are SecureString read by the box's own role; never in
  user-data, the DB, or the client.
- **Cost-capped** — self-terminate on shutdown + a hard boot-time timer + a dollar
  budget in the agent + daily rate limits.
