#!/usr/bin/env python3
"""
The gate: the ONLY path by which anything executes at the model's request.

Pinned from the base commit. Every command string is read with
`git show <base>:<file>` once, at boot, before the model sees anything — the
working tree never defines what runs. Rewriting package.json's "test" to
"exit 0" therefore changes nothing, and because nothing goes through `npm run`
at all, neither does rewriting any other script.

Sources, in order:
  1. <base>:.clawmart/verify.json  -> {"steps":[{"name","argv":[...],"timeout"}]}
  2. <base>:package.json           -> scripts typecheck | lint | test
                                      (build is EXCLUDED: `next build` on a
                                      t4g.small with --memory 1500m is not a
                                      gate, it is the whole wall clock)
  3. install: ["npm","ci","--ignore-scripts"] iff <base>:package-lock.json exists

A script string is accepted only if it contains no  & | ; $ ` > <  or newline;
then shlex.split, then argv[0] is resolved against node_modules/.bin and PATH.
A step that fails any of those checks is DROPPED with a logged reason — fail
closed and legible, never "run it through a shell just this once".

Execution: subprocess with shell=False, an env ALLOWLIST that contains no
LLM_API_KEY / GITHUB_TOKEN / CALLBACK_SECRET, and start_new_session=True so a
hung step is killed by process group rather than leaking orphans.

What pinning does NOT give you: the command is pinned, the CODE it runs is not.
The agent may rewrite the test files the gate executes, and then a green gate
only proves the change agrees with itself. Denying test edits is the wrong fix —
fixing a bug legitimately means fixing its test — so gate_paths() identifies the
overlap instead and the pull request is downgraded to a draft that says so.
"""
import json
import os
import re
import shlex
import shutil
import signal
import subprocess
import time

from . import events

FORBIDDEN_CHARS = set("&|;$`><\n\r")
SCRIPT_NAMES = ("typecheck", "lint", "test")
DEFAULT_TIMEOUT = 600
INSTALL_TIMEOUT = 900
ENV_KEEP = ("PATH", "HOME", "TMPDIR", "LANG", "NODE_ENV", "PORT")
_ANSI = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]")
HEAD_LINES = 40
TAIL_LINES = 120
REPORT_CAP = 6000

# Directory and file names that conventionally hold the code a gate executes.
TEST_DIRS = {"test", "tests", "__tests__", "spec", "specs", "e2e"}
_TEST_FILE = re.compile(r"(^|[._-])(tests?|specs?)([._-]|$)", re.IGNORECASE)


def gate_paths(changed: list, consumed: list) -> list:
    """Which of `changed` the gate itself runs or reads.

    Deliberately over-inclusive: a false positive costs one draft label, a false
    negative ships a change whose only evidence is a test the same change wrote.
    """
    hits = []
    for path in changed:
        parts = str(path).split("/")
        if any(seg.lower() in TEST_DIRS for seg in parts[:-1]) or _TEST_FILE.search(parts[-1]):
            hits.append(path)
            continue
        for consumer in consumed:
            if path == consumer or path.startswith(consumer.rstrip("/") + "/"):
                hits.append(path)
                break
    return hits


def safe_env() -> dict:
    """The environment every subprocess in this harness gets. No secrets, ever."""
    env = {k: os.environ[k] for k in ENV_KEEP if k in os.environ}
    env.setdefault("PATH", "/usr/local/bin:/usr/bin:/bin")
    env.setdefault("HOME", "/work/home")
    env["CI"] = "1"
    return env


def truncate(text: str) -> str:
    text = _ANSI.sub("", text or "")
    lines = text.splitlines()
    if len(lines) > HEAD_LINES + TAIL_LINES:
        skipped = len(lines) - HEAD_LINES - TAIL_LINES
        lines = (
            lines[:HEAD_LINES]
            + [f"... [{skipped} lines omitted] ..."]
            + lines[-TAIL_LINES:]
        )
    out = "\n".join(lines)
    return out if len(out) <= REPORT_CAP else out[:REPORT_CAP] + "\n... [truncated]"


class StepResult:
    def __init__(self, name: str, code: int, output: str, seconds: float):
        self.name = name
        self.code = code
        self.output = output
        self.seconds = seconds

    @property
    def ok(self) -> bool:
        return self.code == 0


class Verdict:
    def __init__(self, results: list, note: str = ""):
        self.results = results
        self.note = note

    @property
    def green(self) -> bool:
        return bool(self.results) and all(r.ok for r in self.results)

    def report(self) -> str:
        if not self.results:
            return self.note or "no verification steps were available"
        lines = [
            ("PASS" if r.ok else f"FAIL(exit {r.code})") + f" {r.name} [{r.seconds:.0f}s]"
            for r in self.results
        ]
        head = "gate: " + ("green" if self.green else "RED") + "\n" + "\n".join(lines)
        for r in self.results:
            if not r.ok:
                head += f"\n\n--- {r.name} output ---\n{r.output}"
        return truncate(head)


class Gate:
    """Resolve once from base, then run. `steps` is fixed for the whole run."""

    def __init__(self, repo: str, base: str, remaining_seconds=None):
        self.repo = repo
        self.base = base
        self.remaining = remaining_seconds or (lambda: float(DEFAULT_TIMEOUT))
        self.install = None
        self.steps: list = []
        self.dropped: list = []
        self.source = "none"
        self._resolve()

    # -- resolution ---------------------------------------------------------
    def _show(self, path: str):
        events.command(["git", "show", f"{self.base}:{path}"])
        try:
            out = subprocess.run(
                ["git", "show", f"{self.base}:{path}"],
                cwd=self.repo, env=safe_env(), capture_output=True, text=True, timeout=30,
            )
        except Exception:
            return None
        return out.stdout if out.returncode == 0 else None

    def _resolve(self) -> None:
        manifest = self._show(".clawmart/verify.json")
        if manifest is not None:
            self.source = ".clawmart/verify.json@base"
            try:
                data = json.loads(manifest)
                for raw in data.get("steps", [])[:10]:
                    name = str(raw.get("name", "step"))[:40]
                    argv = raw.get("argv")
                    if not isinstance(argv, list) or not argv or not all(
                        isinstance(a, str) and a for a in argv
                    ):
                        self.dropped.append(f"{name}: argv must be a non-empty list of strings")
                        continue
                    timeout = raw.get("timeout", DEFAULT_TIMEOUT)
                    timeout = int(timeout) if isinstance(timeout, int) else DEFAULT_TIMEOUT
                    self.steps.append({"name": name, "argv": argv, "timeout": timeout})
            except Exception as e:
                self.dropped.append(f".clawmart/verify.json: unreadable ({e})")
        else:
            pkg = self._show("package.json")
            if pkg is not None:
                self.source = "package.json@base scripts"
                try:
                    scripts = (json.loads(pkg) or {}).get("scripts") or {}
                except Exception:
                    scripts = {}
                for name in SCRIPT_NAMES:
                    script = scripts.get(name)
                    if isinstance(script, str) and script.strip():
                        argv, why = self._script_argv(script)
                        if argv:
                            self.steps.append(
                                {"name": name, "argv": argv, "timeout": DEFAULT_TIMEOUT}
                            )
                        else:
                            self.dropped.append(f"{name}: {why}")
                    elif name == "typecheck":
                        # Fallback when no typecheck script exists. The path form
                        # is deliberate: it binds to the repo's OWN tsc after
                        # install, never to whatever happens to be on PATH.
                        # prune_unrunnable() drops it if that binary is absent.
                        self.steps.append(
                            {"name": "typecheck",
                             "argv": ["node_modules/.bin/tsc", "--noEmit"],
                             "timeout": DEFAULT_TIMEOUT}
                        )
        if self._show("package-lock.json") is not None:
            self.install = {
                "name": "install",
                "argv": ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
                "timeout": INSTALL_TIMEOUT,
            }

    @staticmethod
    def _script_argv(script: str):
        bad = sorted(set(script) & FORBIDDEN_CHARS)
        if bad:
            return None, f"shell metacharacter(s) {''.join(bad)!r} in the script"
        try:
            parts = shlex.split(script)
        except ValueError as e:
            return None, f"unparsable script ({e})"
        return (parts, "") if parts else (None, "empty script")

    def _bind(self, argv: list):
        """argv[0] -> a concrete executable. node_modules/.bin first, then PATH."""
        exe = argv[0]
        if "/" in exe:
            cand = exe if os.path.isabs(exe) else os.path.join(self.repo, exe)
            if os.path.isfile(cand) and os.access(cand, os.X_OK):
                return [cand] + argv[1:], ""
            return None, f"{exe} is not an executable file"
        local = os.path.join(self.repo, "node_modules", ".bin", exe)
        if os.path.isfile(local) and os.access(local, os.X_OK):
            return [local] + argv[1:], ""
        found = shutil.which(exe, path=safe_env()["PATH"])
        if found:
            return [found] + argv[1:], ""
        return None, f"{exe} not found in node_modules/.bin or PATH"

    def describe(self) -> str:
        if not self.steps:
            return (
                "NO verification gate is available on this repository "
                f"({self.source}). Every pull request from this run will be marked "
                "a draft and say so."
            )
        lines = [f"resolved from {self.source} (pinned at the base commit):"]
        if self.install:
            lines.append("  install: " + " ".join(self.install["argv"]))
        for s in self.steps:
            lines.append(f"  {s['name']}: " + " ".join(s["argv"]))
        lines.append(
            "Call run_verify to run one step by NAME (never a command). `finish` "
            "runs all of them."
        )
        return "\n".join(lines)

    # -- execution ----------------------------------------------------------
    def _run(self, name: str, argv: list, timeout: int) -> StepResult:
        bound, why = self._bind(argv)
        if not bound:
            return StepResult(name, 127, f"cannot run '{argv[0]}': {why}", 0.0)
        timeout = max(5, min(int(timeout), int(self.remaining())))
        events.command(bound)
        started = time.monotonic()
        try:
            proc = subprocess.Popen(
                bound, cwd=self.repo, env=safe_env(), stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, text=True, errors="replace",
                start_new_session=True,
            )
        except OSError as e:
            return StepResult(name, 127, f"cannot run '{argv[0]}': {e}", 0.0)
        try:
            out = proc.communicate(timeout=timeout)[0]
            code = proc.returncode
        except subprocess.TimeoutExpired:
            self._kill_group(proc)
            out = (proc.communicate()[0] or "") + f"\n[killed after {timeout}s]"
            code = 124
        return StepResult(name, code, truncate(out), time.monotonic() - started)

    @staticmethod
    def _kill_group(proc) -> None:
        """SIGTERM the group, 10s grace, then SIGKILL. No orphaned children."""
        for sig, grace in ((signal.SIGTERM, 10.0), (signal.SIGKILL, 5.0)):
            try:
                os.killpg(os.getpgid(proc.pid), sig)
            except (ProcessLookupError, PermissionError, OSError):
                return
            deadline = time.monotonic() + grace
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    return
                time.sleep(0.2)

    def run_install(self) -> StepResult | None:
        if not self.install:
            return None
        return self._run(self.install["name"], self.install["argv"], self.install["timeout"])

    def prune_unrunnable(self) -> None:
        """After install, drop steps whose binary still does not exist."""
        keep = []
        for s in self.steps:
            bound, why = self._bind(s["argv"])
            if bound:
                keep.append(s)
            else:
                self.dropped.append(f"{s['name']}: {why}")
        self.steps = keep

    def step_names(self) -> list:
        return [s["name"] for s in self.steps]

    def consumed_paths(self) -> list:
        """Repo-relative paths the resolved gate commands name (`node tests/run.js`
        consumes `tests/run.js`). Flags and bare binary names are not paths."""
        out = []
        for step in self.steps:
            for token in step["argv"]:
                token = token.strip()
                if token.startswith("-") or token.startswith("/"):
                    continue
                if "/" in token or "." in token:
                    out.append(token.lstrip("./"))
        return out

    def run_one(self, name: str) -> Verdict:
        for s in self.steps:
            if s["name"] == name:
                return Verdict([self._run(s["name"], s["argv"], s["timeout"])])
        return Verdict([], note=f"no step named {name!r}; available: {', '.join(self.step_names())}")

    def run_all(self) -> Verdict:
        if not self.steps:
            return Verdict([], note="no verification steps were available on this repository")
        results = []
        for s in self.steps:
            r = self._run(s["name"], s["argv"], s["timeout"])
            results.append(r)
            if not r.ok:
                break  # first red is the whole answer; do not burn the clock
        return Verdict(results)
