#!/usr/bin/env python3
"""
The loop and the verdicts.

    preflight -> REFUSED | ready
    while budget:
        turn = llm.call(msgs)         # attempt counts against the iteration cap
        call = protocol.parse(turn)   # bad -> repair turn; 3 in a row -> stop
        res  = tools.dispatch(call)   # never raises
        mutating and ok -> the HARNESS commits (one commit per turn)
        finish -> run the whole gate; red -> ok:false + the failing output
        3 identical calls in a row -> STALLED
        msgs += [assistant(turn), user(untrusted(scrub(result)))] ; compact

The harness never emits a success string the gate did not produce. v1 posted
"agent reports task complete" into the owner's live feed on the model's say-so;
that line is deleted. `result.json`'s verdict is written by this file — only
pr_title/pr_body are model text, and both are sanitized and rendered as text.
"""
import json
import os
import random
import signal
import sys
import time

from . import budget as budget_mod
from . import events, llm, protocol, tools, verify

STALL_LIMIT = 3
PARSE_FAIL_LIMIT = 3
COMPACT_CHARS = 60_000

# The eight codeCapable roles of convex/lib/roster.ts. Duplicated across the
# TS/Python boundary on purpose (the harness cannot import Convex); an unknown
# or absent key is simply ignored, so drift degrades to the generic role.
ROLES = {
    "backend-architect": "a backend architect who designs for correctness and operability before cleverness",
    "frontend-engineer": "a frontend engineer who ships accessible, fast interfaces and writes real code",
    "data-engineer": "a data engineer who designs schemas and pipelines that stay correct under replays",
    "ai-engineer": "an AI engineer who treats model output as untrusted input and designs the eval first",
    "devops": "a DevOps engineer who optimizes for a small team's operational load and a real budget",
    "security-engineer": "a security engineer who threat-models trust boundaries and writes testable mitigations",
    "qa-engineer": "a QA engineer who writes test cases around edge conditions and failure paths",
    "performance-engineer": "a performance engineer who reasons about budgets, hot paths, and cost per request",
}
GENERIC_ROLE = "a careful software engineer"


def sanitize_title(text: str, fallback: str) -> str:
    line = " ".join(str(text or "").split())[:120]
    return line or fallback


def sanitize_body(text: str, cap: int = 8000) -> str:
    clean = "".join(c for c in str(text or "") if c == "\n" or c >= " ")
    return clean[:cap]


def compact(msgs: list) -> list:
    """Elide the oldest tool results only. System, task, and last 3 turns stay."""
    total = sum(len(m.get("content", "")) for m in msgs)
    if total < COMPACT_CHARS or len(msgs) <= 6:
        return msgs
    for i in range(2, len(msgs) - 3):
        if msgs[i]["role"] == "user" and not msgs[i]["content"].startswith("[elided"):
            msgs[i] = {"role": "user", "content": "[elided older tool result]"}
            total = sum(len(m.get("content", "")) for m in msgs)
            if total < COMPACT_CHARS:
                break
    return msgs


def write_result(state_dir: str, payload: dict) -> None:
    try:
        os.makedirs(state_dir, exist_ok=True)
        safe = json.loads(events.scrub(json.dumps(payload, default=str)))
        with open(os.path.join(state_dir, "result.json"), "w", encoding="utf-8") as fh:
            json.dump(safe, fh)
    except Exception as e:
        print("could not write result.json:", e, file=sys.stderr)


def main() -> int:
    cfg = json.loads(os.environ.get("CLAWMART_CONFIG") or "{}")
    repo = os.environ.get("CLAWMART_REPO", "/work/repo")
    state_dir = os.environ.get("CLAWMART_STATE_DIR", "/work/state")
    events.configure(site_url=cfg.get("convexSiteUrl", ""), state_dir=state_dir)

    task = str(cfg.get("task", "")).strip()
    base = os.environ.get("CLAWMART_BASE_SHA", "").strip()
    result = {"verdict": "CRASHED", "summary": "", "pr_title": "", "pr_body": "",
              "gate_report": "", "commits": 0, "model": "", "spent_usd": 0.0,
              "gate_touched_paths": []}

    try:
        if not task:
            result.update(verdict="REFUSED", summary="no task provided")
            events.event("status", "no task provided — nothing to do")
            return 0
        if not base:
            result.update(verdict="CRASHED", summary="base commit was not resolved")
            events.event("status", "base commit was not resolved — cannot pin the gate")
            return 0

        # ── budget ────────────────────────────────────────────────────────────
        runtime_min = cfg.get("maxRuntimeMin", 60)
        try:
            runtime_min = max(1, min(int(runtime_min), 1440))
        except (TypeError, ValueError):
            runtime_min = 60
        bud = budget_mod.Budget(
            usd=float(cfg.get("budgetUsd", 2) or 2),
            max_iterations=int(cfg.get("maxIterations", 30) or 30),
            seconds=runtime_min * 60 - budget_mod.SHUTDOWN_RESERVE_S,
        )
        signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(TimeoutError("wall clock")))
        signal.alarm(int(max(1, bud.remaining_seconds())))

        # ── the BYOK key, BEFORE anything from the repository executes ───────
        # The gate below runs `npm ci` and the repo's own test suite as this
        # uid. Reading and unlinking the key here — not at the first model call
        # — is what makes entrypoint.sh's and docs/PROVISIONING.md's claim true:
        # from this line on, the key exists only in this process's memory.
        key = llm.read_key(os.environ.get("CLAWMART_LLM_KEY_FILE", "/work/secrets/llm"))
        events.register_secret(key)
        if not key:
            events.event("status", "no model key was delivered to the box — cannot start")
            result.update(verdict="REFUSED", summary="no model API key")
            return 0

        agent_key = str(cfg.get("agentKey") or "")
        role = ROLES.get(agent_key, GENERIC_ROLE)
        model = str(cfg.get("model") or "anthropic/claude-sonnet-4.6")
        chain = cfg.get("models") if isinstance(cfg.get("models"), list) else [model]
        events.event(
            "status",
            f"harness starting · {agent_key or 'engineer'} · model {chain[0]} · "
            f"budget ${bud.usd:.2f} · {bud.max_iterations} iterations",
        )

        # ── gate, pinned at base, before the model sees anything ─────────────
        gate = verify.Gate(repo, base, remaining_seconds=bud.remaining_seconds)
        preflight_started = time.monotonic()
        install = gate.run_install()
        if install is not None:
            events.event("status", f"install: {'ok' if install.ok else 'FAILED'} ({install.seconds:.0f}s)")
        gate.prune_unrunnable()
        for reason in gate.dropped:
            events.event("status", f"gate step dropped — {reason}")

        if install is not None and not install.ok:
            report = verify.Verdict([install]).report()
            events.event("status", "base branch does not install cleanly; nothing here could be verified")
            events.event("output", report)
            result.update(verdict="REFUSED", summary="base branch fails its own install",
                          gate_report=report)
            return 0

        pre = gate.run_all() if gate.steps else verify.Verdict([])
        bud.reserve(time.monotonic() - preflight_started)
        if gate.steps and not pre.green:
            report = pre.report()
            events.event("status", "base branch does not pass its own gate; nothing here could be verified")
            events.event("output", report)
            result.update(verdict="REFUSED", summary="base branch fails its own verification gate",
                          gate_report=report)
            return 0
        unverified = not gate.steps
        if unverified:
            events.event("status", "no verification gate on this repository — every PR from this run is a draft")
        else:
            events.event("status", f"base is green ({', '.join(gate.step_names())}) — starting work")

        # ── the loop ─────────────────────────────────────────────────────────
        nonce = "%08x" % random.getrandbits(32)
        notes = cfg.get("repoNotes") if isinstance(cfg.get("repoNotes"), list) else []
        note_text = "\n".join(str(n) for n in notes[:20])
        msgs = [
            {"role": "system", "content": protocol.system_prompt(
                role, tools.tool_spec(), gate.describe(), nonce)},
            {"role": "user", "content": (
                f"Task:\n{task}\n\n{tools.summarize_repo(repo)}"
                + (("\n\nRepository notes:\n" + protocol.wrap_untrusted(nonce, note_text))
                   if note_text else "")
            )},
        ]

        kit = tools.Tools(repo, gate)
        client = llm.Client(key, chain, bud)

        verdict = ""
        parse_fails = 0
        last_digest = ""
        repeats = 0
        gate_report = ""
        summary = ""
        pr_title = ""
        pr_body = ""

        while True:
            blocker = bud.blocker()
            if blocker:
                verdict = bud.verdict_for(blocker)
                events.event("status", f"stopping — {blocker}")
                break
            bud.start_iteration()
            events.event(
                "status",
                f"iteration {bud.iterations}/{bud.max_iterations} (spent ${bud.spent:.4f})",
            )
            try:
                turn = client.call(msgs)
            except llm.AuthError as e:
                events.event("status", f"model credential rejected — stopping: {e}")
                verdict = "BUDGET"
                break
            except llm.OutOfMoney as e:
                events.event("status", f"stopping mid-call — {e}")
                verdict = "BUDGET"
                break
            except llm.CallFailed as e:
                events.event("status", f"every model in the chain failed: {e}")
                verdict = "BUDGET"
                break

            call, error = protocol.parse(turn, tools.REGISTRY)
            if call is None:
                parse_fails += 1
                events.event("status", f"malformed turn ({error})")
                if parse_fails >= PARSE_FAIL_LIMIT:
                    verdict = "STALLED"
                    events.event("status", "three malformed turns in a row — stopping with partial credit")
                    break
                msgs.append({"role": "assistant", "content": turn[:4000]})
                msgs.append({"role": "user", "content": protocol.repair(error, tools.REGISTRY)})
                msgs = compact(msgs)
                continue
            parse_fails = 0

            digest = call.digest()
            repeats = repeats + 1 if digest == last_digest else 1
            last_digest = digest
            if repeats >= STALL_LIMIT:
                verdict = "STALLED"
                events.event("status", f"the same {call.tool} call three times in a row — stopping")
                break

            events.journal({"iteration": bud.iterations, "tool": call.tool,
                            "args": call.args, "thought": call.thought})
            if call.tool == "finish":
                summary = str(call.args.get("summary", ""))
                pr_title = sanitize_title(call.args.get("pr_title"), "Clawmart dev box change")
                pr_body = sanitize_body(call.args.get("pr_body"))
                if unverified:
                    verdict = "UNVERIFIED"
                    events.event("status", "agent finished, but this repository had no gate to verify it")
                    break
                v = gate.run_all()
                gate_report = v.report()
                if v.green and tools.has_changes(repo, base):
                    verdict = "VERIFIED"
                    events.event("status", "gate is green and the branch has changes — verified")
                    break
                res = tools.Result(
                    False,
                    gate_report if not v.green
                    else "the gate is green but the branch contains no changes; nothing to open a PR for",
                )
                events.event("output", res.result)
            else:
                res = kit.dispatch(call)
                if call.tool in tools.MUTATING:
                    if res.ok:
                        tools.commit(repo, call.thought or f"clawmart: {call.tool} {call.args.get('path', '')}")
                        events.event("output", res.result)
                    else:
                        # A refused write is security-relevant: it belongs in the
                        # owner's audit trail, not only in the model's context.
                        events.event(
                            "status",
                            f"refused {call.tool} {call.args.get('path', '')}: {res.result[:160]}",
                        )
                events.journal({"iteration": bud.iterations, "tool": call.tool,
                                "ok": res.ok, "error": "" if res.ok else res.result[:200]})

            msgs.append({"role": "assistant", "content": turn[:4000]})
            msgs.append({"role": "user", "content": protocol.wrap_untrusted(
                nonce, events.scrub(res.render()))})
            msgs = compact(msgs)

        signal.alarm(0)
        if tools.dirty(repo):
            tools.commit(repo, "clawmart: uncommitted work at stop")
        commits = tools.commit_count(repo, base)
        if not verdict:
            verdict = "UNVERIFIED" if unverified else "STALLED"

        # Pinning fixes the command, not the code behind it. If this branch
        # edited what the gate executes, a green gate is the change agreeing
        # with itself — openpr.py turns that into a draft that says so.
        touched = verify.gate_paths(tools.changed_paths(repo, base), gate.consumed_paths())
        if touched:
            events.event(
                "status",
                "this change edits files the gate itself runs (" + ", ".join(touched[:5])
                + ") — the pull request will be a draft that says so",
            )

        result.update(
            verdict=verdict,
            summary=summary or f"{commits} commit(s); gate verdict {verdict}",
            pr_title=pr_title, pr_body=pr_body, gate_report=gate_report,
            commits=commits, model=client.model, spent_usd=round(bud.spent, 4),
            unverified=unverified, gate_touched_paths=touched[:20],
        )
        events.event(
            "status",
            f"harness finished · {result['verdict']} · {commits} commit(s) · spent ${bud.spent:.4f}",
        )
        return 0
    except TimeoutError:
        events.event("status", "wall-clock deadline reached — stopping so the PR still opens")
        try:
            if tools.dirty(repo):
                tools.commit(repo, "clawmart: uncommitted work at deadline")
            result.update(verdict="BUDGET", commits=tools.commit_count(repo, base))
        except Exception:
            pass
        return 0
    except Exception as e:
        events.event("status", f"harness crashed: {type(e).__name__}: {e}")
        try:
            result.update(verdict="CRASHED", summary=f"{type(e).__name__}: {e}",
                          commits=tools.commit_count(repo, base))
        except Exception:
            pass
        return 0
    finally:
        signal.alarm(0)
        write_result(state_dir, result)


if __name__ == "__main__":
    sys.exit(main())
