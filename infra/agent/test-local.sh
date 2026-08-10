#!/usr/bin/env bash
#
# Local proof for the box harness. No AWS, no GitHub, no model key, no network
# beyond a private docker bridge.
#
#   ./infra/agent/test-local.sh              # every scenario
#   ./infra/agent/test-local.sh verified     # one scenario by name
#
# What it does per scenario:
#   1. build the image (its own unit tests are a build gate)
#   2. seed a throwaway git repo into a bare origin held in a docker volume
#   3. start tests/fake_upstream.py on a user-defined bridge — it stands in for
#      OpenRouter, Convex /box/event, and the GitHub PR API at once
#   4. run the agent with EXACTLY the production docker flags
#   5. assert against the recorded traffic, the harness journal, and the refs
#      that actually landed in origin
#
# Exit code is non-zero on any failure, so it can gate the image build in CI.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE="${CLAWMART_TEST_IMAGE:-clawmart-agent:test}"
OUT="$(mktemp -d)"
PASS=0; FAIL=0

# Fake credentials. Deliberately shaped like the real thing so the scrub, the
# push gate, and the "no secret ever leaves the box" assertions are meaningful.
FAKE_GH="ghp_LOCALTESTLOCALTESTLOCALTEST0001"
FAKE_LLM="sk-or-v1-localtestlocaltestlocaltestlocaltest01"
FAKE_CB="7c1f9a2b8e4d60531a2b3c4d5e6f7081"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$*"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$*"; }
check(){ if [ "$1" = "0" ]; then ok "$2"; else bad "$2"; fi; }

cleanup() {
  docker rm -f "$FAKE_NAME" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker volume rm "$ORIGIN_VOL" "$STATE_VOL" >/dev/null 2>&1 || true
}

# ── build (unit tests are a RUN step, so a red suite means no image) ─────────
say "building $IMAGE"
docker build -q -t "$IMAGE" "$HERE" || { echo "image build failed"; exit 1; }

run_scenario() {
  local name="$1" fixture="$2" transcript="$3" seed_break="${4:-}"
  local repo_url="${5:-file:///origin/origin.git}"
  NET="clawmart-t-$name-$$"; FAKE_NAME="clawmart-fake-$name-$$"
  ORIGIN_VOL="clawmart-origin-$name-$$"; STATE_VOL="clawmart-state-$name-$$"
  DIR="$OUT/$name"; mkdir -p "$DIR"
  trap cleanup RETURN

  docker network create "$NET" >/dev/null
  docker volume create "$ORIGIN_VOL" >/dev/null
  docker volume create "$STATE_VOL" >/dev/null

  # seed origin.git from the fixture (root, then chown to the agent's uid)
  docker run --rm --user 0:0 -v "$ORIGIN_VOL:/origin" -v "$STATE_VOL:/state" \
    -e "FIXTURE=$fixture" -e "SEED_BREAK=$seed_break" \
    --entrypoint bash "$IMAGE" -c '
      set -e
      export HOME=/tmp/seedhome; mkdir -p "$HOME"
      git config --global user.email seed@clawmart.test
      git config --global user.name  clawmart-seed
      git config --global init.defaultBranch main
      rm -rf /tmp/seed && mkdir -p /tmp/seed
      cp -a /opt/clawmart/tests/fixtures/repo-ok/. /tmp/seed/
      if [ "$FIXTURE" != "repo-ok" ]; then
        cp -a "/opt/clawmart/tests/fixtures/$FIXTURE/." /tmp/seed/
      fi
      if [ -n "$SEED_BREAK" ]; then
        printf "%s\n" "'"'"'use strict'"'"';" "function add(a,b){return a-b;}" \
          "function subtract(a,b){return a-b;}" "module.exports={add,subtract};" \
          > /tmp/seed/src/math.js
      fi
      cd /tmp/seed
      git init -q .
      git add -A && git commit -qm "fixture base"
      git init -q --bare /origin/origin.git
      git push -q /origin/origin.git main
      chown -R 10001:10001 /origin /state
    ' >"$DIR/seed.log" 2>&1 || { bad "$name: seeding failed (see $DIR/seed.log)"; return 1; }

  docker run -d --name "$FAKE_NAME" --network "$NET" --network-alias fake \
    -e "FAKE_TRANSCRIPT=/opt/clawmart/tests/fixtures/transcripts/$transcript" \
    --entrypoint python3 "$IMAGE" /opt/clawmart/tests/fake_upstream.py >/dev/null
  sleep 1

  local cfg
  cfg="$(python3 -c '
import json,sys
print(json.dumps({
 "boxId": sys.argv[1], "repoUrl": sys.argv[2], "baseBranch": "main",
 "task": "Add a multiply(a, b) function to src/math.js, export it, and cover it in tests/run.js.",
 "model": "test/model", "budgetUsd": 2, "maxIterations": 12, "maxRuntimeMin": 8,
 "agentKey": "backend-architect", "repoNotes": [],
 "convexSiteUrl": "http://fake:8080/convex", "agentImage": "local"}))' "box_$name" "$repo_url")"

  # EXACTLY the production flags from infra/cloud-init.sh, plus the volumes and
  # the fake-upstream env the rig needs.
  docker run --rm --network "$NET" --name "clawmart-agent-$name-$$" \
    --user 10001:10001 \
    --read-only --tmpfs /work:rw,exec,size=2g,uid=10001,gid=10001,mode=0700 \
    --tmpfs /tmp:rw,size=512m \
    --memory 1500m --cpus 1.8 \
    --security-opt no-new-privileges --cap-drop ALL --pids-limit 512 \
    -v "$ORIGIN_VOL:/origin" -v "$STATE_VOL:/state" \
    -e "BOX_ID=box_$name" -e "CLAWMART_CONFIG=$cfg" \
    -e "LLM_API_KEY=$FAKE_LLM" -e "GITHUB_TOKEN=$FAKE_GH" -e "CALLBACK_SECRET=$FAKE_CB" \
    -e "CLAWMART_STATE_DIR=/state" \
    -e "CLAWMART_LLM_BASE=http://fake:8080/v1" \
    -e "CLAWMART_GITHUB_API=http://fake:8080/gh" \
    -e "CLAWMART_OWNER_REPO=local/fixture" \
    "$IMAGE" >"$DIR/agent.log" 2>&1
  echo "$?" > "$DIR/agent.rc"

  docker run --rm --network "$NET" --entrypoint python3 "$IMAGE" -c \
    "import urllib.request;print(urllib.request.urlopen('http://fake:8080/_recorded').read().decode())" \
    >"$DIR/recorded.json" 2>/dev/null
  docker run --rm -v "$STATE_VOL:/state" --entrypoint sh "$IMAGE" -c \
    'cat /state/result.json 2>/dev/null || echo "{}"' >"$DIR/result.json" 2>/dev/null
  docker run --rm -v "$STATE_VOL:/state" --entrypoint sh "$IMAGE" -c \
    'cat /state/journal.jsonl 2>/dev/null || true' >"$DIR/journal.jsonl" 2>/dev/null
  docker run --rm -v "$ORIGIN_VOL:/origin" --entrypoint git "$IMAGE" \
    -C /origin/origin.git for-each-ref --format='%(refname) %(objectname)' \
    >"$DIR/refs.txt" 2>/dev/null
  docker run --rm -v "$ORIGIN_VOL:/origin" --entrypoint sh "$IMAGE" -c \
    'b=$(git -C /origin/origin.git for-each-ref --format="%(refname)" refs/heads/clawmart | head -1); \
     [ -n "$b" ] && git -C /origin/origin.git archive "$b" | tar -t; true' \
    >"$DIR/tree.txt" 2>/dev/null
  docker run --rm -v "$ORIGIN_VOL:/origin" --entrypoint sh "$IMAGE" -c \
    'b=$(git -C /origin/origin.git for-each-ref --format="%(refname)" refs/heads/clawmart | head -1); \
     [ -n "$b" ] && git -C /origin/origin.git archive "$b" | tar -xO; true' \
    >"$DIR/blobs.txt" 2>/dev/null
  return 0
}

# assert.py <dir> <expr...>  — every expression must be true
assert_py() {
  local dir="$1"; shift
  CLAW_DIR="$dir" CLAW_GH="$FAKE_GH" CLAW_LLM="$FAKE_LLM" CLAW_CB="$FAKE_CB" \
  python3 - "$@" <<'PY'
import json, os, sys
d = os.environ["CLAW_DIR"]
def rd(name):
    try:
        with open(os.path.join(d, name)) as fh: return fh.read()
    except OSError: return ""
ctx = {
  "result": json.loads(rd("result.json") or "{}"),
  "recorded": json.loads(rd("recorded.json") or "{}"),
  "journal": rd("journal.jsonl"),
  "refs": rd("refs.txt"),
  "tree": rd("tree.txt"),
  "blobs": rd("blobs.txt"),
  "log": rd("agent.log"),
  "rc": rd("agent.rc").strip(),
  "SECRETS": [os.environ["CLAW_GH"], os.environ["CLAW_LLM"], os.environ["CLAW_CB"]],
  "json": json,
}
ctx["events"] = "\n".join(e.get("body", "") for e in ctx["recorded"].get("events", []))
ctx["prs"] = ctx["recorded"].get("prs", [])
ctx["pr_body"] = "\n".join(json.dumps(p.get("body", {})) for p in ctx["prs"])
# ctx as GLOBALS, not locals: a generator expression cannot see eval() locals.
bad = [e for e in sys.argv[1:] if not eval(e, ctx)]
if bad:
    print("failed:", "; ".join(bad), file=sys.stderr)
    print("  verdict=", ctx["result"].get("verdict"), "llm_calls=",
          ctx["recorded"].get("llm_calls"), "prs=", len(ctx["prs"]), file=sys.stderr)
    sys.exit(1)
PY
}

SELECT="${1:-all}"
want() { [ "$SELECT" = "all" ] || [ "$SELECT" = "$1" ]; }

# ── 1. the loop actually closes a gate ──────────────────────────────────────
if want verified; then
  say "verified — the gate closes, and a change that edits the gate is a draft"
  run_scenario verified repo-ok fix.jsonl
  assert_py "$OUT/verified" \
    'result["verdict"] == "VERIFIED"' \
    'result["commits"] >= 2' \
    '"refs/heads/clawmart/box-box_verified" in refs' \
    'len(prs) == 1' \
    '"multiply" in blobs'
  check $? "gate closed: VERIFIED, branch in origin, PR opened"
  # This transcript also edits tests/run.js — the file the gate runs. The gate
  # is green, but it is the change grading its own homework, so the PR says so.
  assert_py "$OUT/verified" \
    'result["gate_touched_paths"] == ["tests/run.js"]' \
    'prs[0]["body"]["draft"] is True' \
    '"gate files changed" in prs[0]["body"]["title"]' \
    '"not independent evidence" in prs[0]["body"]["body"]' \
    '"edits files the gate itself runs" in events'
  check $? "self-certified change -> draft PR + feed event naming tests/run.js"
  assert_py "$OUT/verified" 'events.count("\"text\": \"done\"") == 1'
  check $? "exactly one terminal event on the normal path"
  assert_py "$OUT/verified" \
    '"refs/heads/main" in refs' \
    '"POSTINSTALL_RAN" not in tree'
  check $? "npm ci --ignore-scripts: the postinstall marker never ran"
  assert_py "$OUT/verified" \
    'sum(1 for l in refs.splitlines() if l.startswith("refs/heads/")) == 2'
  check $? "only the clawmart/* branch was added to origin"
fi

# ── 2. done is earned, never declared ───────────────────────────────────────
if want earned; then
  say "earned — finish on a red gate is refused, the PR is a draft"
  run_scenario earned repo-ok premature.jsonl
  assert_py "$OUT/earned" \
    'result["verdict"] != "VERIFIED"' \
    'len(prs) == 1 and prs[0]["body"]["draft"] is True' \
    '"DRAFT" in prs[0]["body"]["title"]' \
    '"add(2,2) should be 4" in prs[0]["body"]["body"]' \
    '"agent reports task complete" not in events'
  check $? "premature finish -> draft PR carrying the real failing output"
fi

# ── 3. pinning defeats gate tampering ───────────────────────────────────────
if want pinned; then
  say "pinned — rewriting package.json cannot make the gate green"
  run_scenario pinned repo-ok tamper.jsonl
  assert_py "$OUT/pinned" \
    'result["verdict"] != "VERIFIED"' \
    '"add(2,2) should be 4" in result["gate_report"]' \
    'all(p["body"]["draft"] for p in prs)'
  check $? 'rewriting "test" to "exit 0" changed nothing'
fi

# ── 4/5. hostile repository content ─────────────────────────────────────────
if want hostile; then
  say "hostile — prompt injection + every escape the README asks for"
  run_scenario hostile repo-hostile hostile.jsonl
  assert_py "$OUT/hostile" \
    '".git/hooks/pre-commit" not in tree' \
    '".github/workflows/evil.yml" not in tree' \
    '".clawmart/verify.json" not in tree' \
    '"notes/token.txt" not in tree' \
    'journal.count("\"ok\": false") >= 7' \
    'events.count("refused write_file") >= 7' \
    '"off-limits" in events and "symlink" in events and "not allowed in a path" in events'
  check $? "every forbidden write refused, with the reason in the audit feed"
  assert_py "$OUT/hostile" \
    'all(s not in events for s in SECRETS)' \
    'all(s not in journal for s in SECRETS)' \
    'all(s not in json.dumps(result) for s in SECRETS)' \
    'all(s not in pr_body for s in SECRETS)' \
    'all(s not in blobs for s in SECRETS)' \
    'all(s not in log for s in SECRETS)'
  check $? "no box secret in the feed, journal, result, PR body, tree, or logs"
  assert_py "$OUT/hostile" 'result["verdict"] == "VERIFIED"'
  check $? "the run still completed the real task"
fi

# ── 6. preflight refuses a base that fails its own gate ─────────────────────
if want refused; then
  say "refused — base branch is red before a single model call"
  run_scenario refused repo-ok fix.jsonl break
  assert_py "$OUT/refused" \
    'result["verdict"] == "REFUSED"' \
    'recorded["llm_calls"] == 0' \
    'len(prs) == 0' \
    '"could be verified" in events'
  check $? "zero model calls, zero spend, no PR, honest feed event"
  assert_py "$OUT/refused" \
    'sum(1 for l in refs.splitlines() if l.startswith("refs/heads/")) == 1'
  check $? "nothing was pushed to origin"
fi

# ── 7. the push gate is an egress filter on bytes ───────────────────────────
if want pushgate; then
  say "pushgate — a credential-shaped diff never leaves the box"
  run_scenario pushgate repo-ok leak.jsonl
  assert_py "$OUT/pushgate" \
    'len(prs) == 0' \
    '"push refused" in events' \
    '"credential" in events' \
    'sum(1 for l in refs.splitlines() if l.startswith("refs/heads/")) == 1'
  check $? "push refused, reason in the feed, origin untouched"
fi

# ── 8. a model that never produces a valid turn ─────────────────────────────
if want malformed; then
  say "malformed — prose, truncated JSON, and an invented tool"
  run_scenario malformed repo-ok malformed.jsonl
  assert_py "$OUT/malformed" \
    'result["verdict"] == "STALLED"' \
    'len(prs) == 0' \
    '"Traceback" not in log' \
    '"malformed turn" in events'
  check $? "three bad turns -> clean stop, no PR, no traceback"
fi

# ── 9. a change that leaves the gate alone opens a REAL pull request ────────
if want nondraft; then
  say "nondraft — verified work that does not touch the gate is not a draft"
  run_scenario nondraft repo-ok fix-src-only.jsonl
  assert_py "$OUT/nondraft" \
    'result["verdict"] == "VERIFIED"' \
    'result["gate_touched_paths"] == []' \
    'len(prs) == 1 and prs[0]["body"]["draft"] is False' \
    '"DRAFT" not in prs[0]["body"]["title"]' \
    '"not independent evidence" not in prs[0]["body"]["body"]'
  check $? "the draft downgrade fires on gate edits only, not on every PR"
fi

# ── 10. the model key is gone before repository code runs ───────────────────
if want keygone; then
  say "keygone — the BYOK key is unlinked BEFORE the gate executes repo code"
  # The gate is repository code. This fixture's gate asserts the key file is
  # already gone, so a run that still had it on disk fails preflight (REFUSED)
  # with that message in the feed instead of reaching VERIFIED.
  run_scenario keygone repo-keyprobe fix.jsonl
  assert_py "$OUT/keygone" \
    'result["verdict"] == "VERIFIED"' \
    '"still on disk while repository code runs" not in events'
  check $? "no key file on disk while the gate ran"
fi

# ── 11. an abnormal exit still reports, or the mission hangs ────────────────
if want abnormal; then
  say "abnormal — a box that dies before phase 2 still posts a terminal event"
  run_scenario abnormal repo-ok fix.jsonl "" "file:///origin/does-not-exist.git"
  assert_py "$OUT/abnormal" \
    'rc != "0"' \
    '"box failed" in events' \
    'events.count("\"text\": \"done\"") == 1' \
    'len(prs) == 0' \
    'recorded["llm_calls"] == 0'
  check $? "clone failure -> failure event + the terminal line the bridge needs"
fi

say "summary"
printf '  %d passed, %d failed   (artifacts: %s)\n' "$PASS" "$FAIL" "$OUT"
[ "$FAIL" -eq 0 ]
