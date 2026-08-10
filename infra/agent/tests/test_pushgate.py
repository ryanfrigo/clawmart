import os
import subprocess
import tempfile
import unittest

import pushgate

LLM = "sk-or-v1-" + "a" * 40
GH = "ghp_" + "B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6"
BRANCH = "clawmart/box-box_deadbeef"


def check(branch=BRANCH, names=("src/a.ts",), diff="+const a = 1;\n",
          literals=(), contents=None):
    return pushgate.check(branch, list(names), diff, list(literals), contents)


class Refusals(unittest.TestCase):
    def test_ordinary_diff_passes(self):
        self.assertEqual(check(), "")

    def test_only_the_derived_branch_shape_is_pushable(self):
        for branch in ("main", "master", "clawmart/box-../main", "HEAD",
                       "refs/heads/main", "clawmart/box-A", "clawmart/other", ""):
            self.assertNotEqual(check(branch=branch), "", branch)

    def test_workflow_and_manifest_edits_are_refused(self):
        self.assertIn(".github/workflows/", check(names=(".github/workflows/ci.yml",)))
        self.assertIn(".clawmart/", check(names=(".clawmart/verify.json",)))

    def test_oversized_diffs_are_refused(self):
        self.assertIn("files changed", check(names=[f"f{i}" for i in range(201)]))
        self.assertIn("bytes", check(diff="x" * (pushgate.MAX_BYTES + 1)))

    def test_oversized_content_is_refused_even_when_the_diff_is_small(self):
        big = [("src/a.ts", "x" * (pushgate.MAX_BYTES + 1))]
        self.assertIn("bytes", check(diff="", contents=big))

    def test_credential_shaped_bytes_are_refused(self):
        for blob in (f"+const key = '{LLM}';", f"+TOKEN={GH}", "+AKIA" + "Q" * 16,
                     "+github_pat_" + "9" * 40):
            self.assertIn("credential", check(diff=blob), blob)

    def test_credential_shaped_content_is_refused_with_an_empty_diff(self):
        reason = check(diff="", contents=[("src/a.ts", f"const k = '{GH}';")])
        self.assertIn("credential", reason)
        self.assertIn("src/a.ts", reason)
        self.assertNotIn(GH, reason)  # the reason is an event; it carries no secret

    def test_literal_box_secret_is_refused_even_without_a_shape(self):
        secret = "7c1f9a2b8e4d6053a1b2"
        self.assertIn("secrets", check(diff=f"+x = '{secret}'", literals=[secret]))
        self.assertIn("secrets", check(diff="", literals=[secret],
                                       contents=[("a.txt", f"x = '{secret}'")]))

    def test_short_literals_are_ignored_so_common_words_do_not_block(self):
        self.assertEqual(check(diff="+const a = 1;\n", literals=["a", ""]), "")

    def test_unscannable_content_is_a_refusal_not_a_pass(self):
        reason = check(diff="", contents=[("assets/blob.bin", None)])
        self.assertIn("cannot be scanned", reason)


def git(repo, *argv):
    return subprocess.run(["git"] + list(argv), cwd=repo, capture_output=True, text=True)


def make_repo() -> tuple:
    repo = tempfile.mkdtemp()
    with open(os.path.join(repo, "README.md"), "w") as fh:
        fh.write("base\n")
    git(repo, "init", "-q", "-b", "main")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "base")
    return repo, git(repo, "rev-parse", "HEAD").stdout.strip()


def write(repo, rel, content, mode="w"):
    full = os.path.join(repo, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, mode) as fh:
        fh.write(content)


class AgainstARealRepository(unittest.TestCase):
    """collect() is the half of the gate that decides WHAT check() judges."""

    def test_gitattributes_cannot_hide_a_credential_from_the_scan(self):
        # One permitted write of .gitattributes makes git render the entire diff
        # as "Binary files differ" — no bytes — so a diff-only scan saw nothing.
        repo, base = make_repo()
        write(repo, ".gitattributes", "* binary\n")
        write(repo, "src/config.ts", f"export const token = '{GH}';\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "hide")

        names, diff, contents = pushgate.collect(repo, base)
        self.assertIn("Binary files", diff)          # the diff really is blind
        self.assertNotIn(GH, diff)
        self.assertIn("credential", pushgate.check(BRANCH, names, diff, [], contents))

    def test_c_quoted_paths_do_not_evade_the_deny_check(self):
        # `--name-only` prints ".github/workflows/\303\274.yml" (quoted, leading
        # `"`), which no longer startswith the denied prefix.
        repo, base = make_repo()
        write(repo, ".github/workflows/über.yml", "on: push\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "workflow")

        quoted = git(repo, "diff", "--name-only", f"{base}..HEAD").stdout.strip()
        self.assertTrue(quoted.startswith('"'), quoted)   # the bypass, reproduced

        names, diff, contents = pushgate.collect(repo, base)
        self.assertEqual(names, [".github/workflows/über.yml"])
        self.assertIn(".github/workflows/",
                      pushgate.check(BRANCH, names, diff, [], contents))

    def test_a_secret_in_a_quoted_path_is_still_scanned(self):
        repo, base = make_repo()
        write(repo, "notes/ü.txt", f"{LLM}\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "note")
        names, diff, contents = pushgate.collect(repo, base)
        self.assertIn("credential", pushgate.check(BRANCH, names, diff, [], contents))

    def test_undecodable_blob_is_unscannable_and_refused(self):
        repo, base = make_repo()
        write(repo, "assets/blob.bin", "ÿþ\x00\x01", mode="w")
        with open(os.path.join(repo, "assets", "blob.bin"), "wb") as fh:
            fh.write(b"\xff\xfe\x00g\x00h\x00p\x00_")   # UTF-16-ish, not UTF-8
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "blob")
        names, diff, contents = pushgate.collect(repo, base)
        self.assertEqual(contents, [("assets/blob.bin", None)])
        self.assertIn("cannot be scanned", pushgate.check(BRANCH, names, diff, [], contents))

    def test_git_failing_is_a_refusal_not_an_empty_clean_scan(self):
        repo, _ = make_repo()
        with self.assertRaises(pushgate.GitFailed):
            pushgate.collect(repo, "0000000000000000000000000000000000000000")

    def test_an_ordinary_change_still_passes_end_to_end(self):
        repo, base = make_repo()
        write(repo, "src/a.ts", "export const a = 1;\n")
        git(repo, "rm", "-q", "README.md")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "work")
        names, diff, contents = pushgate.collect(repo, base)
        self.assertEqual(sorted(names), ["README.md", "src/a.ts"])
        # A deleted path has no content at HEAD; that is not "unscannable".
        self.assertEqual(contents, [("src/a.ts", "export const a = 1;\n")])
        self.assertEqual(pushgate.check(BRANCH, names, diff, [], contents), "")


if __name__ == "__main__":
    unittest.main()
