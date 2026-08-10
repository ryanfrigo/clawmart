#!/usr/bin/env python3
"""
The model's entire action space: 7 tools plus `finish`. Deny by default —
anything not in REGISTRY cannot be requested, and every tool returns
{"ok": bool, "result": str} rather than raising, so an error is feedback, not a
crash.

Deliberately ABSENT, and not by oversight:
  - no `bash`/shell of any kind (a prefix allowlist dies to ';', '&&', '$(...)',
    a newline; an LLM judge reads the same attacker-controlled context)
  - no network tool, no package install (install is a phase, not a tool)
  - no git verbs — the HARNESS commits after each accepted mutating turn, and
    push/PR happen in a phase the model never runs in
  - no delete_file / move_file, no cross-run memory write-back

`search` uses `git grep`, not ripgrep: no new dependency in the image, and
`git ls-files` for `list_files` gets .gitignore handling and an invisible .git/
for free.
"""
import os
import subprocess

from . import events, fs
from .verify import safe_env, truncate

MAX_FILE_LINES = 1500
DIFF_CAP = 20_000
GIT_TIMEOUT = 30
GREP_TIMEOUT = 15

REGISTRY = {
    "list_files": {
        "help": 'list_files {"prefix": "src/", "limit": 300} — tracked files only',
        "args": {"prefix": str, "limit": int},
        "required": [],
        "defaults": {"prefix": "", "limit": 300},
    },
    "read_file": {
        "help": 'read_file {"path": "src/a.ts", "start_line": 1, "end_line": 200}',
        "args": {"path": str, "start_line": int, "end_line": int},
        "required": ["path"],
        "defaults": {"start_line": 1, "end_line": 0},
    },
    "search": {
        "help": 'search {"pattern": "provisionBox", "path": "convex", "max_results": 60}',
        "args": {"pattern": str, "path": str, "max_results": int},
        "required": ["pattern"],
        "defaults": {"path": ".", "max_results": 60},
    },
    "write_file": {
        "help": 'write_file {"path": "src/a.ts", "content": "<entire new file>"}',
        "args": {"path": str, "content": str},
        "required": ["path", "content"],
        "defaults": {},
    },
    "edit_file": {
        "help": 'edit_file {"path": "src/a.ts", "find": "<exact text>", "replace": "...", "expect_count": 1}',
        "args": {"path": str, "find": str, "replace": str, "expect_count": int},
        "required": ["path", "find", "replace"],
        "defaults": {"expect_count": 1},
    },
    "diff": {
        "help": 'diff {"path": "src"} — your changes so far ("" for all)',
        "args": {"path": str},
        "required": [],
        "defaults": {"path": ""},
    },
    "run_verify": {
        "help": 'run_verify {"step": "test"} — run one gate step by NAME ("" runs all)',
        "args": {"step": str},
        "required": [],
        "defaults": {"step": ""},
    },
    "finish": {
        "help": 'finish {"summary": "...", "pr_title": "...", "pr_body": "..."} — '
                "REQUESTS completion; runs the whole gate and fails if it is red",
        "args": {"summary": str, "pr_title": str, "pr_body": str},
        "required": ["summary", "pr_title", "pr_body"],
        "defaults": {},
    },
}

MUTATING = ("write_file", "edit_file")


def tool_spec() -> str:
    return "\n".join("  " + REGISTRY[k]["help"] for k in REGISTRY)


class Result:
    __slots__ = ("ok", "result")

    def __init__(self, ok: bool, result: str):
        self.ok = ok
        self.result = str(result)

    def render(self, cap: int = 6000) -> str:
        head = "OK\n" if self.ok else "ERROR\n"
        body = self.result
        return head + (body if len(body) <= cap else body[:cap] + "\n... [truncated]")


def _git(repo: str, argv: list, timeout: int = GIT_TIMEOUT):
    # core.hooksPath=/dev/null on every invocation, not just `commit --no-verify`:
    # the verification gate executes repository code as this uid, so .git/hooks/*
    # may exist by now, and hooks fire on more verbs than commit.
    events.command(["git"] + argv)
    return subprocess.run(
        ["git", "-c", "core.hooksPath=/dev/null"] + argv, cwd=repo, env=safe_env(),
        capture_output=True, text=True, errors="replace", timeout=timeout,
    )


class Tools:
    """Bound to one repo + one gate. dispatch() never raises."""

    def __init__(self, repo: str, gate):
        self.repo = repo
        self.gate = gate

    def dispatch(self, call) -> Result:
        try:
            fn = getattr(self, "_" + call.tool)
            return fn(**call.args)
        except fs.Denied as e:
            return Result(False, f"refused: {e}")
        except subprocess.TimeoutExpired:
            return Result(False, "the command timed out")
        except TimeoutError:
            # The wall-clock SIGALRM. Swallowing it here would ALSO disarm it —
            # the alarm fires once — so the run would then be unbounded in time.
            raise
        except Exception as e:  # a tool bug must not end the run
            return Result(False, f"{type(e).__name__}: {e}")

    # -- read ---------------------------------------------------------------
    def _list_files(self, prefix: str = "", limit: int = 300) -> Result:
        out = _git(self.repo, ["ls-files"])
        if out.returncode != 0:
            return Result(False, out.stderr.strip()[:400])
        files = [f for f in out.stdout.splitlines() if f.startswith(prefix)]
        limit = max(1, min(int(limit), 2000))
        shown = files[:limit]
        more = "" if len(files) <= limit else f"\n... {len(files) - limit} more"
        return Result(True, f"{len(files)} tracked file(s)\n" + "\n".join(shown) + more)

    def _read_file(self, path: str, start_line: int = 1, end_line: int = 0) -> Result:
        text = fs.read_text(self.repo, path)
        lines = text.splitlines()
        start = max(1, int(start_line))
        end = len(lines) if int(end_line) <= 0 else min(len(lines), int(end_line))
        if start > len(lines):
            return Result(False, f"{path} has {len(lines)} lines; start_line {start} is past the end")
        end = min(end, start + MAX_FILE_LINES - 1)
        body = "\n".join(f"{i:>5}\t{lines[i - 1]}" for i in range(start, end + 1))
        tail = "" if end >= len(lines) else f"\n... [{len(lines) - end} more lines]"
        return Result(True, f"{path} lines {start}-{end} of {len(lines)}\n{body}{tail}")

    def _search(self, pattern: str, path: str = ".", max_results: int = 60) -> Result:
        if not pattern.strip():
            return Result(False, "pattern is empty")
        scope = "." if path.strip() in ("", ".") else fs.normalize(path)
        # -e stops a pattern that begins with '-' from parsing as a flag.
        out = _git(
            self.repo,
            ["grep", "-n", "-I", "--no-color", "-e", pattern, "--", scope],
            timeout=GREP_TIMEOUT,
        )
        if out.returncode == 1:
            return Result(True, "no matches")
        if out.returncode != 0:
            return Result(False, (out.stderr or "search failed").strip()[:400])
        hits = out.stdout.splitlines()
        limit = max(1, min(int(max_results), 400))
        more = "" if len(hits) <= limit else f"\n... {len(hits) - limit} more matches"
        return Result(True, "\n".join(hits[:limit]) + more)

    def _diff(self, path: str = "") -> Result:
        scope = ["--", fs.normalize(path)] if path.strip() else []
        committed = _git(self.repo, ["diff", f"{self.gate.base}..HEAD"] + scope)
        working = _git(self.repo, ["diff"] + scope)
        text = (committed.stdout or "") + (working.stdout or "")
        if not text.strip():
            return Result(True, "no changes yet")
        if len(text) > DIFF_CAP:
            text = text[:DIFF_CAP] + "\n... [diff truncated]"
        return Result(True, text)

    # -- write --------------------------------------------------------------
    def _write_file(self, path: str, content: str) -> Result:
        written = fs.write_text(self.repo, path, content)
        return Result(True, f"wrote {path} ({written} bytes)")

    def _edit_file(self, path: str, find: str, replace: str, expect_count: int = 1) -> Result:
        if not find:
            return Result(False, "'find' is empty; use write_file for a new file")
        original = fs.read_text(self.repo, path)
        found = original.count(find)
        want = int(expect_count)
        if found != want:
            return Result(False, f"'find' occurs {found} time(s) in {path}, expected {want}")
        fs.write_text(self.repo, path, original.replace(find, replace))
        return Result(True, f"edited {path} ({found} replacement(s))")

    # -- execute ------------------------------------------------------------
    def _run_verify(self, step: str = "") -> Result:
        if not self.gate.steps:
            return Result(False, "this repository has no verification gate")
        verdict = self.gate.run_all() if not step.strip() else self.gate.run_one(step.strip())
        return Result(verdict.green, verdict.report())

    def _finish(self, summary: str, pr_title: str, pr_body: str) -> Result:
        # The loop owns `finish`; this only exists so dispatch() is total.
        return Result(True, "finish is handled by the loop")


def commit(repo: str, message: str) -> bool:
    """One commit per accepted mutating turn — the model never runs git itself."""
    add = _git(repo, ["add", "-A"])
    if add.returncode != 0:
        return False
    msg = (message or "clawmart: agent change").strip().splitlines()[0][:100]
    out = _git(repo, ["commit", "-m", msg, "--no-verify"])
    return out.returncode == 0


def commit_count(repo: str, base: str) -> int:
    out = _git(repo, ["rev-list", "--count", f"{base}..HEAD"])
    try:
        return int(out.stdout.strip())
    except (TypeError, ValueError):
        return 0


def changed_paths(repo: str, base: str) -> list:
    """Every path this branch touched. `-z`, because `--name-only` C-quotes
    non-ASCII paths and a quoted path is not the path any check means."""
    out = _git(repo, ["diff", "-z", "--name-only", f"{base}..HEAD"])
    return [p for p in out.stdout.split("\0") if p]


def has_changes(repo: str, base: str) -> bool:
    return bool(changed_paths(repo, base))


def dirty(repo: str) -> bool:
    out = _git(repo, ["status", "--porcelain"])
    return bool(out.stdout.strip())


def summarize_repo(repo: str, limit: int = 300) -> str:
    out = _git(repo, ["ls-files"])
    files = out.stdout.splitlines()
    listing = "\n".join(files[:limit])
    more = "" if len(files) <= limit else f"\n... {len(files) - limit} more files"
    return truncate(f"Repository files ({len(files)} tracked):\n{listing}{more}")
