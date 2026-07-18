#!/usr/bin/env bash
#
# Clawmart agent container entrypoint — the PR-only cage.
#
# Guarantees, defense-in-depth:
#   1. This script ONLY ever pushes a `clawmart/box-<id>` branch. It contains no
#      code path that pushes the base branch. Grep it: there is no `push .* main`.
#   2. The GitHub token is a fine-grained PAT scoped to ONE repo, contents:write +
#      pull_requests:write only — it cannot touch other repos.
#   3. The base branch is expected to be protection-locked. NOTE: a pushed
#      clawmart/* branch can still trigger CI, so the bot PAT must exclude the
#      `workflows` scope and untrusted tasks should target a fork/CI-less mirror
#      (see docs/PROVISIONING.md "Residual risk").
#   4. Runs as an unprivileged user in a read-only container (see cloud-init).
#
# Reads config from $CLAWMART_CONFIG (JSON). Secrets come from env, never argv.
set -euo pipefail

cfg() { echo "$CLAWMART_CONFIG" | python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }

REPO_URL="$(cfg repoUrl)"
BASE_BRANCH="$(cfg baseBranch)"
CONVEX_SITE_URL="$(cfg convexSiteUrl)"
BRANCH="clawmart/box-${BOX_ID}"
WORK=/work/repo

# ── event streaming back into the Studio live feed ──────────────────────────
event() {
  local kind="$1" text="$2"
  echo "[$kind] $text"
  [ -z "$CONVEX_SITE_URL" ] && return 0
  python3 - "$kind" "$text" <<'PY' || true
import json,os,sys,urllib.request
kind,text=sys.argv[1],sys.argv[2]
body=json.dumps({"boxId":os.environ["BOX_ID"],"kind":kind,"text":text}).encode()
req=urllib.request.Request(os.environ["CONVEX_SITE_URL"].rstrip("/")+"/box/event",
    data=body,headers={"content-type":"application/json",
    "x-clawmart-box-secret":os.environ.get("CALLBACK_SECRET","")})
try: urllib.request.urlopen(req,timeout=10)
except Exception as e: print("event post failed:",e,file=sys.stderr)
PY
}
export -f event 2>/dev/null || true

trap 'event status "agent error — box will terminate"' ERR

# ── clone + isolated work branch ────────────────────────────────────────────
event status "cloning repository"
OWNER_REPO="$(echo "$REPO_URL" | sed -E 's#https?://github.com/##; s#\.git$##')"
git config --global user.name  "clawmart-bot"
git config --global user.email "bot@clawmart.co"
git config --global advice.detachedHead false
git clone --depth 50 "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER_REPO}.git" "$WORK" 2>&1 | tail -1
cd "$WORK"
git checkout -b "$BRANCH"
event status "on branch $BRANCH — starting work"

# ── run the agent loop (produces commits on $BRANCH only) ───────────────────
python3 /opt/clawmart/runner.py || event status "runner exited non-zero"

# ── ship as a PR — never as a push to the base branch ───────────────────────
if git rev-parse --verify --quiet "$BRANCH" >/dev/null && \
   [ -n "$(git log "origin/${BASE_BRANCH}..${BRANCH}" --oneline 2>/dev/null || git log --oneline -1)" ]; then
  event status "pushing branch $BRANCH"
  git push origin "$BRANCH" 2>&1 | tail -1
  event status "opening pull request"
  PR_URL="$(python3 - <<PY
import json,os,urllib.request
owner_repo="${OWNER_REPO}"
data=json.dumps({"title":"Clawmart: ${BRANCH}",
  "head":"${BRANCH}","base":"${BASE_BRANCH}",
  "body":"Automated draft from a Clawmart dev box (box ${BOX_ID}).\n\n"
         "This is an AI-drafted change for you to review — not auto-merged."}).encode()
req=urllib.request.Request(f"https://api.github.com/repos/{owner_repo}/pulls",data=data,
  headers={"Authorization":"Bearer ${GITHUB_TOKEN}","Accept":"application/vnd.github+json"})
try:
  r=urllib.request.urlopen(req,timeout=20); print(json.load(r).get("html_url",""))
except Exception as e:
  import sys; print("",end=""); print("PR open failed:",e,file=sys.stderr)
PY
)"
  event output "opened PR: ${PR_URL:-(see branch $BRANCH)}"
else
  event output "no changes produced — nothing to open a PR for"
fi

event status "done"
