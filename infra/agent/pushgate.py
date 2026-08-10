#!/usr/bin/env python3
"""
The push gate — an egress filter on the one channel that leaves the box.

Called by entrypoint.sh phase 3, BEFORE `git push`. It holds no credential and
performs no network call: it reads what is about to leave and either approves it
or refuses with a reason. It is a separate file from harness/ on purpose — the
harness (which the model's output influences) contains no push, no remote, and
no credential, and this filter contains no model output.

Refusals (any one is fatal, exit 1):
  1. the branch name is not the literal derived `clawmart/box-<id>` shape
  2. a changed path is under .github/workflows/ or .clawmart/
  3. more than 200 changed files, or more than 2 MB of diff + content
  4. the content of a changed file — or the diff — matches a credential shape,
     or one of the literal secrets passed on stdin (stdin, not argv or env, so
     nothing lands in /proc)
  5. a changed file cannot be read as UTF-8 text, so it cannot be scanned at all

Two things this file deliberately does NOT trust:

  * `git diff` RENDERING. Git prints "Binary files ... differ" — no bytes at all
    — for anything it classifies as binary, and one permitted write of
    `.gitattributes` (`* binary`) makes that the whole diff. Scanning the
    rendering was therefore a one-file bypass of the credential scan. The scan
    reads the actual blob behind every changed path instead, and a blob it
    cannot decode is a refusal, not a pass.
  * `--name-only` OUTPUT. Git C-quotes non-ASCII paths ("a/\\303\\274.yml")
    unless core.quotePath is off, so a quoted path slipped past the deny-prefix
    check. Every path here comes from `-z` plumbing, which is never quoted.

Extra secret literals: one per line on stdin. Blank lines ignored.
"""
import argparse
import os
import re
import subprocess
import sys

BRANCH_RE = re.compile(r"^clawmart/box-[a-z0-9_]+$")
DENY_PATHS = (".github/workflows/", ".clawmart/")
MAX_FILES = 200
MAX_BYTES = 2 * 1024 * 1024
SHAPES = [
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"sk-or-v1-[A-Za-z0-9]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
]


def label(path: str) -> str:
    """A repository path is untrusted bytes; it ends up in an event. One line."""
    return " ".join(str(path).split())[:120]


def check(branch: str, names: list, diff: str, literals: list, contents=None) -> str:
    """'' when the push may proceed, otherwise the refusal reason.

    `contents` is [(path, text-or-None)] for every changed path that is still a
    file at HEAD — the bytes that actually leave. None means the blob could not
    be read as scannable UTF-8 text, which is a refusal: an unreadable file is
    suspicious, not clean.
    """
    if not BRANCH_RE.match(branch or ""):
        return f"refusing to push {branch!r}: not a clawmart/box-* branch"
    for path in names:
        for deny in DENY_PATHS:
            if path.startswith(deny):
                return f"refusing to push: the diff touches {deny} ({label(path)})"
    if len(names) > MAX_FILES:
        return f"refusing to push: {len(names)} files changed (limit {MAX_FILES})"

    blobs = list(contents or [])
    size = len(diff.encode("utf-8", "replace"))
    size += sum(len(text.encode("utf-8", "replace")) for _, text in blobs if text)
    if size > MAX_BYTES:
        return f"refusing to push: {size} bytes of diff and content (limit {MAX_BYTES})"

    for path, text in blobs:
        if text is None:
            return (f"refusing to push: {label(path)} cannot be scanned for secrets "
                    "(not UTF-8 text, unreadable, or over the size cap)")

    for where, hay in [("the diff", diff)] + [(label(p), t) for p, t in blobs]:
        for pat in SHAPES:
            if pat.search(hay):
                return f"refusing to push: {where} contains something shaped like a credential"
        for lit in literals:
            if lit and len(lit) >= 8 and lit in hay:
                return f"refusing to push: {where} contains one of this box's secrets"
    return ""


def git_env() -> dict:
    """Ignore user and system git config.

    By the time this runs the verification gate has executed repository code as
    this same uid, so $HOME/.gitconfig may have been written by it — and config
    can steer git's output (core.quotePath) or run commands (core.fsmonitor).
    """
    env = dict(os.environ)
    env["GIT_CONFIG_GLOBAL"] = os.devnull
    env["GIT_CONFIG_SYSTEM"] = os.devnull
    return env


def git(repo: str, argv: list, binary: bool = False):
    cmd = ["git", "-c", "core.hooksPath=" + os.devnull] + argv
    kwargs = {} if binary else {"text": True, "errors": "replace"}
    return subprocess.run(cmd, cwd=repo, env=git_env(), capture_output=True, **kwargs)


class GitFailed(RuntimeError):
    """git could not tell us what is about to leave. That is a refusal."""


def head_blobs(repo: str) -> dict:
    """path -> object id for every regular file at HEAD (`-z`, never quoted).

    Non-blob entries (submodule gitlinks) are absent on purpose: they carry no
    content that could leave the box in this push.
    """
    out = git(repo, ["ls-tree", "-r", "-z", "HEAD"])
    if out.returncode != 0:
        raise GitFailed("could not list the files at HEAD")
    tree = {}
    for entry in out.stdout.split("\0"):
        meta, _, path = entry.partition("\t")
        parts = meta.split()
        if path and len(parts) >= 3 and parts[1] == "blob":
            tree[path] = parts[2]
    return tree


def blob_text(repo: str, oid: str, budget: int):
    """The blob's content as text, or None when it cannot be scanned."""
    size = git(repo, ["cat-file", "-s", oid]).stdout.strip()
    if not size.isdigit() or int(size) > budget:
        return None
    out = git(repo, ["cat-file", "blob", oid], binary=True)
    if out.returncode != 0:
        return None
    try:
        return out.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return None


def collect(repo: str, base: str) -> tuple:
    """(names, diff, contents) for base..HEAD — the input check() judges.

    Raises GitFailed rather than returning an empty, innocent-looking scan when
    git cannot answer: "we could not read it" must never read as "it was clean".
    """
    listing = git(repo, ["diff", "-z", "--name-only", f"{base}..HEAD"])
    rendered = git(repo, ["diff", f"{base}..HEAD"])
    if listing.returncode != 0 or rendered.returncode != 0:
        raise GitFailed(f"could not read the diff for {base}..HEAD")
    names = [n for n in listing.stdout.split("\0") if n]
    diff = rendered.stdout
    tree = head_blobs(repo)
    contents = []
    remaining = MAX_BYTES
    # One past the file cap is enough: check() refuses beyond it anyway.
    for path in names[: MAX_FILES + 1]:
        oid = tree.get(path)
        if oid is None:
            continue  # deleted by this branch, or a gitlink: no content leaves
        text = blob_text(repo, oid, remaining)
        contents.append((path, text))
        if text is None:
            break  # unscannable is already a refusal; stop reading blobs
        remaining -= len(text.encode("utf-8", "replace"))
    return names, diff, contents


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--branch", required=True)
    ap.add_argument("--repo", default=".")
    args = ap.parse_args()

    literals = [line.strip() for line in sys.stdin.read().splitlines()] if not sys.stdin.isatty() else []

    try:
        names, diff, contents = collect(args.repo, args.base)
    except GitFailed as e:
        print(f"refusing to push: {e}")
        return 1
    reason = check(args.branch, names, diff, literals, contents)
    if reason:
        print(reason)
        return 1
    print(f"push gate: ok ({len(names)} file(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
