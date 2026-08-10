#!/usr/bin/env python3
"""
Open the pull request. Called by entrypoint.sh phase 3 only.

The token is read from os.environ["GITHUB_TOKEN"] — it is never interpolated
into this file's source, which is how the v1 heredoc did it. The API base comes
from CLAWMART_GITHUB_API so the local rig can point at a fake GitHub without a
second code path.

Draft unless the harness recorded VERIFIED **and** the change left the gate's own
code alone: a PR whose gate was red, absent, never reached, or rewritten by the
change it was meant to check is a draft that says so, and the body always
carries the AI-draft label required by CLAUDE.md's trust rules.
"""
import json
import os
import sys
import urllib.error
import urllib.request

LABEL = (
    "\n\n---\nThis is an **AI-drafted** change from a Clawmart dev box for you to "
    "review. Nothing here was merged automatically, and no claim is made that it "
    "is correct beyond the verification output above."
)

SELF_CERTIFIED = (
    "\n\n> **The gate is not independent evidence for this change.** It edits the "
    "files the verification gate itself runs, so a green gate here only means the "
    "change agrees with the checks the same change wrote. Read these paths first:"
)


def compose(result: dict, box_id: str) -> tuple:
    """(title, body, draft) — pure, so both draft paths are unit-testable."""
    verdict = str(result.get("verdict") or "UNKNOWN")
    touched = [str(p) for p in (result.get("gate_touched_paths") or [])][:20]
    draft = verdict != "VERIFIED" or bool(touched)

    title = str(result.get("pr_title") or f"Clawmart dev box {box_id}")
    if draft:
        if verdict == "VERIFIED":
            reason = "gate files changed"
        elif verdict == "UNVERIFIED":
            reason = "unverified"
        else:
            reason = "gate red"
        title = f"DRAFT ({reason}): {title}"[:140]

    body = str(result.get("pr_body") or "")
    body += f"\n\n**Verdict:** `{verdict}` · {result.get('commits', 0)} commit(s)"
    if verdict == "UNVERIFIED":
        body += (
            "\n\nNo verification gate was available on this repository, so nothing "
            "here has been checked by anything except a human — you."
        )
    if touched:
        body += SELF_CERTIFIED + "\n" + "\n".join(f"- `{p}`" for p in touched)
    report = str(result.get("gate_report") or "")
    if report:
        body += "\n\n<details><summary>Verification output</summary>\n\n```\n" + report[:20000] + "\n```\n</details>"
    body += LABEL
    return title, body, draft


def main() -> int:
    owner_repo = sys.argv[1]
    branch = sys.argv[2]
    base = sys.argv[3]
    box_id = sys.argv[4]
    result = {}
    try:
        with open(sys.argv[5], "r", encoding="utf-8") as fh:
            result = json.load(fh)
    except Exception:
        pass

    title, body, draft = compose(result if isinstance(result, dict) else {}, box_id)

    api = (os.environ.get("CLAWMART_GITHUB_API") or "https://api.github.com").rstrip("/")
    payload = json.dumps({"title": title, "head": branch, "base": base,
                          "body": body, "draft": draft}).encode()
    req = urllib.request.Request(
        f"{api}/repos/{owner_repo}/pulls", data=payload,
        headers={"Authorization": f"Bearer {os.environ.get('GITHUB_TOKEN', '')}",
                 "Accept": "application/vnd.github+json",
                 "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(json.load(r).get("html_url", ""))
        return 0
    except urllib.error.HTTPError as e:
        print("", end="")
        print(f"PR open failed: {e.code}", file=sys.stderr)
    except Exception as e:
        print("", end="")
        print(f"PR open failed: {e}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
