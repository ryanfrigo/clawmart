import json
import os
import subprocess
import sys
import tempfile
import unittest

from harness import events, verify


def git(repo, *argv):
    return subprocess.run(["git"] + list(argv), cwd=repo, capture_output=True, text=True)


def make_repo(files: dict) -> str:
    repo = tempfile.mkdtemp()
    for path, content in files.items():
        full = os.path.join(repo, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as fh:
            fh.write(content)
    git(repo, "init", "-q", "-b", "main")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "base")
    return repo


class ScriptValidation(unittest.TestCase):
    def test_metacharacters_are_refused_not_shelled_out(self):
        for script in ("rm -rf / ; echo", "a && b", "echo `id`", "cat < /etc/passwd",
                       "x > y", "a | b", "echo $SECRET", "a\nb"):
            argv, why = verify.Gate._script_argv(script)
            self.assertIsNone(argv, script)
            self.assertTrue(why)

    def test_plain_scripts_split(self):
        argv, why = verify.Gate._script_argv("tsc --noEmit")
        self.assertEqual(argv, ["tsc", "--noEmit"])
        self.assertEqual(why, "")


class SelfCertification(unittest.TestCase):
    """Pinning fixes the command; it does not fix the code the command runs."""

    def setUp(self):
        events.configure(state_dir=tempfile.mkdtemp())

    def test_the_gates_own_files_are_recognised(self):
        repo = make_repo({"package.json": json.dumps({"scripts": {"test": "node tests/run.js"}}),
                          "tests/run.js": "// t\n"})
        base = git(repo, "rev-parse", "HEAD").stdout.strip()
        gate = verify.Gate(repo, base)
        self.assertIn("tests/run.js", gate.consumed_paths())
        # Inverting add() and gutting its test is a green gate and a worthless one.
        self.assertEqual(
            verify.gate_paths(["src/math.js", "tests/run.js"], gate.consumed_paths()),
            ["tests/run.js"],
        )

    def test_conventional_test_paths_count_even_when_the_argv_misses_them(self):
        hits = verify.gate_paths(
            ["src/a.ts", "src/a.test.ts", "tests/helpers/db.py", "spec/x.rb",
             "__tests__/a.js", "test_fs.py", "docs/latest.md", "src/specialist.ts"],
            [],
        )
        self.assertEqual(
            hits, ["src/a.test.ts", "tests/helpers/db.py", "spec/x.rb",
                   "__tests__/a.js", "test_fs.py"])

    def test_a_change_that_leaves_the_gate_alone_is_not_flagged(self):
        self.assertEqual(verify.gate_paths(["src/math.js", "README.md"], ["tests/run.js"]), [])


class Pinning(unittest.TestCase):
    def setUp(self):
        events.configure(state_dir=tempfile.mkdtemp())

    def test_gate_is_pinned_to_the_base_commit(self):
        repo = make_repo({
            "package.json": json.dumps({"scripts": {"test": "python3 tests.py"}}),
            "tests.py": "print('ok')\n",
        })
        base = git(repo, "rev-parse", "HEAD").stdout.strip()

        # The model rewrites the gate in the worktree, exactly as a hostile or
        # lazy turn would.
        with open(os.path.join(repo, "package.json"), "w") as fh:
            json.dump({"scripts": {"test": "exit 0"}}, fh)
        git(repo, "commit", "-qam", "tamper")

        gate = verify.Gate(repo, base)
        gate.prune_unrunnable()  # no node_modules here, so the tsc fallback goes
        self.assertEqual([s["argv"] for s in gate.steps], [["python3", "tests.py"]])
        self.assertEqual(gate.source, "package.json@base scripts")

    def test_manifest_from_base_wins_over_package_json(self):
        repo = make_repo({
            ".clawmart/verify.json": json.dumps(
                {"steps": [{"name": "unit", "argv": ["python3", "-c", "print(1)"], "timeout": 30}]}),
            "package.json": json.dumps({"scripts": {"test": "python3 nope.py"}}),
        })
        base = git(repo, "rev-parse", "HEAD").stdout.strip()
        gate = verify.Gate(repo, base)
        self.assertEqual(gate.step_names(), ["unit"])

    def test_build_is_never_a_default_step(self):
        repo = make_repo({"package.json": json.dumps(
            {"scripts": {"build": "next build", "test": "python3 -c pass"}})})
        base = git(repo, "rev-parse", "HEAD").stdout.strip()
        gate = verify.Gate(repo, base)
        self.assertNotIn("build", gate.step_names())

    def test_red_step_reports_the_real_output(self):
        repo = make_repo({"package.json": json.dumps({"scripts": {"test": "python3 t.py"}}),
                          "t.py": "import sys; print('BOOM'); sys.exit(3)\n"})
        base = git(repo, "rev-parse", "HEAD").stdout.strip()
        gate = verify.Gate(repo, base)
        gate.prune_unrunnable()
        v = gate.run_all()
        self.assertFalse(v.green)
        self.assertIn("BOOM", v.report())
        self.assertIn("exit 3", v.report())

    def test_hung_step_is_killed_by_process_group(self):
        repo = make_repo({".clawmart/verify.json": json.dumps({"steps": [
            {"name": "hang", "argv": [sys.executable, "-c",
                                      "import subprocess,time;subprocess.Popen(['sleep','999']);time.sleep(999)"],
             "timeout": 5}]})})
        base = git(repo, "rev-parse", "HEAD").stdout.strip()
        gate = verify.Gate(repo, base)
        v = gate.run_all()
        self.assertFalse(v.green)
        self.assertIn("killed after", v.report())

    def test_env_carries_no_secret(self):
        os.environ["GITHUB_TOKEN"] = "ghp_should_never_be_visible_00000000"
        os.environ["LLM_API_KEY"] = "sk-or-v1-should-never-be-visible-000000"
        os.environ["CALLBACK_SECRET"] = "cb-should-never-be-visible"
        try:
            env = verify.safe_env()
            self.assertNotIn("GITHUB_TOKEN", env)
            self.assertNotIn("LLM_API_KEY", env)
            self.assertNotIn("CALLBACK_SECRET", env)
            self.assertEqual(env["CI"], "1")
        finally:
            for k in ("GITHUB_TOKEN", "LLM_API_KEY", "CALLBACK_SECRET"):
                os.environ.pop(k, None)

    def test_report_truncation_keeps_head_and_tail(self):
        text = "\n".join(f"line{i}" for i in range(1000))
        out = verify.truncate(text)
        self.assertIn("line0", out)
        self.assertIn("line999", out)
        self.assertIn("lines omitted", out)
        self.assertLessEqual(len(out), verify.REPORT_CAP + 40)

    def test_ansi_is_stripped(self):
        self.assertEqual(verify.truncate("\x1b[31mred\x1b[0m"), "red")


if __name__ == "__main__":
    unittest.main()
