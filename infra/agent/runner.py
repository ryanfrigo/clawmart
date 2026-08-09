#!/usr/bin/env python3
"""
Clawmart reference agent — a small, dependency-free BYOK coding loop.

This is the default brain shipped in the agent image. It is deliberately simple
and swappable: point `agentImage` in the box config at your own image (Hermes,
Claude Code, etc.) to replace it. The value Clawmart provides is the *cage*
around it (scoped creds, PR-only, budget cap, audit) — not this loop.

Runs inside the container from entrypoint.sh, on an isolated `clawmart/*` branch.
Talks to OpenRouter with the BYOK key. Stops at the iteration or dollar budget.
Stdlib only.
"""
import json, os, subprocess, sys, urllib.request

CFG = json.loads(os.environ["CLAWMART_CONFIG"])
MODEL = CFG.get("model", "anthropic/claude-sonnet-4.6")
TASK = CFG.get("task", "").strip()
BUDGET_USD = float(CFG.get("budgetUsd", 2.0))
MAX_ITERS = int(CFG.get("maxIterations", 6))
API_KEY = os.environ["LLM_API_KEY"]

spent = 0.0


def event(kind, text):
    print(f"[{kind}] {text}", flush=True)
    site = CFG.get("convexSiteUrl", "")
    if not site:
        return
    body = json.dumps({"boxId": os.environ["BOX_ID"], "kind": kind, "text": text}).encode()
    req = urllib.request.Request(
        site.rstrip("/") + "/box/event", data=body,
        headers={"content-type": "application/json",
                 "x-clawmart-box-secret": os.environ.get("CALLBACK_SECRET", "")})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print("event post failed:", e, file=sys.stderr)


def sh(*args, check=True):
    return subprocess.run(args, capture_output=True, text=True, check=check).stdout


def repo_context():
    files = sh("git", "ls-files").splitlines()
    listing = "\n".join(files[:400])
    head = ""
    for f in ("README.md", "package.json", "pyproject.toml"):
        if f in files:
            head += f"\n--- {f} ---\n" + sh("cat", f)[:2000]
    return f"Repository files:\n{listing}\n{head}"


def call_model(messages):
    global spent
    body = json.dumps({
        "model": MODEL, "messages": messages,
        "max_tokens": 4096, "usage": {"include": True},
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions", data=body,
        headers={"Authorization": f"Bearer {API_KEY}", "content-type": "application/json",
                 "HTTP-Referer": "https://clawmart.co", "X-Title": "Clawmart Dev Box"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    usage = data.get("usage") or {}
    # OpenRouter returns real cost when usage.include is set; fall back to a rough estimate.
    cost = usage.get("cost")
    if cost is None:
        cost = (usage.get("prompt_tokens", 0) + usage.get("completion_tokens", 0)) / 1e6 * 3
    spent += float(cost)
    return data["choices"][0]["message"]["content"]


SYSTEM = (
    "You are a coding agent working in a git repository on an isolated branch. "
    "Each turn, respond with ONLY a JSON object (no prose, no markdown fences):\n"
    '{"message": "<commit message>", "done": <bool>, '
    '"files": [{"path": "<repo-relative>", "content": "<full new file contents>"}]}\n'
    "Write complete file contents, not diffs. Set done=true when the task is complete "
    "or no further change is safe. Keep changes minimal and focused on the task. "
    "Never invent secrets, credentials, testimonials, or fake data."
)


def parse(reply):
    reply = reply.strip()
    if reply.startswith("```"):
        reply = reply.split("```", 2)[1].lstrip("json").strip()
    return json.loads(reply)


def main():
    if not TASK:
        event("status", "no task provided — nothing to do")
        return
    event("status", f"agent starting · model {MODEL} · budget ${BUDGET_USD:.2f}")
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": f"Task:\n{TASK}\n\n{repo_context()}"},
    ]
    for i in range(1, MAX_ITERS + 1):
        if spent >= BUDGET_USD:
            event("status", f"budget reached (${spent:.2f}) — stopping")
            break
        event("status", f"iteration {i}/{MAX_ITERS} (spent ${spent:.2f})")
        try:
            step = parse(call_model(messages))
        except Exception as e:
            event("status", f"model/parse error: {e}")
            break
        changed = []
        for fobj in step.get("files", []):
            path = fobj["path"].lstrip("/")
            if ".." in path.split("/"):
                continue  # never write outside the repo
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w") as fh:
                fh.write(fobj["content"])
            changed.append(path)
        if changed:
            sh("git", "add", "-A")
            sh("git", "commit", "-m", step.get("message", f"clawmart: iteration {i}"), check=False)
            event("output", f"committed {len(changed)} file(s): {', '.join(changed[:5])}")
            messages.append({"role": "assistant", "content": json.dumps(step)})
            messages.append({"role": "user", "content": "Applied. Continue or set done=true."})
        if step.get("done") or not changed:
            event("status", "agent reports task complete")
            break
    event("status", f"agent loop finished · total spend ${spent:.2f}")


if __name__ == "__main__":
    main()
