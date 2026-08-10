import unittest

import openpr

VERIFIED = {"verdict": "VERIFIED", "pr_title": "Add multiply()", "pr_body": "Adds it.",
            "commits": 2, "gate_report": "gate: green"}


class Draft(unittest.TestCase):
    def test_a_clean_verified_run_opens_a_real_pull_request(self):
        title, body, draft = openpr.compose(VERIFIED, "box_x")
        self.assertFalse(draft)
        self.assertEqual(title, "Add multiply()")
        self.assertNotIn("not independent evidence", body)
        self.assertIn("AI-drafted", body)

    def test_verified_is_downgraded_when_the_change_edits_the_gate(self):
        result = dict(VERIFIED, gate_touched_paths=["tests/run.js"])
        title, body, draft = openpr.compose(result, "box_x")
        self.assertTrue(draft)
        self.assertIn("DRAFT (gate files changed)", title)
        # The reason has to be legible in the PR itself, not only in a flag.
        self.assertIn("not independent evidence", body)
        self.assertIn("`tests/run.js`", body)

    def test_a_red_gate_is_still_a_draft_that_says_why(self):
        title, _, draft = openpr.compose(dict(VERIFIED, verdict="STALLED"), "box_x")
        self.assertTrue(draft)
        self.assertIn("DRAFT (gate red)", title)

    def test_an_ungated_repository_says_so(self):
        title, body, draft = openpr.compose(dict(VERIFIED, verdict="UNVERIFIED"), "box_x")
        self.assertTrue(draft)
        self.assertIn("DRAFT (unverified)", title)
        self.assertIn("No verification gate was available", body)

    def test_missing_fields_do_not_crash_the_pr(self):
        title, body, draft = openpr.compose({}, "box_x")
        self.assertTrue(draft)
        self.assertIn("box_x", title)
        self.assertIn("UNKNOWN", body)


if __name__ == "__main__":
    unittest.main()
