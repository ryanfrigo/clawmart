#!/usr/bin/env python3
"""
Path confinement. Every path the model supplies passes through resolve().

This closes the two remote-code-execution paths the v1 runner had, neither of
which needed a shell tool:

  1. `.git/hooks/pre-commit` was a legal write (the whole check was
     `if ".." in path.split("/")`), and the runner ran `git commit` on the very
     next turn — executing model-authored code with the PAT in the environment.
  2. HOME was the parent of the worktree, so a repo-supplied symlink let a write
     land on `.gitconfig`; `core.fsmonitor` there is arbitrary argv on the next
     git invocation.

The rules, applied in order:
  1. no absolute paths, no `..` component, no NUL;
  2. realpath(join(root, rel)) must be root or under root;
  3. resolution must not cross a symlink (realpath(dirname) == dirname);
  4. reads and writes use O_NOFOLLOW and only create parent dirs inside root;
  5. hard-deny prefixes below.

Rule 2 rejects a symlink that leaves the repository, but a symlink whose target
is INSIDE the repository resolves fine — and the deny list below is checked
against the path the model supplied, not the one the kernel would follow. So a
committed `notes.txt -> .git/config` was a legal read. O_NOFOLLOW on the final
component is what closes that: the denied directories become unreachable rather
than merely unnameable.

`.github/workflows/` is denied here as a second, independent control alongside
the bot PAT's missing `workflows` scope (docs/PROVISIONING.md "Residual risk").
`node_modules/` is denied because verify.py resolves gate binaries out of
`node_modules/.bin` — a writable node_modules would be gate tampering.
"""
import errno
import os
import stat

DENY_PREFIXES = (".git", ".clawmart", ".github/workflows", "node_modules")
MAX_READ_BYTES = 100_000
MAX_WRITE_BYTES = 200_000
_SPACE_HEADROOM = 4 * 1024 * 1024  # keep the tmpfs usable for git + the gate


class Denied(Exception):
    """A path the agent may not touch. Always surfaced as a tool error."""


def normalize(rel: str) -> str:
    if not isinstance(rel, str) or not rel.strip():
        raise Denied("empty path")
    if "\x00" in rel:
        raise Denied("NUL byte in path")
    rel = rel.strip()
    if rel.startswith("/") or rel.startswith("~"):
        raise Denied("absolute paths are not allowed; use a repo-relative path")
    parts = [p for p in rel.replace("\\", "/").split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts):
        raise Denied("'..' is not allowed in a path")
    if not parts:
        raise Denied("empty path")
    joined = "/".join(parts)
    for deny in DENY_PREFIXES:
        if joined == deny or joined.startswith(deny + "/"):
            raise Denied(f"'{deny}' is off-limits to the agent")
    return joined


def resolve(root: str, rel: str) -> str:
    """Absolute path inside `root`, or Denied."""
    root = os.path.realpath(root)
    target = os.path.join(root, normalize(rel))
    parent = os.path.dirname(target)
    if os.path.realpath(parent) != parent:
        raise Denied("path resolves through a symlink")
    real = os.path.realpath(target)
    if real != root and not real.startswith(root + os.sep):
        raise Denied("path escapes the repository")
    return target


def read_text(root: str, rel: str) -> str:
    path = resolve(root, rel)
    # O_NOFOLLOW: the final component must be the file itself, never a link to
    # one. O_NONBLOCK so a FIFO left behind by gate-executed code cannot hang
    # the read; the S_ISREG check below then refuses it.
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError as e:
        if e.errno in (errno.ELOOP, errno.EMLINK):
            raise Denied("path resolves through a symlink")
        raise Denied("no such file")
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        os.close(fd)
        raise Denied("not a regular file")
    with os.fdopen(fd, "rb") as fh:
        data = fh.read(MAX_READ_BYTES + 1)
    if len(data) > MAX_READ_BYTES:
        raise Denied(f"file is larger than {MAX_READ_BYTES} bytes; read it in ranges")
    if b"\x00" in data:
        raise Denied("binary file")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        raise Denied("file is not valid UTF-8")


def _ensure_parent(root: str, parent: str) -> None:
    """Create missing dirs inside root only, never through a symlink."""
    root = os.path.realpath(root)
    rel = os.path.relpath(parent, root)
    if rel == ".":
        return
    cur = root
    for part in rel.split(os.sep):
        cur = os.path.join(cur, part)
        if os.path.islink(cur):
            raise Denied("path resolves through a symlink")
        if not os.path.exists(cur):
            os.mkdir(cur, 0o755)
        elif not os.path.isdir(cur):
            raise Denied(f"'{part}' exists and is not a directory")


def write_text(root: str, rel: str, content: str) -> int:
    data = content.encode("utf-8")
    if len(data) > MAX_WRITE_BYTES:
        raise Denied(f"content is larger than {MAX_WRITE_BYTES} bytes")
    path = resolve(root, rel)
    _ensure_parent(root, os.path.dirname(path))
    try:
        st = os.statvfs(os.path.dirname(path))
        if st.f_bavail * st.f_frsize < len(data) + _SPACE_HEADROOM:
            raise Denied("no space left on the box tmpfs")
    except OSError:
        pass
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o644)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)
    return len(data)
