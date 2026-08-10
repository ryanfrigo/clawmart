import json
import os
import tempfile
import unittest

from harness import events

GH = "ghp_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5"
PAT = "github_pat_" + "1" * 40
LLM = "sk-or-v1-" + "f" * 40
AWS = "AKIA" + "Z" * 16
CB = "9f8e7d6c5b4a39281706" * 2


class Scrub(unittest.TestCase):
    def setUp(self):
        self.state = tempfile.mkdtemp()
        events.configure(site_url="", box_id="box_test", secret=CB, state_dir=self.state)

    def test_credential_shapes_are_redacted_without_holding_the_literal(self):
        # The GitHub PAT never enters the harness process at all; the shape
        # patterns are what stop a repo-supplied lookalike reaching the feed.
        for secret in (GH, PAT, LLM, AWS):
            out = events.scrub(f"here is a token: {secret} ok")
            self.assertNotIn(secret, out)
            self.assertIn("[redacted]", out)

    def test_registered_literal_is_redacted(self):
        self.assertNotIn(CB, events.scrub(f"secret={CB}"))

    def test_scrub_leaves_ordinary_text_alone(self):
        self.assertEqual(events.scrub("npm test failed: 3 assertions"),
                         "npm test failed: 3 assertions")

    def test_event_journals_scrubbed_and_capped(self):
        events.event("output", f"leak {LLM} " + "x" * 5000)
        with open(os.path.join(self.state, "journal.jsonl")) as fh:
            rows = [json.loads(line) for line in fh if line.strip()]
        self.assertTrue(rows)
        text = rows[-1]["text"]
        self.assertNotIn(LLM, text)
        self.assertLessEqual(len(text), 2000)

    def test_unknown_kind_is_coerced_to_status(self):
        # convex/http.ts only accepts "status" | "output"; anything else must
        # not reach it as a novel value.
        events.event("explosion", "hello")
        with open(os.path.join(self.state, "journal.jsonl")) as fh:
            rows = [json.loads(line) for line in fh if line.strip()]
        self.assertEqual(rows[-1]["kind"], "status")

    def test_command_audit_records_every_argv(self):
        events.command(["git", "diff", "--name-only"])
        with open(os.path.join(self.state, "journal.jsonl")) as fh:
            rows = [json.loads(line) for line in fh if line.strip()]
        self.assertIn("run: git diff --name-only", rows[-1]["text"])

    def test_feed_failure_is_not_fatal(self):
        events.configure(site_url="http://127.0.0.1:1/convex", box_id="b",
                         secret=CB, state_dir=self.state)
        events.event("status", "still fine")  # must not raise


if __name__ == "__main__":
    unittest.main()
