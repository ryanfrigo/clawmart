#!/usr/bin/env bash
#
# Clawmart agent container entrypoint — the PR-only cage, in three phases.
#
#   PHASE 0  scrub the process environment: stash the three secrets to a 0600
#            tmpfs dir, then re-exec WITHOUT them. `exec` rewrites /proc/1/environ,
#            so the initial container env stops being greppable by anything the
#            gate later executes.
#   PHASE 1  clone (credential helper, so the PAT never reaches .git/config or
#            any argv) and cut the isolated branch. Holds the token.
#   PHASE 2  run the harness. It has NO GitHub token, NO push, NO remote; the
#            LLM key is a file it reads and unlinks as its first act, before
#            preflight — repo content only ever executes here, only through the
#            pinned verification gate, and only after that file is gone.
#   PHASE 3  push gate -> push -> PR. Holds the token again. The model never
#            runs in this phase.
#
# Guarantees, defense-in-depth:
#   1. This script ONLY ever pushes a `clawmart/box-<id>` branch. It contains no
#      code path that pushes the base branch. Grep it: there is no `push .* main`.
#      pushgate.py re-checks the refspec against ^clawmart/box-[a-z0-9_]+$ and
#      refuses on workflow-file edits, oversized diffs, and credential-shaped
#      bytes in the CONTENT of every changed file (not in `git diff`'s rendering,
#      which one committed .gitattributes can blank out entirely).
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

WORK=/work/repo
# CLAWMART_STATE_DIR is a test seam (infra/agent/test-local.sh mounts a volume
# there so the journal and result.json outlive the container). Unset in prod.
STATE="${CLAWMART_STATE_DIR:-/work/state}"
SECRETS=/work/secrets
export HOME=/work/home

# ── PHASE 0: scrub the environment, then continue as a fresh process ─────────
if [ -z "${CLAWMART_ENV_SCRUBBED:-}" ]; then
  mkdir -p "$SECRETS" "$STATE" "$HOME"
  chmod 700 "$SECRETS"
  ( umask 077
    printf '%s' "${GITHUB_TOKEN:-}"    > "$SECRETS/gh"
    printf '%s' "${LLM_API_KEY:-}"     > "$SECRETS/llm"
    printf '%s' "${CALLBACK_SECRET:-}" > "$SECRETS/cb" )
  export CLAWMART_ENV_SCRUBBED=1
  exec env -u GITHUB_TOKEN -u LLM_API_KEY -u CALLBACK_SECRET bash "$0" "$@"
fi

# Held in shell memory only (never exported): not in /proc/*/environ, not on disk
# once the files below are removed. /work/secrets/llm stays until the harness
# reads and unlinks it, which happens before any repository code can run.
GH_TOKEN="$(cat "$SECRETS/gh" 2>/dev/null || true)"; rm -f "$SECRETS/gh"
CB_SECRET="$(cat "$SECRETS/cb" 2>/dev/null || true)"; rm -f "$SECRETS/cb"

cfg() { echo "$CLAWMART_CONFIG" | python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }

REPO_URL="$(cfg repoUrl)"
BASE_BRANCH="$(cfg baseBranch)"
CONVEX_SITE_URL="$(cfg convexSiteUrl)"
BRANCH="clawmart/box-${BOX_ID}"

# ── event streaming back into the Studio live feed ──────────────────────────
# Identical wire contract to v1 — convex/http.ts validates it.
event() {
  local kind="$1" text="$2"
  echo "[$kind] $text"
  [ -z "$CONVEX_SITE_URL" ] && return 0
  CONVEX_SITE_URL="$CONVEX_SITE_URL" CALLBACK_SECRET="$CB_SECRET" \
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

# ── terminal reporting: every exit path reports, including the abnormal ones ──
# The control plane settles this box's mission task on the literal status line
# "done" (convex/lib/boxevents.ts isBoxFinished). An ERR trap alone missed every
# other way out — a signal, a `set -u` failure, a python that dies — and the
# task then hung until the deadline watchdog fired minutes later. EXIT catches
# all of them, and FINISHED keeps the normal path from reporting twice.
FINISHED=0
FAIL_LINE=""
finish() {
  local rc="$1"
  if [ "$FINISHED" = "1" ]; then return 0; fi
  FINISHED=1
  if [ "$rc" != "0" ]; then
    event status "box failed — exit ${rc}${FAIL_LINE:+ (at line ${FAIL_LINE})}; no pull request was opened"
  fi
  event status "done"
}
trap 'FAIL_LINE=$LINENO' ERR
trap 'finish $?' EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# ── PHASE 1: clone + isolated work branch (holds the token) ─────────────────
# The token is supplied by a credential helper rather than embedded in the URL,
# so it never lands in /work/repo/.git/config — inside the very tree the agent
# reads from — and never appears in a process's argv.
#
# Everything else on this command line exists because phase 3 runs AFTER the
# verification gate has executed repository code as this same uid, so by then
# `.git/hooks/*` and `$HOME/.gitconfig` may both be attacker-written:
#   core.hooksPath=/dev/null  a planted pre-push hook would otherwise run while
#                             this process holds the PAT (hooks fire on more
#                             verbs than push, so it is set for every call here)
#   credential.helper=        empty value RESETS the helper list, so a helper
#                             planted in ~/.gitconfig cannot be handed the PAT
#                             by git's own credential `store` step
#   GIT_CONFIG_GLOBAL/SYSTEM  nothing this function does needs user config, and
#                             config can run commands (core.fsmonitor)
# Command-line `-c` beats any config file, which a --global setting would not.
git_authed() {
  GH_PUSH_TOKEN="$GH_TOKEN" GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null git \
    -c core.hooksPath=/dev/null \
    -c 'credential.helper=' \
    -c 'credential.helper=!f(){ printf "username=x-access-token\npassword=%s\n" "$GH_PUSH_TOKEN"; }; f' \
    "$@"
}

case "$REPO_URL" in
  https://github.com/*)
    OWNER_REPO="$(echo "$REPO_URL" | sed -E 's#https?://github.com/##; s#\.git$##')"
    CLONE_URL="https://github.com/${OWNER_REPO}.git"
    ;;
  *)
    # Local/self-hosted remote (used by infra/agent/test-local.sh). No token is
    # injected and none is needed.
    OWNER_REPO="${CLAWMART_OWNER_REPO:-local/repo}"
    CLONE_URL="$REPO_URL"
    ;;
esac

event status "cloning repository"
git config --global user.name  "clawmart-bot"
git config --global user.email "bot@clawmart.co"
git config --global advice.detachedHead false
git config --global safe.directory "$WORK"
# Container-wide default. Not a boundary on its own (gate-executed code can
# rewrite this file), which is why the calls that matter pass `-c` as well.
git config --global core.hooksPath /dev/null
git_authed clone --depth 50 --branch "$BASE_BRANCH" "$CLONE_URL" "$WORK" 2>&1 | tail -1
cd "$WORK"
BASE_SHA="$(git rev-parse HEAD)"
git checkout -q -b "$BRANCH"
event status "on branch $BRANCH — starting work"

# ── PHASE 2: the harness (no token, no remote, no push) ────────────────────
set +e
CLAWMART_REPO="$WORK" CLAWMART_STATE_DIR="$STATE" CLAWMART_BASE_SHA="$BASE_SHA" \
CONVEX_SITE_URL="$CONVEX_SITE_URL" CALLBACK_SECRET="$CB_SECRET" \
PYTHONPATH=/opt/clawmart python3 -m harness
HARNESS_RC=$?
set -e
[ "$HARNESS_RC" -ne 0 ] && event status "harness exited ${HARNESS_RC}"

RESULT="$STATE/result.json"
read_result() { python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get(sys.argv[2],''))" "$RESULT" "$1" 2>/dev/null || true; }
VERDICT="$(read_result verdict)"; VERDICT="${VERDICT:-CRASHED}"
COMMITS="$(read_result commits)"
# If result.json never made it to disk the harness died hard. Ask git directly
# rather than silently reporting "no changes" and dropping real work on the floor.
[ -z "$COMMITS" ] && COMMITS="$(git rev-list --count "${BASE_SHA}..HEAD" 2>/dev/null || echo 0)"

# ── PHASE 3: push gate -> push -> PR (holds the token again) ───────────────
if [ "$VERDICT" = "REFUSED" ]; then
  event output "no pull request: $(read_result summary)"
elif [ "$COMMITS" = "0" ]; then
  event output "no changes produced — nothing to open a PR for"
else
  if ! GATE_MSG="$(printf '%s\n%s\n' "$GH_TOKEN" "$CB_SECRET" \
        | python3 /opt/clawmart/pushgate.py --repo "$WORK" --base "$BASE_SHA" --branch "$BRANCH")"; then
    event status "push refused — ${GATE_MSG}"
    finish 0
    exit 0
  fi
  event status "${GATE_MSG}; pushing branch $BRANCH"
  git_authed push --no-verify origin "$BRANCH" 2>&1 | tail -1
  event status "opening pull request (${VERDICT})"
  PR_URL="$(GITHUB_TOKEN="$GH_TOKEN" python3 /opt/clawmart/openpr.py \
      "$OWNER_REPO" "$BRANCH" "$BASE_BRANCH" "$BOX_ID" "$RESULT" || true)"
  event output "opened PR: ${PR_URL:-(see branch $BRANCH)}"
fi

finish 0
