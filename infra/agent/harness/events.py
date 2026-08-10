#!/usr/bin/env python3
"""
Audit + live-feed events for the box harness.

The wire contract is UNCHANGED from the v1 runner because convex/http.ts
validates it byte-for-byte:

    POST {convexSiteUrl}/box/event
    header  x-clawmart-box-secret: <per-box secret>
    body    {"boxId": ..., "kind": "status"|"output", "text": ...}

Two sinks:
  - the Studio live feed (network; unreachable is never fatal), and
  - {state}/journal.jsonl, appended BEFORE the action it describes, so a run
    that crashes still leaves a complete record of what was attempted.

Every string leaving this process goes through scrub(). Registered literals
cover the secrets this process actually holds; the SHAPE patterns cover the ones
it does not (the GitHub PAT never enters this process at all) and any
credential-looking string a repository might contain.
"""
import json
import os
import re
import sys
import urllib.request

# Credential shapes, redacted even when we do not hold the literal.
_SHAPES = [
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"sk-or-v1-[A-Za-z0-9]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
]
_REDACTED = "[redacted]"

_literals: list[str] = []
_site = ""
_box_id = ""
_secret = ""
_journal_path = ""


def configure(site_url: str = "", box_id: str = "", secret: str = "", state_dir: str = "") -> None:
    """Wire the sinks. Defaults come from the env the box was launched with."""
    global _site, _box_id, _secret, _journal_path
    _site = (site_url or os.environ.get("CONVEX_SITE_URL", "")).strip()
    _box_id = box_id or os.environ.get("BOX_ID", "")
    _secret = secret or os.environ.get("CALLBACK_SECRET", "")
    state = state_dir or os.environ.get("CLAWMART_STATE_DIR", "/work/state")
    try:
        os.makedirs(state, exist_ok=True)
        _journal_path = os.path.join(state, "journal.jsonl")
    except OSError:
        _journal_path = ""
    register_secret(_secret)


def register_secret(value: str) -> None:
    """Redact this exact string from everything that leaves the process."""
    if value and len(value) >= 8 and value not in _literals:
        _literals.append(value)


def scrub(text: str) -> str:
    if not text:
        return text
    for lit in _literals:
        text = text.replace(lit, _REDACTED)
    for pat in _SHAPES:
        text = pat.sub(_REDACTED, text)
    return text


def journal(record: dict) -> None:
    """Append one audit record. Best effort — never raises."""
    if not _journal_path:
        return
    try:
        safe = json.loads(scrub(json.dumps(record, default=str)))
        with open(_journal_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(safe) + "\n")
    except Exception:  # a full tmpfs must not kill the run
        pass


def event(kind: str, text: str) -> None:
    """Emit to stdout (CloudWatch), the journal, and the Studio feed."""
    kind = "output" if kind == "output" else "status"
    text = scrub(str(text))[:2000]
    print(f"[{kind}] {text}", flush=True)
    journal({"kind": kind, "text": text})
    if not _site:
        return
    body = json.dumps({"boxId": _box_id, "kind": kind, "text": text}).encode()
    req = urllib.request.Request(
        _site.rstrip("/") + "/box/event",
        data=body,
        headers={"content-type": "application/json", "x-clawmart-box-secret": _secret},
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:  # the journal stays complete even when the feed is down
        print("event post failed:", e, file=sys.stderr)


def command(argv: list) -> None:
    """Audit-log every command this harness executes. Nothing runs unlogged."""
    event("status", "run: " + " ".join(str(a) for a in argv))
