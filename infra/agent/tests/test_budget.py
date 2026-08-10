import unittest

from harness.budget import Budget, estimate_cost


class Caps(unittest.TestCase):
    def test_dollar_cap_stops_before_the_overshooting_call(self):
        b = Budget(usd=1.0, max_iterations=100, seconds=3600, now=0.0)
        b.record(0.20)
        self.assertEqual(b.blocker(now=0.0), "")  # 0.20 spent + 0.20 reserved
        b.record(0.20)
        self.assertEqual(b.blocker(now=0.0), "")  # 0.40 spent + 0.20 reserved
        b.record(0.50)
        # 0.90 spent, and the largest call seen was 0.50 — another one would
        # overshoot, so the loop stops here rather than a turn late.
        self.assertTrue(b.blocker(now=0.0).startswith("dollar"))
        self.assertLess(b.spent, 1.0)

    def test_first_expensive_call_is_reserved_for(self):
        b = Budget(usd=1.0, max_iterations=100, seconds=3600, now=0.0)
        b.record(0.9)
        self.assertTrue(b.blocker(now=0.0).startswith("dollar"))

    def test_iteration_cap(self):
        b = Budget(usd=100, max_iterations=3, seconds=3600, now=0.0)
        for _ in range(3):
            self.assertEqual(b.blocker(now=0.0), "")
            b.start_iteration()
        self.assertTrue(b.blocker(now=0.0).startswith("iteration"))
        self.assertEqual(b.verdict_for(b.blocker(now=0.0)), "CAPPED")

    def test_wall_clock_cap_and_preflight_reserve(self):
        b = Budget(usd=100, max_iterations=100, seconds=600, now=0.0)
        self.assertEqual(b.blocker(now=100.0), "")
        b.reserve(500)  # preflight took 500s
        self.assertIn("wall-clock", b.blocker(now=100.0))
        self.assertEqual(b.verdict_for(b.blocker(now=100.0)), "BUDGET")

    def test_missing_cost_fails_closed(self):
        real = estimate_cost({"cost": 0.01, "prompt_tokens": 1000, "completion_tokens": 1000},
                             4096, 40000)
        self.assertEqual(real, 0.01)
        by_tokens = estimate_cost({"prompt_tokens": 1_000_000, "completion_tokens": 0}, 4096, 0)
        self.assertAlmostEqual(by_tokens, 15.0)
        blind = estimate_cost({}, 4096, 40000)
        self.assertGreater(blind, 0.0)
        # A blind estimate must never be cheaper than the tokens it stands for.
        self.assertGreaterEqual(blind, 4096 / 1e6 * 15.0)


if __name__ == "__main__":
    unittest.main()
