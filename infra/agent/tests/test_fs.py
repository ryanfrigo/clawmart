import os
import tempfile
import unittest

from harness import fs


class Confinement(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.root = os.path.join(self.dir, "repo")
        os.makedirs(os.path.join(self.root, "src"))
        with open(os.path.join(self.root, "src", "a.txt"), "w") as fh:
            fh.write("hello\nworld\n")

    def denied(self, rel, content="x"):
        with self.assertRaises(fs.Denied, msg=f"{rel} should be denied"):
            fs.write_text(self.root, rel, content)

    def test_the_v1_rce_git_hooks_is_denied(self):
        # The whole v1 check was `if ".." in path.split("/")`, so this was a
        # legal write and `git commit` executed it on the very next turn.
        self.denied(".git/hooks/pre-commit")
        self.assertFalse(os.path.exists(os.path.join(self.root, ".git", "hooks", "pre-commit")))

    def test_traversal_and_absolute_paths(self):
        for rel in ("../../etc/x", "..", "a/../../b", "/etc/passwd", "~/.gitconfig"):
            self.denied(rel)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "etc")))

    def test_symlink_escape_is_denied_and_nothing_lands(self):
        outside = os.path.join(self.dir, "outside")
        os.makedirs(outside)
        os.symlink(outside, os.path.join(self.root, "notes"))
        self.denied("notes/pwned")
        self.denied("notes")
        self.assertEqual(os.listdir(outside), [])

    def test_symlinked_file_is_not_followed_on_write(self):
        target = os.path.join(self.dir, "target.txt")
        with open(target, "w") as fh:
            fh.write("original")
        os.symlink(target, os.path.join(self.root, "link.txt"))
        self.denied("link.txt", "overwritten")
        with open(target) as fh:
            self.assertEqual(fh.read(), "original")

    def test_symlinked_file_is_not_followed_on_read(self):
        # The escape check only rejects links that leave the repo, and every
        # denied directory is INSIDE it — so this link used to be a legal read
        # of a hard-denied path.
        os.makedirs(os.path.join(self.root, ".git"), exist_ok=True)
        with open(os.path.join(self.root, ".git", "config"), "w") as fh:
            fh.write("[core]\n  secretish = yes\n")
        os.symlink(os.path.join(self.root, ".git", "config"),
                   os.path.join(self.root, "notes.txt"))
        with self.assertRaises(fs.Denied):
            fs.read_text(self.root, "notes.txt")

    def test_directories_are_not_readable_as_files(self):
        with self.assertRaises(fs.Denied):
            fs.read_text(self.root, "src")

    def test_hard_deny_prefixes(self):
        for rel in (".github/workflows/evil.yml", ".clawmart/verify.json",
                    "node_modules/.bin/tsc", ".git/config"):
            self.denied(rel)

    def test_gitignore_is_not_caught_by_the_dotgit_rule(self):
        fs.write_text(self.root, ".gitignore", "node_modules/\n")
        self.assertTrue(os.path.isfile(os.path.join(self.root, ".gitignore")))

    def test_normal_read_write_round_trip(self):
        fs.write_text(self.root, "src/b/c.txt", "data")
        self.assertEqual(fs.read_text(self.root, "src/b/c.txt"), "data")
        self.assertEqual(fs.read_text(self.root, "src/a.txt"), "hello\nworld\n")

    def test_binary_and_oversize_are_errors_not_crashes(self):
        with open(os.path.join(self.root, "bin.dat"), "wb") as fh:
            fh.write(b"\x00\x01\x02")
        with self.assertRaises(fs.Denied):
            fs.read_text(self.root, "bin.dat")
        with self.assertRaises(fs.Denied):
            fs.write_text(self.root, "big.txt", "x" * (fs.MAX_WRITE_BYTES + 1))

    def test_empty_and_nul_paths(self):
        for rel in ("", "   ", "a\x00b"):
            self.denied(rel)


if __name__ == "__main__":
    unittest.main()
