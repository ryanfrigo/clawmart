import os
import subprocess
import tempfile
import unittest

from harness import events, protocol, tools


def git(repo, *argv):
    return subprocess.run(["git"] + list(argv), cwd=repo, capture_output=True, text=True)


def make_repo() -> tuple:
    repo = tempfile.mkdtemp()
    with open(os.path.join(repo, "a.txt"), "w") as fh:
        fh.write("base\n")
    git(repo, "init", "-q", "-b", "main")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "base")
    return repo, git(repo, "rev-parse", "HEAD").stdout.strip()


class Dispatch(unittest.TestCase):
    def setUp(self):
        events.configure(state_dir=tempfile.mkdtemp())
        self.repo, self.base = make_repo()
        self.kit = tools.Tools(self.repo, None)

    def test_tool_errors_are_feedback_not_crashes(self):
        call = protocol.Call("read_file", {"path": "nope.txt"}, "")
        res = self.kit.dispatch(call)
        self.assertFalse(res.ok)
        self.assertIn("refused", res.result)

    def test_the_wall_clock_alarm_is_never_swallowed(self):
        # A blanket `except Exception` also catches the SIGALRM TimeoutError —
        # and because the alarm fires once, eating it left the run with no wall
        # clock at all.
        class Boom(tools.Tools):
            def _list_files(self, prefix="", limit=300):
                raise TimeoutError("wall clock")

        call = protocol.Call("list_files", {"prefix": "", "limit": 300}, "")
        with self.assertRaises(TimeoutError):
            Boom(self.repo, None).dispatch(call)


class ChangedPaths(unittest.TestCase):
    def setUp(self):
        events.configure(state_dir=tempfile.mkdtemp())

    def test_non_ascii_paths_are_not_c_quoted(self):
        repo, base = make_repo()
        os.makedirs(os.path.join(repo, "tests"), exist_ok=True)
        with open(os.path.join(repo, "tests", "ünï.js"), "w") as fh:
            fh.write("// t\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "work")

        self.assertEqual(tools.changed_paths(repo, base), ["tests/ünï.js"])
        self.assertTrue(tools.has_changes(repo, base))

    def test_no_changes_reads_as_no_changes(self):
        repo, base = make_repo()
        self.assertEqual(tools.changed_paths(repo, base), [])
        self.assertFalse(tools.has_changes(repo, base))

    def test_commit_does_not_run_repository_hooks(self):
        # The gate executes repository code as this uid, so .git/hooks may be
        # attacker-written by the time the harness commits.
        repo, _ = make_repo()
        hooks = os.path.join(repo, ".git", "hooks")
        os.makedirs(hooks, exist_ok=True)
        marker = os.path.join(repo, "HOOK_RAN")
        for name in ("pre-commit", "post-commit"):
            path = os.path.join(hooks, name)
            with open(path, "w") as fh:
                fh.write(f"#!/bin/sh\ntouch {marker}\n")
            os.chmod(path, 0o755)
        with open(os.path.join(repo, "a.txt"), "a") as fh:
            fh.write("more\n")

        self.assertTrue(tools.commit(repo, "clawmart: change"))
        self.assertFalse(os.path.exists(marker))


if __name__ == "__main__":
    unittest.main()
